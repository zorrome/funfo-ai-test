function normalizeName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGender(value) {
  var allowed = ['男性', '女性', 'その他'];
  return allowed.indexOf(value) >= 0 ? value : 'その他';
}

function normalizeAge(value) {
  var age = Number(value);
  if (!Number.isInteger(age) || age < 0 || age > 150) return null;
  return age;
}

function rowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: row.age,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function buildAgeGroups(rows) {
  var groups = [
    { name: '0-9歳', min: 0, max: 9, color: '#60a5fa' },
    { name: '10-19歳', min: 10, max: 19, color: '#34d399' },
    { name: '20-29歳', min: 20, max: 29, color: '#fbbf24' },
    { name: '30-39歳', min: 30, max: 39, color: '#f97316' },
    { name: '40-49歳', min: 40, max: 49, color: '#a78bfa' },
    { name: '50-59歳', min: 50, max: 59, color: '#f472b6' },
    { name: '60歳以上', min: 60, max: 150, color: '#94a3b8' }
  ];

  return groups.map(function(group) {
    var count = rows.filter(function(row) {
      return row.age >= group.min && row.age <= group.max;
    }).length;

    return {
      name: group.name,
      count: count,
      color: group.color
    };
  });
}

function ensureCompatRow(id, name, gender, age) {
  db.prepare(
    "INSERT INTO app (id, name, gender, age, created_at, updated_at) " +
    "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) " +
    "ON CONFLICT(id) DO UPDATE SET " +
    "name = excluded.name, " +
    "gender = excluded.gender, " +
    "age = excluded.age, " +
    "updated_at = CURRENT_TIMESTAMP"
  ).run(id, name, gender, age);
}

app.get('/api/users', function(req, res) {
  try {
    var rows = db.prepare(
      'SELECT id, name, gender, age, created_at, updated_at FROM users ORDER BY datetime(created_at) DESC, id DESC'
    ).all();

    res.json(rows.map(rowToUser));
  } catch (error) {
    res.status(500).json({
      error: 'LIST_USERS_FAILED',
      message: 'ユーザー一覧の取得に失敗しました'
    });
  }
});

app.get('/api/users/stats', function(req, res) {
  try {
    var rows = db.prepare(
      'SELECT id, name, gender, age, created_at, updated_at FROM users'
    ).all();

    var total = rows.length;
    var male = rows.filter(function(row) { return row.gender === '男性'; }).length;
    var female = rows.filter(function(row) { return row.gender === '女性'; }).length;
    var other = rows.filter(function(row) { return row.gender !== '男性' && row.gender !== '女性'; }).length;
    var ages = rows.map(function(row) { return row.age; });
    var avgAge = total > 0
      ? Math.round((ages.reduce(function(sum, current) { return sum + current; }, 0) / total) * 10) / 10
      : 0;
    var minAge = total > 0 ? Math.min.apply(null, ages) : 0;
    var maxAge = total > 0 ? Math.max.apply(null, ages) : 0;

    res.json({
      total: total,
      male: male,
      female: female,
      other: other,
      avgAge: avgAge,
      minAge: minAge,
      maxAge: maxAge,
      ageGroups: buildAgeGroups(rows)
    });
  } catch (error) {
    res.status(500).json({
      error: 'GET_USER_STATS_FAILED',
      message: '統計情報の取得に失敗しました'
    });
  }
});

app.post('/api/users', function(req, res) {
  try {
    var name = normalizeName(req.body && req.body.name);
    var gender = normalizeGender(req.body && req.body.gender);
    var age = normalizeAge(req.body && req.body.age);

    if (!name) {
      return res.status(400).json({
        error: 'INVALID_NAME',
        message: '名前を入力してください'
      });
    }

    if (age === null) {
      return res.status(400).json({
        error: 'INVALID_AGE',
        message: '年齢は0〜150の整数で入力してください'
      });
    }

    var result = db.prepare(
      'INSERT INTO users (name, gender, age) VALUES (?, ?, ?)'
    ).run(name, gender, age);

    ensureCompatRow(result.lastInsertRowid, name, gender, age);

    var created = db.prepare(
      'SELECT id, name, gender, age, created_at, updated_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json(rowToUser(created));
  } catch (error) {
    res.status(500).json({
      error: 'CREATE_USER_FAILED',
      message: 'ユーザー登録に失敗しました'
    });
  }
});

app.put('/api/users/:id', function(req, res) {
  try {
    var id = Number(req.params.id);
    var name = normalizeName(req.body && req.body.name);
    var gender = normalizeGender(req.body && req.body.gender);
    var age = normalizeAge(req.body && req.body.age);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: '不正なユーザーIDです'
      });
    }

    if (!name) {
      return res.status(400).json({
        error: 'INVALID_NAME',
        message: '名前を入力してください'
      });
    }

    if (age === null) {
      return res.status(400).json({
        error: 'INVALID_AGE',
        message: '年齢は0〜150の整数で入力してください'
      });
    }

    var existing = db.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).get(id);

    if (!existing) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'ユーザーが見つかりません'
      });
    }

    db.prepare(
      'UPDATE users SET name = ?, gender = ?, age = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, gender, age, id);

    ensureCompatRow(id, name, gender, age);

    var updated = db.prepare(
      'SELECT id, name, gender, age, created_at, updated_at FROM users WHERE id = ?'
    ).get(id);

    res.json(rowToUser(updated));
  } catch (error) {
    res.status(500).json({
      error: 'UPDATE_USER_FAILED',
      message: 'ユーザー更新に失敗しました'
    });
  }
});

app.delete('/api/users/:id', function(req, res) {
  try {
    var id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: '不正なユーザーIDです'
      });
    }

    var existing = db.prepare(
      'SELECT id, name, gender, age, created_at, updated_at FROM users WHERE id = ?'
    ).get(id);

    if (!existing) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'ユーザーが見つかりません'
      });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    db.prepare('DELETE FROM app WHERE id = ?').run(id);

    res.json({
      success: true,
      deleted: rowToUser(existing)
    });
  } catch (error) {
    res.status(500).json({
      error: 'DELETE_USER_FAILED',
      message: 'ユーザー削除に失敗しました'
    });
  }
});