function getCurrentSessionUser() {
  return db.prepare(
    'SELECT users.id, users.name, users.gender, users.age, users.created_at FROM sessions INNER JOIN users ON users.id = sessions.user_id WHERE sessions.logged_out_at IS NULL ORDER BY sessions.id DESC LIMIT 1'
  ).get() || null;
}

function normalizeGender(value) {
  if (value === '男性' || value === '女性' || value === 'その他') {
    return value;
  }
  return null;
}

app.get('/api/users', function(req, res) {
  try {
    var rows = db.prepare(
      'SELECT id, name, gender, age, created_at FROM users ORDER BY id DESC'
    ).all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
  }
});

app.get('/api/users/stats', function(req, res) {
  try {
    var stats = db.prepare(
      "SELECT COUNT(*) AS total_users, COALESCE(printf('%.1f', AVG(age)), '0.0') AS avg_age, SUM(CASE WHEN gender = '男性' THEN 1 ELSE 0 END) AS male_count, SUM(CASE WHEN gender = '女性' THEN 1 ELSE 0 END) AS female_count, SUM(CASE WHEN gender = 'その他' THEN 1 ELSE 0 END) AS other_count FROM users"
    ).get();

    res.json({
      total_users: Number(stats && stats.total_users ? stats.total_users : 0),
      avg_age: String(stats && stats.avg_age != null ? stats.avg_age : '0.0'),
      male_count: Number(stats && stats.male_count ? stats.male_count : 0),
      female_count: Number(stats && stats.female_count ? stats.female_count : 0),
      other_count: Number(stats && stats.other_count ? stats.other_count : 0)
    });
  } catch (error) {
    res.status(500).json({ error: '統計情報の取得に失敗しました' });
  }
});

app.get('/api/session/current', function(req, res) {
  try {
    var currentUser = getCurrentSessionUser();
    res.json(currentUser);
  } catch (error) {
    res.status(500).json({ error: '現在のセッション取得に失敗しました' });
  }
});

app.delete('/api/users', function(req, res) {
  res.status(400).json({ error: '削除対象のユーザーIDが必要です' });
});

app.post('/api/users', function(req, res) {
  try {
    var name = req.body && typeof req.body.name === 'string' ? req.body.name.trim() : '';
    var gender = normalizeGender(req.body && req.body.gender);
    var age = Number(req.body && req.body.age);

    if (!name) {
      return res.status(400).json({ error: '姓名を入力してください' });
    }

    if (!gender) {
      return res.status(400).json({ error: '性別を正しく選択してください' });
    }

    if (!Number.isFinite(age) || age <= 0 || Math.floor(age) !== age) {
      return res.status(400).json({ error: '正しい年齢を入力してください' });
    }

    var info = db.prepare(
      'INSERT INTO users (name, gender, age) VALUES (?, ?, ?)'
    ).run(name, gender, age);

    var createdUser = db.prepare(
      'SELECT id, name, gender, age, created_at FROM users WHERE id = ?'
    ).get(info.lastInsertRowid);

    res.json(createdUser);
  } catch (error) {
    res.status(500).json({ error: 'ユーザー登録に失敗しました' });
  }
});

app.post('/api/session/login', function(req, res) {
  try {
    var userId = Number(req.body && req.body.user_id);

    if (!Number.isFinite(userId) || userId <= 0 || Math.floor(userId) !== userId) {
      return res.status(400).json({ error: '正しいユーザーを指定してください' });
    }

    var user = db.prepare(
      'SELECT id, name, gender, age, created_at FROM users WHERE id = ?'
    ).get(userId);

    if (!user) {
      return res.status(404).json({ error: '指定されたユーザーが見つかりません' });
    }

    db.prepare(
      "UPDATE sessions SET logged_out_at = datetime('now', 'localtime') WHERE logged_out_at IS NULL"
    ).run();

    db.prepare(
      'INSERT INTO sessions (user_id) VALUES (?)'
    ).run(userId);

    var loggedInUser = getCurrentSessionUser();
    res.json(loggedInUser);
  } catch (error) {
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

app.post('/api/session/logout', function(req, res) {
  try {
    var activeSession = db.prepare(
      'SELECT id FROM sessions WHERE logged_out_at IS NULL ORDER BY id DESC LIMIT 1'
    ).get();

    if (activeSession) {
      db.prepare(
        "UPDATE sessions SET logged_out_at = datetime('now', 'localtime') WHERE id = ?"
      ).run(activeSession.id);
    }

    res.json(null);
  } catch (error) {
    res.status(500).json({ error: 'ログアウトに失敗しました' });
  }
});

app.delete('/api/users/:id', function(req, res) {
  try {
    var userId = Number(req.params.id);

    if (!Number.isFinite(userId) || userId <= 0 || Math.floor(userId) !== userId) {
      return res.status(400).json({ error: '正しいユーザーIDを指定してください' });
    }

    var user = db.prepare(
      'SELECT id, name, gender, age, created_at FROM users WHERE id = ?'
    ).get(userId);

    if (!user) {
      return res.status(404).json({ error: '指定されたユーザーが見つかりません' });
    }

    db.prepare(
      "UPDATE sessions SET logged_out_at = datetime('now', 'localtime') WHERE user_id = ? AND logged_out_at IS NULL"
    ).run(userId);

    db.prepare(
      'DELETE FROM users WHERE id = ?'
    ).run(userId);

    res.json({
      id: user.id,
      name: user.name,
      gender: user.gender,
      age: user.age,
      created_at: user.created_at
    });
  } catch (error) {
    res.status(500).json({ error: 'ユーザー削除に失敗しました' });
  }
});