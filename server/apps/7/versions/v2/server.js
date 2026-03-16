function normalizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: Number(row.age) || 0,
    created_at: row.created_at
  };
}

function buildUserStats() {
  var totals = db.prepare(
    "SELECT " +
      "COUNT(*) AS total, " +
      "SUM(CASE WHEN gender = '男性' THEN 1 ELSE 0 END) AS male, " +
      "SUM(CASE WHEN gender = '女性' THEN 1 ELSE 0 END) AS female, " +
      "SUM(CASE WHEN gender NOT IN ('男性', '女性') THEN 1 ELSE 0 END) AS other, " +
      "AVG(age) AS average_age, " +
      "SUM(CASE WHEN age >= 18 THEN 1 ELSE 0 END) AS adult " +
    "FROM users"
  ).get();

  return {
    total: Number(totals && totals.total) || 0,
    male: Number(totals && totals.male) || 0,
    female: Number(totals && totals.female) || 0,
    other: Number(totals && totals.other) || 0,
    average_age: totals && totals.average_age != null ? Number(Number(totals.average_age).toFixed(1)) : 0,
    adult: Number(totals && totals.adult) || 0
  };
}

app.get('/api/users', function (req, res) {
  try {
    var rows = db.prepare(
      'SELECT id, name, gender, age, created_at FROM users ORDER BY datetime(created_at) DESC, id DESC'
    ).all();

    res.json({
      users: rows.map(normalizeUser)
    });
  } catch (error) {
    res.status(500).json({
      error: 'ユーザー一覧の取得に失敗しました。'
    });
  }
});

app.get('/api/users/stats', function (req, res) {
  try {
    res.json({
      stats: buildUserStats()
    });
  } catch (error) {
    res.status(500).json({
      error: '統計情報の取得に失敗しました。'
    });
  }
});

app.post('/api/users', function (req, res) {
  try {
    var body = req.body || {};
    var name = typeof body.name === 'string' ? body.name.trim() : '';
    var gender = typeof body.gender === 'string' ? body.gender.trim() : '';
    var age = Number(body.age);

    if (!name) {
      return res.status(400).json({
        error: '氏名を入力してください。'
      });
    }

    if (!Number.isInteger(age) || age <= 0) {
      return res.status(400).json({
        error: '年齢は1以上の整数で入力してください。'
      });
    }

    if (!gender) {
      return res.status(400).json({
        error: '性別を入力してください。'
      });
    }

    var result = db.prepare(
      'INSERT INTO users (name, gender, age) VALUES (?, ?, ?)'
    ).run(name, gender, age);

    var created = db.prepare(
      'SELECT id, name, gender, age, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
      user: normalizeUser(created)
    });
  } catch (error) {
    res.status(500).json({
      error: 'ユーザーの登録に失敗しました。'
    });
  }
});

app.delete('/api/users/:id', function (req, res) {
  try {
    var id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: '削除対象のユーザーIDが不正です。'
      });
    }

    var existing = db.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).get(id);

    if (!existing) {
      return res.status(404).json({
        error: '指定されたユーザーが見つかりません。'
      });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({
      success: true,
      deleted_id: id
    });
  } catch (error) {
    res.status(500).json({
      error: 'ユーザーの削除に失敗しました。'
    });
  }
});

app.delete('/api/users', function (req, res) {
  try {
    var result = db.prepare('DELETE FROM users').run();

    res.json({
      success: true,
      deleted_count: Number(result.changes) || 0
    });
  } catch (error) {
    res.status(500).json({
      error: 'ユーザーの全件クリアに失敗しました。'
    });
  }
});