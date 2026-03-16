// --- Users CRUD + Stats ---

// GET /api/users/stats — static path BEFORE parameterized /:id
app.get('/api/users/stats', function(req, res) {
  var total = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
  var male = db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE gender = '男性'").get().cnt;
  var female = db.prepare("SELECT COUNT(*) AS cnt FROM users WHERE gender = '女性'").get().cnt;
  var other = total - male - female;
  var avgRow = db.prepare('SELECT AVG(age) AS avg, MIN(age) AS min, MAX(age) AS max FROM users').get();
  var avgAge = avgRow.avg !== null ? Math.round(avgRow.avg * 10) / 10 : 0;
  var minAge = avgRow.min !== null ? avgRow.min : 0;
  var maxAge = avgRow.max !== null ? avgRow.max : 0;

  var groups = [
    { name: '0-9', min: 0, max: 9, color: '#6ee7b7' },
    { name: '10-19', min: 10, max: 19, color: '#93c5fd' },
    { name: '20-29', min: 20, max: 29, color: '#a5b4fc' },
    { name: '30-39', min: 30, max: 39, color: '#c4b5fd' },
    { name: '40-49', min: 40, max: 49, color: '#f9a8d4' },
    { name: '50-59', min: 50, max: 59, color: '#fda4af' },
    { name: '60-69', min: 60, max: 69, color: '#fdba74' },
    { name: '70-79', min: 70, max: 79, color: '#fcd34d' },
    { name: '80+', min: 80, max: 999, color: '#d4d4d8' }
  ];

  var ageGroups = groups.map(function(g) {
    var count = db.prepare('SELECT COUNT(*) AS cnt FROM users WHERE age >= ? AND age <= ?').get(g.min, g.max).cnt;
    return { name: g.name, count: count, color: g.color };
  });

  res.json({ total: total, male: male, female: female, other: other, avgAge: avgAge, minAge: minAge, maxAge: maxAge, ageGroups: ageGroups });
});

// GET /api/users — list all
app.get('/api/users', function(req, res) {
  var rows = db.prepare('SELECT id, name, gender, age, created_at, updated_at FROM users ORDER BY created_at DESC').all();
  res.json(rows);
});

// POST /api/users — create
app.post('/api/users', function(req, res) {
  var name = (req.body.name || '').trim();
  var gender = req.body.gender || 'その他';
  var age = parseInt(req.body.age, 10);
  if (!name) return res.status(400).json({ error: '名前は必須です' });
  if (isNaN(age) || age < 0 || age > 150) return res.status(400).json({ error: '正しい年齢を入力してください' });
  var result = db.prepare('INSERT INTO users (name, gender, age) VALUES (?, ?, ?)').run(name, gender, age);
  var user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.json(user);
});

// PUT /api/users/:id — update
app.put('/api/users/:id', function(req, res) {
  var id = parseInt(req.params.id, 10);
  var existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  var name = (req.body.name || '').trim();
  var gender = req.body.gender || existing.gender;
  var age = parseInt(req.body.age, 10);
  if (!name) return res.status(400).json({ error: '名前は必須です' });
  if (isNaN(age) || age < 0 || age > 150) return res.status(400).json({ error: '正しい年齢を入力してください' });
  db.prepare('UPDATE users SET name = ?, gender = ?, age = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, gender, age, id);
  var user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json(user);
});

// DELETE /api/users/:id — delete
app.delete('/api/users/:id', function(req, res) {
  var id = parseInt(req.params.id, 10);
  var existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});