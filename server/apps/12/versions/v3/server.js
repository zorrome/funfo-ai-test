// GET /api/users/stats — MUST be registered before /api/users/:id
app.get('/api/users/stats', function(req, res) {
  var total = db.prepare("SELECT COUNT(*) as cnt FROM users").get().cnt;
  if (total === 0) {
    return res.json({ total: 0, maleCount: 0, femaleCount: 0, otherCount: 0, avgAge: 0, maxAge: 0, minAge: 0, ageGroups: [], genderData: [] });
  }
  var agg = db.prepare("SELECT COUNT(*) as total, AVG(age) as avgAge, MAX(age) as maxAge, MIN(age) as minAge FROM users").get();
  var maleCount = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE gender = '男性'").get().cnt;
  var femaleCount = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE gender = '女性'").get().cnt;
  var otherCount = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE gender = 'その他'").get().cnt;

  var genderData = [];
  if (maleCount > 0) genderData.push({ name: "男性", value: maleCount });
  if (femaleCount > 0) genderData.push({ name: "女性", value: femaleCount });
  if (otherCount > 0) genderData.push({ name: "その他", value: otherCount });

  var ageGroupDefs = [
    { name: "0-9", min: 0, max: 9 },
    { name: "10-19", min: 10, max: 19 },
    { name: "20-29", min: 20, max: 29 },
    { name: "30-39", min: 30, max: 39 },
    { name: "40-49", min: 40, max: 49 },
    { name: "50-59", min: 50, max: 59 },
    { name: "60-69", min: 60, max: 69 },
    { name: "70-79", min: 70, max: 79 },
    { name: "80+", min: 80, max: 999 }
  ];

  var ageGroups = ageGroupDefs.map(function(g) {
    var cnt = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE age >= ? AND age <= ?").get(g.min, g.max).cnt;
    return { name: g.name, count: cnt };
  }).filter(function(g) { return g.count > 0; });

  res.json({
    total: agg.total,
    maleCount: maleCount,
    femaleCount: femaleCount,
    otherCount: otherCount,
    avgAge: Math.round(agg.avgAge * 10) / 10,
    maxAge: agg.maxAge,
    minAge: agg.minAge,
    ageGroups: ageGroups,
    genderData: genderData
  });
});

// GET /api/users — list all
app.get('/api/users', function(req, res) {
  var rows = db.prepare("SELECT id, name, gender, age, created_at, updated_at FROM users ORDER BY id DESC").all();
  res.json(rows);
});

// POST /api/users — create
app.post('/api/users', function(req, res) {
  var name = (req.body.name || '').trim();
  var gender = req.body.gender || '男性';
  var age = parseInt(req.body.age, 10);
  if (!name) return res.status(400).json({ error: "名前は必須です" });
  if (isNaN(age) || age < 0 || age > 150) return res.status(400).json({ error: "年齢が無効です" });
  var result = db.prepare("INSERT INTO users (name, gender, age) VALUES (?, ?, ?)").run(name, gender, age);
  res.json({ id: result.lastInsertRowid, name: name, gender: gender, age: age });
});

// PUT /api/users/:id — update
app.put('/api/users/:id', function(req, res) {
  var id = parseInt(req.params.id, 10);
  var existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "ユーザーが見つかりません" });
  var name = (req.body.name || '').trim();
  var gender = req.body.gender || '男性';
  var age = parseInt(req.body.age, 10);
  if (!name) return res.status(400).json({ error: "名前は必須です" });
  if (isNaN(age) || age < 0 || age > 150) return res.status(400).json({ error: "年齢が無効です" });
  db.prepare("UPDATE users SET name = ?, gender = ?, age = ?, updated_at = datetime('now') WHERE id = ?").run(name, gender, age, id);
  res.json({ id: id, name: name, gender: gender, age: age });
});

// DELETE /api/users/:id — delete
app.delete('/api/users/:id', function(req, res) {
  var id = parseInt(req.params.id, 10);
  var existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "ユーザーが見つかりません" });
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ success: true });
});