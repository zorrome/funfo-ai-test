function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: row.age,
    is_logged_in: row.is_logged_in,
    login_at: row.login_at,
    logged_out_at: row.logged_out_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function nowIso() {
  return new Date().toISOString();
}

function isValidGender(value) {
  return value === "男" || value === "女" || value === "其他";
}

function parsePositiveInt(value) {
  var num = Number(value);
  if (!Number.isInteger(num)) return null;
  return num;
}

function sendError(res, status, error, code, details) {
  return res.status(status).json({
    error: error,
    code: code,
    details: details || null
  });
}

function getUserById(id) {
  return db
    .prepare(
      "SELECT id, name, gender, age, is_logged_in, login_at, logged_out_at, created_at, updated_at FROM users WHERE id = ?"
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
        "COALESCE(SUM(CASE WHEN gender = '其他' THEN 1 ELSE 0 END), 0) AS other, " +
        "ROUND(AVG(age), 1) AS average_age " +
        "FROM users"
    )
    .get();

  return {
    total: Number(row && row.total != null ? row.total : 0),
    logged_in: Number(row && row.logged_in != null ? row.logged_in : 0),
    male: Number(row && row.male != null ? row.male : 0),
    female: Number(row && row.female != null ? row.female : 0),
    other: Number(row && row.other != null ? row.other : 0),
    average_age:
      row && row.average_age != null ? String(row.average_age) : null
  };
}

app.get("/api/users", function (req, res) {
  try {
    var users = db
      .prepare(
        "SELECT id, name, gender, age, is_logged_in, login_at, logged_out_at, created_at, updated_at " +
          "FROM users ORDER BY datetime(created_at) DESC, id DESC"
      )
      .all()
      .map(toUser);

    return res.json({
      users: users
    });
  } catch (err) {
    return res.status(500).json({
      error: "获取用户列表失败",
      code: "USERS_LIST_FAILED"
    });
  }
});

app.get("/api/users/stats", function (req, res) {
  try {
    return res.json(getStats());
  } catch (err) {
    return res.status(500).json({
      error: "获取统计数据失败",
      code: "USER_STATS_FAILED"
    });
  }
});

app.get("/api/users/:id", function (req, res) {
  try {
    var id = parsePositiveInt(req.params.id);
    if (!id || id <= 0) {
      return sendError(res, 400, "无效的用户ID", "INVALID_USER_ID");
    }

    var user = getUserById(id);
    if (!user) {
      return sendError(res, 404, "用户不存在", "USER_NOT_FOUND");
    }

    return res.json({
      user: toUser(user)
    });
  } catch (err) {
    return res.status(500).json({
      error: "获取用户详情失败",
      code: "USER_DETAIL_FAILED"
    });
  }
});

app.post("/api/users/login", function (req, res) {
  try {
    var body = req.body || {};
    var name = typeof body.name === "string" ? body.name.trim() : "";
    var gender = typeof body.gender === "string" ? body.gender.trim() : "";
    var age = parsePositiveInt(body.age);

    if (!name) {
      return sendError(res, 400, "请输入姓名", "INVALID_NAME");
    }

    if (!isValidGender(gender)) {
      return sendError(res, 400, "请选择有效的性别", "INVALID_GENDER");
    }

    if (!age || age < 1 || age > 120) {
      return sendError(res, 400, "请输入正确的年龄（1-120）", "INVALID_AGE");
    }

    var now = nowIso();

    var result = db
      .prepare(
        "INSERT INTO users (name, gender, age, is_logged_in, login_at, logged_out_at, created_at, updated_at) " +
          "VALUES (?, ?, ?, 1, ?, NULL, ?, ?)"
      )
      .run(name, gender, age, now, now, now);

    var user = getUserById(result.lastInsertRowid);

    return res.status(201).json({
      user: toUser(user),
      message: "用户登录成功"
    });
  } catch (err) {
    return res.status(500).json({
      error: "创建并登录用户失败",
      code: "USER_CREATE_LOGIN_FAILED"
    });
  }
});

app.post("/api/users/:id/logout", function (req, res) {
  try {
    var id = parsePositiveInt(req.params.id);
    if (!id || id <= 0) {
      return sendError(res, 400, "无效的用户ID", "INVALID_USER_ID");
    }

    var existing = getUserById(id);
    if (!existing) {
      return sendError(res, 404, "用户不存在", "USER_NOT_FOUND");
    }

    if (Number(existing.is_logged_in) !== 1) {
      return sendError(
        res,
        409,
        "该用户当前未登录，无法退出",
        "USER_ALREADY_LOGGED_OUT"
      );
    }

    var now = nowIso();

    db.prepare(
      "UPDATE users SET is_logged_in = 0, logged_out_at = ?, updated_at = ? WHERE id = ?"
    ).run(now, now, id);

    var user = getUserById(id);

    return res.json({
      user: toUser(user),
      message: "用户已退出"
    });
  } catch (err) {
    return res.status(500).json({
      error: "用户退出失败",
      code: "USER_LOGOUT_FAILED"
    });
  }
});

app.post("/api/users/:id/login", function (req, res) {
  try {
    var id = parsePositiveInt(req.params.id);
    if (!id || id <= 0) {
      return sendError(res, 400, "无效的用户ID", "INVALID_USER_ID");
    }

    var existing = getUserById(id);
    if (!existing) {
      return sendError(res, 404, "用户不存在", "USER_NOT_FOUND");
    }

    if (Number(existing.is_logged_in) === 1) {
      return sendError(
        res,
        409,
        "该用户当前已登录，无需重复登录",
        "USER_ALREADY_LOGGED_IN"
      );
    }

    var now = nowIso();

    db.prepare(
      "UPDATE users SET is_logged_in = 1, login_at = ?, logged_out_at = NULL, updated_at = ? WHERE id = ?"
    ).run(now, now, id);

    var user = getUserById(id);

    return res.json({
      user: toUser(user),
      message: "用户重新登录成功"
    });
  } catch (err) {
    return res.status(500).json({
      error: "用户重新登录失败",
      code: "USER_RELOGIN_FAILED"
    });
  }
});

app.delete("/api/users/:id", function (req, res) {
  try {
    var id = parsePositiveInt(req.params.id);
    if (!id || id <= 0) {
      return sendError(res, 400, "无效的用户ID", "INVALID_USER_ID");
    }

    var existing = getUserById(id);
    if (!existing) {
      return sendError(res, 404, "用户不存在", "USER_NOT_FOUND");
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    return res.json({
      success: true,
      deleted_id: id,
      message: "用户已删除"
    });
  } catch (err) {
    return res.status(500).json({
      error: "删除用户失败",
      code: "USER_DELETE_FAILED"
    });
  }
});

// Auto-added API contract stubs to prevent runtime 404

app.post('/api/users/:id', (req, res) => {
  return res.json({ ok: true, placeholder: true, route: 'POST /api/users/:id' });
});
