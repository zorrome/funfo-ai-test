app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

function readSessionToken(req) {
  if (req.headers && req.headers.authorization) {
    var auth = String(req.headers.authorization || "");
    if (auth.indexOf("Bearer ") === 0) {
      return auth.slice(7).trim();
    }
  }

  var cookieHeader = (req.headers && req.headers.cookie) || "";
  if (!cookieHeader) return "";

  var parts = String(cookieHeader).split(";");
  for (var i = 0; i < parts.length; i += 1) {
    var piece = parts[i].trim();
    if (piece.indexOf("session_token=") === 0) {
      return decodeURIComponent(piece.slice("session_token=".length));
    }
  }

  return "";
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    "session_token=" + encodeURIComponent(token) + "; Path=/; HttpOnly; SameSite=Lax"
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeGender(value) {
  var gender = String(value || "").trim().toLowerCase();
  if (gender === "male" || gender === "female" || gender === "other") {
    return gender;
  }
  return "";
}

function buildUserRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    gender: row.gender,
    age: Number(row.age) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at,
    logged_out_at: row.logged_out_at
  };
}

function getActiveSession(req) {
  var token = readSessionToken(req);
  if (!token) return null;

  return db.prepare(
    [
      "SELECT",
      "  s.id,",
      "  s.user_id,",
      "  s.token,",
      "  s.created_at AS session_created_at,",
      "  s.updated_at AS session_updated_at,",
      "  s.logged_out_at AS session_logged_out_at,",
      "  u.id AS user_id_value,",
      "  u.name,",
      "  u.gender,",
      "  u.age,",
      "  u.created_at,",
      "  u.updated_at,",
      "  u.last_login_at,",
      "  u.logged_out_at",
      "FROM sessions s",
      "JOIN users u ON u.id = s.user_id",
      "WHERE s.token = ?",
      "  AND s.logged_out_at IS NULL",
      "LIMIT 1"
    ].join(" ")
  ).get(token);
}

function generateSessionToken() {
  return [
    "sess",
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2)
  ].join("_");
}

function requireActiveSession(req, res) {
  var session = getActiveSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "未ログインです" });
    return null;
  }
  return session;
}

var loginUserTx = db.transaction(function(name, gender, normalizedAge, previousToken, now) {
  if (previousToken) {
    db.prepare(
      "UPDATE sessions SET logged_out_at = ?, updated_at = ? WHERE token = ? AND logged_out_at IS NULL"
    ).run(now, now, previousToken);
  }

  var existingUser = db.prepare(
    [
      "SELECT id, name, gender, age, created_at, updated_at, last_login_at, logged_out_at",
      "FROM users",
      "WHERE lower(name) = lower(?)",
      "ORDER BY id ASC",
      "LIMIT 1"
    ].join(" ")
  ).get(name);

  var userId;
  if (existingUser) {
    userId = existingUser.id;
    db.prepare(
      [
        "UPDATE users",
        "SET name = ?, gender = ?, age = ?, last_login_at = ?, logged_out_at = NULL, updated_at = ?",
        "WHERE id = ?"
      ].join(" ")
    ).run(name, gender, normalizedAge, now, now, userId);
  } else {
    var insertUser = db.prepare(
      [
        "INSERT INTO users (name, gender, age, created_at, updated_at, last_login_at, logged_out_at)",
        "VALUES (?, ?, ?, ?, ?, ?, NULL)"
      ].join(" ")
    ).run(name, gender, normalizedAge, now, now, now);
    userId = insertUser.lastInsertRowid;
  }

  var token = generateSessionToken();
  var insertSession = db.prepare(
    [
      "INSERT INTO sessions (user_id, token, created_at, updated_at, logged_out_at)",
      "VALUES (?, ?, ?, ?, NULL)"
    ].join(" ")
  ).run(userId, token, now, now);

  var user = db.prepare(
    [
      "SELECT id, name, gender, age, created_at, updated_at, last_login_at, logged_out_at",
      "FROM users",
      "WHERE id = ?"
    ].join(" ")
  ).get(userId);

  return {
    token: token,
    user: user,
    sessionId: insertSession.lastInsertRowid
  };
});

var logoutSessionTx = db.transaction(function(sessionId, userId, now) {
  db.prepare(
    "UPDATE sessions SET logged_out_at = ?, updated_at = ? WHERE id = ? AND logged_out_at IS NULL"
  ).run(now, now, sessionId);

  db.prepare(
    "UPDATE users SET logged_out_at = ?, updated_at = ? WHERE id = ?"
  ).run(now, now, userId);
});

var deleteUserTx = db.transaction(function(userId, now) {
  db.prepare(
    "UPDATE sessions SET logged_out_at = ?, updated_at = ? WHERE user_id = ? AND logged_out_at IS NULL"
  ).run(now, now, userId);

  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
});

app.get('/api/users', function(req, res) {
  try {
    var rows = db.prepare(
      [
        "SELECT id, name, gender, age, created_at, updated_at, last_login_at, logged_out_at",
        "FROM users",
        "ORDER BY datetime(created_at) DESC, id DESC"
      ].join(" ")
    ).all();

    res.json({
      users: rows.map(buildUserRow)
    });
  } catch (err) {
    res.status(500).json({ error: "ユーザー一覧の取得に失敗しました" });
  }
});

app.get('/api/users/stats', function(req, res) {
  try {
    var stats = db.prepare(
      [
        "SELECT",
        "  COUNT(*) AS total,",
        "  COALESCE(SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END), 0) AS male_count,",
        "  COALESCE(SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END), 0) AS female_count,",
        "  COALESCE(SUM(CASE WHEN gender = 'other' THEN 1 ELSE 0 END), 0) AS other_count,",
        "  ROUND(COALESCE(AVG(age), 0), 1) AS avg_age,",
        "  COALESCE(SUM(CASE WHEN age >= 18 THEN 1 ELSE 0 END), 0) AS adults,",
        "  COALESCE(SUM(CASE WHEN age < 18 THEN 1 ELSE 0 END), 0) AS minors",
        "FROM users"
      ].join(" ")
    ).get();

    res.json({
      stats: {
        total: Number(stats && stats.total) || 0,
        male_count: Number(stats && stats.male_count) || 0,
        female_count: Number(stats && stats.female_count) || 0,
        other_count: Number(stats && stats.other_count) || 0,
        avg_age: Number(stats && stats.avg_age) || 0,
        adults: Number(stats && stats.adults) || 0,
        minors: Number(stats && stats.minors) || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: "統計の取得に失敗しました" });
  }
});

app.get('/api/session/current', function(req, res) {
  try {
    var session = getActiveSession(req);
    if (!session) {
      clearSessionCookie(res);
      res.status(401).json({ error: "未ログインです" });
      return;
    }

    res.json({
      user: buildUserRow({
        id: session.user_id_value,
        name: session.name,
        gender: session.gender,
        age: session.age,
        created_at: session.created_at,
        updated_at: session.updated_at,
        last_login_at: session.last_login_at,
        logged_out_at: session.logged_out_at
      }),
      session: {
        id: Number(session.id),
        user_id: Number(session.user_id),
        created_at: session.session_created_at,
        logged_out_at: session.session_logged_out_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: "セッション情報の取得に失敗しました" });
  }
});

app.post('/api/session/login', function(req, res) {
  try {
    var body = req.body || {};
    var name = String(body.name || "").trim();
    var gender = normalizeGender(body.gender);
    var age = Number(body.age);
    var now = nowIso();

    if (!name) {
      res.status(400).json({ error: "名前を入力してください" });
      return;
    }

    if (!gender) {
      res.status(400).json({ error: "性別を正しく選択してください" });
      return;
    }

    if (!Number.isFinite(age) || age <= 0) {
      res.status(400).json({ error: "正しい年齢を入力してください" });
      return;
    }

    var normalizedAge = Math.floor(age);
    var result = loginUserTx(name, gender, normalizedAge, readSessionToken(req), now);

    setSessionCookie(res, result.token);

    res.json({
      user: buildUserRow(result.user),
      session: {
        id: Number(result.sessionId),
        user_id: Number(result.user.id),
        token: result.token,
        created_at: now,
        logged_out_at: null
      }
    });
  } catch (err) {
    res.status(500).json({ error: "ログインに失敗しました" });
  }
});

app.post('/api/session/logout', function(req, res) {
  try {
    var session = requireActiveSession(req, res);
    if (!session) return;

    var now = nowIso();
    logoutSessionTx(session.id, session.user_id, now);
    clearSessionCookie(res);

    res.json({
      success: true,
      logged_out_at: now
    });
  } catch (err) {
    res.status(500).json({ error: "ログアウトに失敗しました" });
  }
});

app.delete('/api/users/:id', function(req, res) {
  try {
    var userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ error: "不正なユーザーIDです" });
      return;
    }

    var user = db.prepare(
      "SELECT id, name, gender, age, created_at, updated_at, last_login_at, logged_out_at FROM users WHERE id = ?"
    ).get(userId);

    if (!user) {
      res.status(404).json({ error: "ユーザーが見つかりません" });
      return;
    }

    var now = nowIso();
    var activeSession = getActiveSession(req);

    deleteUserTx(userId, now);

    if (activeSession && Number(activeSession.user_id) === userId) {
      clearSessionCookie(res);
    }

    res.json({
      success: true,
      deleted_user_id: userId
    });
  } catch (err) {
    res.status(500).json({ error: "ユーザー削除に失敗しました" });
  }
});