function getActiveSessionRow() {
  return db.prepare("SELECT id, user_id, token, created_at, logged_out_at FROM sessions WHERE logged_out_at IS NULL ORDER BY id DESC LIMIT 1").get();
}

function getUserById(id) {
  return db.prepare("SELECT id, name, gender, age, created_at FROM users WHERE id = ?").get(id);
}

app.get('/api/users', function(req, res) {
  try {
    var rows = db.prepare("SELECT id, name, gender, age, created_at FROM users ORDER BY id ASC").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: '用户列表加载失败' });
  }
});

app.get('/api/users/stats', function(req, res) {
  try {
    var stats = db.prepare("SELECT COUNT(*) AS total_users, SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) AS male_count, SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) AS female_count, printf('%.1f', COALESCE(AVG(age), 0)) AS average_age FROM users").get();

    res.json({
      total_users: Number(stats && stats.total_users ? stats.total_users : 0),
      male_count: Number(stats && stats.male_count ? stats.male_count : 0),
      female_count: Number(stats && stats.female_count ? stats.female_count : 0),
      average_age: String(stats && stats.average_age !== undefined && stats.average_age !== null ? stats.average_age : '0.0')
    });
  } catch (err) {
    res.status(500).json({ error: '统计数据加载失败' });
  }
});

app.post('/api/users', function(req, res) {
  try {
    var body = req.body || {};
    var name = typeof body.name === 'string' ? body.name.trim() : '';
    var gender = body.gender;
    var age = Number(body.age);

    if (!name) {
      return res.status(400).json({ error: '请输入姓名' });
    }
    if (gender !== 'male' && gender !== 'female') {
      return res.status(400).json({ error: '性别值无效' });
    }
    if (!body.age || isNaN(age) || age <= 0) {
      return res.status(400).json({ error: '请输入有效年龄' });
    }

    var info = db.prepare("INSERT INTO users (name, gender, age) VALUES (?, ?, ?)").run(name, gender, age);

    var created = getUserById(info.lastInsertRowid);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: '用户创建失败' });
  }
});

app.delete('/api/users/:id', function(req, res) {
  try {
    var id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: '用户ID无效' });
    }

    var existing = getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: '用户不存在' });
    }

    var activeSession = getActiveSessionRow();
    var deletedCurrentSession = !!(activeSession && activeSession.user_id === id);

    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    if (deletedCurrentSession) {
      db.prepare("UPDATE sessions SET logged_out_at = CURRENT_TIMESTAMP WHERE logged_out_at IS NULL AND user_id = ?").run(id);
    }

    res.json({
      success: true,
      id: id,
      deleted_current_session: deletedCurrentSession
    });
  } catch (err) {
    res.status(500).json({ error: '用户删除失败' });
  }
});

app.get('/api/session/current', function(req, res) {
  try {
    var row = db.prepare("SELECT u.id, u.name, u.gender, u.age, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.logged_out_at IS NULL ORDER BY s.id DESC LIMIT 1").get();

    res.json(row || null);
  } catch (err) {
    res.status(500).json({ error: '当前会话加载失败' });
  }
});

app.post('/api/session/login', function(req, res) {
  try {
    var body = req.body || {};
    var userId = Number(body.user_id);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'user_id 无效' });
    }

    var user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    db.prepare("UPDATE sessions SET logged_out_at = CURRENT_TIMESTAMP WHERE logged_out_at IS NULL").run();

    var token = 'session_' + userId + '_' + Date.now();

    db.prepare("INSERT INTO sessions (user_id, token) VALUES (?, ?)").run(userId, token);

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
});

app.post('/api/session/logout', function(req, res) {
  try {
    db.prepare("UPDATE sessions SET logged_out_at = CURRENT_TIMESTAMP WHERE logged_out_at IS NULL").run();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '退出失败' });
  }
});