function jsonError(res, status, message, code) {
  return res.status(status).json({
    error: message,
    code: code
  });
}

function parseCookies(req) {
  var header = req && req.headers ? req.headers.cookie : "";
  var out = {};
  if (!header) return out;

  header.split(";").forEach(function(part) {
    var idx = part.indexOf("=");
    if (idx === -1) return;
    var key = decodeURIComponent(part.slice(0, idx).trim());
    var value = decodeURIComponent(part.slice(idx + 1).trim());
    out[key] = value;
  });

  return out;
}

function makeToken() {
  return "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2) + "_" + Math.random().toString(36).slice(2);
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", "session_token=" + encodeURIComponent(token) + "; Path=/; HttpOnly; SameSite=Lax");
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function normalizeGender(value) {
  var v = String(value || "").trim().toLowerCase();
  if (v === "male" || v === "female" || v === "other") return v;
  return "";
}

function serializeUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    gender: row.gender,
    age: Number(row.age),
    created_at: row.created_at
  };
}

function getActiveSession(req) {
  var cookies = parseCookies(req);
  var token = cookies.session_token;
  if (!token) return null;

  return db.prepare(`
    SELECT
      s.id,
      s.token,
      s.user_id,
      s.created_at,
      s.logged_out_at,
      u.id AS resolved_user_id,
      u.name,
      u.gender,
      u.age,
      u.created_at AS user_created_at
    FROM sessions s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.logged_out_at IS NULL
  `).get(token);
}

function getCurrentUserOrNull(req) {
  var session = getActiveSession(req);
  if (!session || !session.resolved_user_id) return null;

  return {
    id: Number(session.resolved_user_id),
    name: session.name,
    gender: session.gender,
    age: Number(session.age),
    created_at: session.user_created_at
  };
}

app.post('/api/session/login', function(req, res) {
  var body = req.body || {};
  var name = String(body.name || "").trim();
  var gender = normalizeGender(body.gender);
  var age = Number(body.age);

  if (!name) {
    return jsonError(res, 400, "名前を入力してください", "INVALID_NAME");
  }

  if (!gender) {
    return jsonError(res, 400, "性別を正しく入力してください", "INVALID_GENDER");
  }

  if (!Number.isFinite(age) || age <= 0 || Math.floor(age) !== age) {
    return jsonError(res, 400, "正しい年齢を入力してください", "INVALID_AGE");
  }

  var now = new Date().toISOString();

  var existingUser = db.prepare(`
    SELECT id, name, gender, age, created_at
    FROM users
    WHERE name = ? AND gender = ? AND age = ?
  `).get(name, gender, age);

  var user;
  if (existingUser) {
    db.prepare(`
      UPDATE users
      SET updated_at = ?
      WHERE id = ?
    `).run(now, existingUser.id);

    user = db.prepare(`
      SELECT id, name, gender, age, created_at
      FROM users
      WHERE id = ?
    `).get(existingUser.id);
  } else {
    var insert = db.prepare(`
      INSERT INTO users (name, gender, age, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, gender, age, now, now);

    user = db.prepare(`
      SELECT id, name, gender, age, created_at
      FROM users
      WHERE id = ?
    `).get(insert.lastInsertRowid);
  }

  var prior = getActiveSession(req);
  if (prior) {
    db.prepare(`
      UPDATE sessions
      SET logged_out_at = COALESCE(logged_out_at, ?)
      WHERE id = ?
    `).run(now, prior.id);
  }

  var token = makeToken();
  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, logged_out_at)
    VALUES (?, ?, ?, NULL)
  `).run(token, user.id, now);

  setSessionCookie(res, token);

  return res.json({
    user: serializeUser(user),
    session: {
      token: token,
      user_id: Number(user.id),
      created_at: now,
      logged_out_at: null
    }
  });
});

app.get('/api/session/current', function(req, res) {
  var user = getCurrentUserOrNull(req);

  if (!user) {
    clearSessionCookie(res);
    return jsonError(res, 401, "未ログインです", "NOT_LOGGED_IN");
  }

  return res.json({
    user: user
  });
});

app.post('/api/session/logout', function(req, res) {
  var cookies = parseCookies(req);
  var token = cookies.session_token;

  if (!token) {
    clearSessionCookie(res);
    return jsonError(res, 401, "ログインが必要です", "LOGIN_REQUIRED");
  }

  var active = db.prepare(`
    SELECT id, token, user_id, created_at, logged_out_at
    FROM sessions
    WHERE token = ? AND logged_out_at IS NULL
  `).get(token);

  if (!active) {
    clearSessionCookie(res);
    return jsonError(res, 401, "セッションが見つかりません", "SESSION_NOT_FOUND");
  }

  var now = new Date().toISOString();
  db.prepare(`
    UPDATE sessions
    SET logged_out_at = ?
    WHERE id = ?
  `).run(now, active.id);

  clearSessionCookie(res);

  return res.json({
    success: true,
    logged_out_at: now
  });
});

app.get('/api/users', function(req, res) {
  var users = db.prepare(`
    SELECT id, name, gender, age, created_at
    FROM users
    ORDER BY datetime(created_at) DESC, id DESC
  `).all();

  return res.json({
    users: users.map(serializeUser)
  });
});

app.get('/api/users/stats', function(req, res) {
  var stats = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END), 0) AS male_count,
      COALESCE(SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END), 0) AS female_count,
      COALESCE(SUM(CASE WHEN gender = 'other' THEN 1 ELSE 0 END), 0) AS other_count,
      ROUND(COALESCE(AVG(age), 0), 1) AS avg_age,
      COALESCE(SUM(CASE WHEN age >= 18 THEN 1 ELSE 0 END), 0) AS adults,
      COALESCE(SUM(CASE WHEN age < 18 THEN 1 ELSE 0 END), 0) AS minors
    FROM users
  `).get();

  return res.json({
    stats: {
      total: Number(stats.total) || 0,
      male_count: Number(stats.male_count) || 0,
      female_count: Number(stats.female_count) || 0,
      other_count: Number(stats.other_count) || 0,
      avg_age: Number(stats.avg_age) || 0,
      adults: Number(stats.adults) || 0,
      minors: Number(stats.minors) || 0
    }
  });
});

app.delete('/api/users/:id', function(req, res) {
  var id = Number(req.params.id);

  if (!Number.isFinite(id) || id <= 0 || Math.floor(id) !== id) {
    return jsonError(res, 400, "正しいユーザーIDを指定してください", "INVALID_USER_ID");
  }

  var user = db.prepare(`
    SELECT id, name, gender, age, created_at
    FROM users
    WHERE id = ?
  `).get(id);

  if (!user) {
    return jsonError(res, 404, "ユーザーが見つかりません", "USER_NOT_FOUND");
  }

  var currentSession = getActiveSession(req);
  var invalidatedCurrentSession = !!(currentSession && Number(currentSession.user_id) === id);
  var now = new Date().toISOString();

  db.prepare(`
    UPDATE sessions
    SET logged_out_at = ?
    WHERE user_id = ? AND logged_out_at IS NULL
  `).run(now, id);

  var deleted = db.prepare(`
    DELETE FROM users
    WHERE id = ?
  `).run(id);

  if (!deleted.changes) {
    return jsonError(res, 404, "ユーザーが見つかりません", "USER_NOT_FOUND");
  }

  if (invalidatedCurrentSession) {
    clearSessionCookie(res);
  }

  return res.json({
    success: true,
    deleted_user_id: id,
    invalidated_session: invalidatedCurrentSession
  });
});