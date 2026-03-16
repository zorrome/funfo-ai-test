app.get('/api/users', function (req, res) {
  try {
    var users = db.prepare("SELECT id, name, gender, age, created_at FROM users ORDER BY datetime(created_at) DESC, id DESC").all();

    res.json({
      users: users
    });
  } catch (error) {
    res.status(500).json({
      error: "ユーザー一覧の取得に失敗しました"
    });
  }
});

app.get('/api/users/stats', function (req, res) {
  try {
    var stats = db.prepare("SELECT COUNT(*) AS totalCount, COALESCE(printf('%.1f', AVG(age)), '0.0') AS averageAge, COALESCE(SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END), 0) AS maleCount, COALESCE(SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END), 0) AS femaleCount, COALESCE(SUM(CASE WHEN gender = 'other' THEN 1 ELSE 0 END), 0) AS otherCount, COALESCE(SUM(CASE WHEN age >= 18 THEN 1 ELSE 0 END), 0) AS adultCount FROM users").get();

    res.json({
      totalCount: Number(stats && stats.totalCount ? stats.totalCount : 0),
      averageAge: String(stats && stats.averageAge ? stats.averageAge : "0.0"),
      maleCount: Number(stats && stats.maleCount ? stats.maleCount : 0),
      femaleCount: Number(stats && stats.femaleCount ? stats.femaleCount : 0),
      otherCount: Number(stats && stats.otherCount ? stats.otherCount : 0),
      adultCount: Number(stats && stats.adultCount ? stats.adultCount : 0)
    });
  } catch (error) {
    res.status(500).json({
      error: "統計情報の取得に失敗しました"
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
        error: "名前を入力してください"
      });
    }

    if (['male', 'female', 'other'].indexOf(gender) === -1) {
      return res.status(400).json({
        error: "性別の値が不正です"
      });
    }

    if (!Number.isInteger(age) || age <= 0 || age > 150) {
      return res.status(400).json({
        error: "正しい年齢を入力してください"
      });
    }

    var result = db.prepare("INSERT INTO users (name, gender, age) VALUES (?, ?, ?)").run(name, gender, age);
    var user = db.prepare("SELECT id, name, gender, age, created_at FROM users WHERE id = ?").get(result.lastInsertRowid);

    res.status(201).json({
      user: user
    });
  } catch (error) {
    res.status(500).json({
      error: "ユーザー登録に失敗しました"
    });
  }
});

app.delete('/api/users/:id', function (req, res) {
  try {
    var id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ユーザーIDが不正です"
      });
    }

    var existingUser = db.prepare("SELECT id FROM users WHERE id = ?").get(id);

    if (!existingUser) {
      return res.status(404).json({
        error: "ユーザーが見つかりません"
      });
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    res.json({
      success: true
    });
  } catch (error) {
    res.status(500).json({
      error: "ユーザーの削除に失敗しました"
    });
  }
});