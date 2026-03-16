// --- GET /api/users ---
app.get('/api/users', function(req, res) {
  var rows = db.prepare('SELECT id, name, gender, age, created_at FROM users ORDER BY id DESC').all();
  res.json(rows);
});

// --- GET /api/users/stats (BEFORE /:id) ---
app.get('/api/users/stats', function(req, res) {
  var total = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
  if (total === 0) {
    return res.json({
      total: 0,
      maleCount: 0,
      femaleCount: 0,
      otherCount: 0,
      avgAge: 0,
      maxAge: 0,
      minAge: 0,
      ageGroups: [],
      genderData: []
    });
  }

  var agg = db.prepare(
    "SELECT COUNT(*) AS total, " +
    "ROUND(AVG(age),1) AS avgAge, " +
    "MAX(age) AS maxAge, " +
    "MIN(age) AS minAge, " +
    "SUM(CASE WHEN gender='男性' THEN 1 ELSE 0 END) AS maleCount, " +
    "SUM(CASE WHEN gender='女性' THEN 1 ELSE 0 END) AS femaleCount, " +
    "SUM(CASE WHEN gender NOT IN ('男性','女性') THEN 1 ELSE 0 END) AS otherCount " +
    "FROM users"
  ).get();

  var genderData = [];
  if (agg.maleCount > 0) genderData.push({ name: '男性', value: agg.maleCount });
  if (agg.femaleCount > 0) genderData.push({ name: '女性', value: agg.femaleCount });
  if (agg.otherCount > 0) genderData.push({ name: 'その他', value: agg.otherCount });

  var ageGroupDefs = [
    { name: '0-9', min: 0, max: 9 },
    { name: '10-19', min: 10, max: 19 },
    { name: '20-29', min: 20, max: 29 },
    { name: '30-39', min: 30, max: 39 },
    { name: '40-49', min: 40, max: 49 },
    { name: '50-59', min: 50, max: 59 },
    { name: '60-69', min: 60, max: 69 },
    { name: '70-79', min: 70, max: 79 },
    { name: '80+', min: 80, max: 999 }
  ];

  var ageGroups = ageGroupDefs.map(function(g) {
    var count = db.prepare(
      'SELECT COUNT(*) AS cnt FROM users WHERE age >= ? AND age <= ?'
    ).get(g.min, g.max).cnt;
    return { name: g.name, count: count };
  }).filter(function(g) { return g.count > 0; });

  res.json({
    total: agg.total,
    maleCount: agg.maleCount,
    femaleCount: agg.femaleCount,
    otherCount: agg.otherCount,
    avgAge: agg.avgAge,
    maxAge: agg.maxAge,
    minAge: agg.minAge,
    ageGroups: ageGroups,
    genderData: genderData
  });
});

// --- GET /api/users/:id ---
app.get('/api/users/:id', function(req, res) {
  var row = db.prepare('SELECT id, name, gender, age, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  res.json(row);
});

// --- POST /api/users ---
app.post('/api/users', function(req, res) {
  var name = (req.body.name || '').trim();
  var gender = req.body.gender || '男性';
  var age = parseInt(req.body.age, 10);
  if (!name) return res.status(400).json({ error: '氏名は必須です' });
  if (isNaN(age) || age < 0 || age > 150) return res.status(400).json({ error: '年齢が不正です' });

  var result = db.prepare('INSERT INTO users (name, gender, age) VALUES (?, ?, ?)').run(name, gender, age);
  res.json({ id: result.lastInsertRowid, name: name, gender: gender, age: age });
});

// --- PUT /api/users/:id ---
app.put('/api/users/:id', function(req, res) {
  var id = req.params.id;
  var existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'ユーザーが見つかりません' });

  var name = (req.body.name || '').trim();
  var gender = req.body.gender || '男性';
  var age = parseInt(req.body.age, 10);
  if (!name) return res.status(400).json({ error: '氏名は必須です' });
  if (isNaN(age) || age < 0 || age > 150) return res.status(400).json({ error: '年齢が不正です' });

  db.prepare('UPDATE users SET name = ?, gender = ?, age = ? WHERE id = ?').run(name, gender, age, id);
  res.json({ id: Number(id), name: name, gender: gender, age: age });
});

// --- DELETE /api/users/:id ---
app.delete('/api/users/:id', function(req, res) {
  var id = req.params.id;
  var existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'ユーザーが見つかりません' });

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});