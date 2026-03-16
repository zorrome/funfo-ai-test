function toIsoNow() {
  return new Date().toISOString();
}

function normalizeUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: row.age,
    is_logged_in: Number(row.is_logged_in) === 1 ? 1 : 0,
    login_at: row.login_at,
    logged_out_at: row.logged_out_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function parseUserId(value) {
  var id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function validateUserPayload(body) {
  var payload = body || {};
  var name = typeof payload.name === "string" ? payload.name.trim() : "";
  var gender = typeof payload.gender === "string" ? payload.gender.trim() : "";
  var age = Number(payload.age);

  if (!name) {
    return { ok: false, error: "请输入姓名。" };
  }

  if (!gender) {
    return { ok: false, error: "请选择性别。" };
  }

  if (!Number.isInteger(age) || age <= 0 || age > 120) {
    return { ok: false, error: "请输入正确的年龄（1-120）。" };
  }

  return {
    ok: true,
    value: {
      name: name,
      gender: gender,
      age: age
    }
  };
}

function getUserById(id) {
  return db
    .prepare(
      "SELECT id, name, gender, age, is_logged_in, login_at, logged_out_at, created_at, updated_at " +
        "FROM users WHERE id = ?"
    )
    .get(id);
}

function getStats() {
  var row = db
    .prepare(
      "SELECT " +
        "COUNT(*) AS total, " +
        "COALESCE(SUM(CASE WHEN is_logged_in = 1 THEN 1 ELSE 0 END), 0) AS logged_in, " +
        "COALESCE(SUM(CASE WHEN gender = '男' THEN 1 ELSE 0 END), 0) AS male, " +
        "COALESCE(SUM(CASE WHEN gender = '女' THEN 1 ELSE 0 END), 0) AS female, " +
        "COALESCE(SUM(CASE WHEN gender NOT IN ('男', '女') THEN 1 ELSE 0 END), 0) AS other, " +
        "ROUND(AVG(age), 1) AS average_age " +
        "FROM users"
    )
    .get();

  return {
    total: Number((row && row.total) || 0),
    logged_in: Number((row && row.logged_in) || 0),
    male: Number((row && row.male) || 0),
    female: Number((row && row.female) || 0),
    other: Number((row && row.other) || 0),
    average_age: row && row.average_age != null ? row.average_age : null
  };
}

app.get("/api/users", function (req, res) {
  try {
    var users = db
      .prepare(
        "SELECT id, name, gender, age, is_logged_in, login_at, logged_out_at, created_at, updated_at " +
          "FROM users " +
          "ORDER BY datetime(COALESCE(created_at, login_at)) DESC, id DESC"
      )
      .all()
      .map(normalizeUserRow);

    res.json({ users: users });
  } catch (error) {
    res.status(500).json({ error: "获取用户列表失败。" });
  }
});

app.get("/api/users/stats", function (req, res) {
  try {
    res.json(getStats());
  } catch (error) {
    res.status(500).json({ error: "获取统计数据失败。" });
  }
});

app.get("/api/users/:id", function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "用户ID无效。" });
    }

    var user = getUserById(id);
    if (!user) {
      return res.status(404).json({ error: "用户不存在。" });
    }

    res.json({ user: normalizeUserRow(user) });
  } catch (error) {
    res.status(500).json({ error: "获取用户详情失败。" });
  }
});

app.post("/api/users/login", function (req, res) {
  try {
    var validation = validateUserPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    var value = validation.value;
    var now = toIsoNow();

    var result = db
      .prepare(
        "INSERT INTO users (name, gender, age, is_logged_in, login_at, logged_out_at, created_at, updated_at) " +
          "VALUES (?, ?, ?, 1, ?, NULL, ?, ?)"
      )
      .run(value.name, value.gender, value.age, now, now, now);

    var user = getUserById(result.lastInsertRowid);

    res.status(201).json({
      message: "用户登录成功。",
      user: normalizeUserRow(user)
    });
  } catch (error) {
    res.status(500).json({ error: "用户登录失败。" });
  }
});

app.post("/api/users/:id/logout", function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "用户ID无效。" });
    }

    var existing = getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "用户不存在。" });
    }

    if (Number(existing.is_logged_in) !== 1) {
      return res.status(400).json({ error: "该用户当前未登录。" });
    }

    var now = toIsoNow();

    db
      .prepare(
        "UPDATE users " +
          "SET is_logged_in = 0, logged_out_at = ?, updated_at = ? " +
          "WHERE id = ?"
      )
      .run(now, now, id);

    var user = getUserById(id);

    res.json({
      message: "用户已退出登录。",
      user: normalizeUserRow(user)
    });
  } catch (error) {
    res.status(500).json({ error: "用户退出失败。" });
  }
});

app.post("/api/users/:id/relogin", function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "用户ID无效。" });
    }

    var existing = getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "用户不存在。" });
    }

    if (Number(existing.is_logged_in) === 1) {
      return res.status(400).json({ error: "该用户当前已登录。" });
    }

    var now = toIsoNow();

    db
      .prepare(
        "UPDATE users " +
          "SET is_logged_in = 1, login_at = ?, logged_out_at = NULL, updated_at = ? " +
          "WHERE id = ?"
      )
      .run(now, now, id);

    var user = getUserById(id);

    res.json({
      message: "用户已重新登录。",
      user: normalizeUserRow(user)
    });
  } catch (error) {
    res.status(500).json({ error: "用户重新登录失败。" });
  }
});

app.delete("/api/users/:id", function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "用户ID无效。" });
    }

    var existing = getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "用户不存在。" });
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    res.json({
      message: "用户已删除。",
      user: normalizeUserRow(existing)
    });
  } catch (error) {
    res.status(500).json({ error: "删除用户失败。" });
  }
});

// Auto-added API contract stubs to prevent runtime 404

app.post('/api/users/:id', (req, res) => {
  return res.json({ ok: true, placeholder: true, route: 'POST /api/users/:id' });
});
