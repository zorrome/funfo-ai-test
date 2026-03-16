'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express  = require('express');
const cors     = require('cors');
const Database = require('better-sqlite3');

const app = express();
const APP_ID = 12;
const PORT = Number(process.env.PORT || 3001);
const APP_DB_MODE = process.env.APP_DB_MODE || 'dev';
const DB_FILE = process.env.DB_FILE || (APP_DB_MODE === 'prod' ? 'data_prod.sqlite' : 'data_dev.sqlite');
const db = new Database(DB_FILE);
const FRONTEND_HTML = path.join(__dirname, 'index.html');
const ASSETS_DIR = path.join(__dirname, 'runtime-assets');

db.pragma('journal_mode = WAL');

db.exec(`  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL DEFAULT 'schema.sql',
    applied_at TEXT DEFAULT (datetime('now'))
  );
`);

function applySchemaIfChanged() {
  try {
    if (!fs.existsSync('schema.sql')) return;
    const schema = fs.readFileSync('schema.sql', 'utf8');
    if (!schema || !schema.trim()) return;

    const hash = crypto.createHash('sha256').update(schema).digest('hex');
    const exists = db.prepare('SELECT id FROM schema_migrations WHERE hash = ?').get(hash);
    if (exists) return;

    db.exec('BEGIN');
    db.exec(schema);
    db.prepare('INSERT INTO schema_migrations (hash, source) VALUES (?, ?)').run(hash, 'schema.sql');
    db.prepare(`INSERT INTO schema_meta (key, value, updated_at)
      VALUES ('schema_hash', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run(hash);
    db.prepare(`INSERT INTO schema_meta (key, value, updated_at)
      VALUES ('schema_version', CAST((SELECT COUNT(*) FROM schema_migrations) AS TEXT), datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = CAST((SELECT COUNT(*) FROM schema_migrations) AS TEXT), updated_at = datetime('now')`).run();
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    console.warn('[app] schema apply warning:', e.message);
  }
}

applySchemaIfChanged();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true, appId: APP_ID, port: PORT, dbFile: DB_FILE, dbMode: APP_DB_MODE, frontend: fs.existsSync(FRONTEND_HTML) }));

// GET /api/users/stats — MUST be registered before /api/users/:id

// GET /api/users — list all

// POST /api/users — create

// PUT /api/users/:id — update

// DELETE /api/users/:id — delete

app.get('/api/users', function(req, res) {
  var rows = db.prepare("SELECT id, name, gender, age, created_at, updated_at FROM users ORDER BY id DESC").all();
  res.json(rows);
});

app.post('/api/users', function(req, res) {
  var name = (req.body.name || '').trim();
  var gender = req.body.gender || '男性';
  var age = parseInt(req.body.age, 10);
  if (!name) return res.status(400).json({ error: "名前は必須です" });
  if (isNaN(age) || age < 0 || age > 150) return res.status(400).json({ error: "年齢が無効です" });
  var result = db.prepare("INSERT INTO users (name, gender, age) VALUES (?, ?, ?)").run(name, gender, age);
  res.json({ id: result.lastInsertRowid, name: name, gender: gender, age: age });
});

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

app.delete('/api/users/:id', function(req, res) {
  var id = parseInt(req.params.id, 10);
  var existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "ユーザーが見つかりません" });
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ success: true });
});

app.use(express.static(ASSETS_DIR, { fallthrough: true, maxAge: '1h' }));

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path,
    hint: 'This route was not generated. Ask AI to add it.',
  });
});

app.use((req, res) => {
  if (fs.existsSync(FRONTEND_HTML)) {
    return res.type('html').send(fs.readFileSync(FRONTEND_HTML, 'utf8'));
  }
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path,
    hint: 'Frontend runtime missing',
  });
});

app.use((err, req, res, next) => {
  console.error('[app] Error:', err.message);
  res.status(500).json({ error: err.message, stack: err.stack });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ App backend on :' + PORT + ' app=' + APP_ID + ' db=' + DB_FILE + ' mode=' + APP_DB_MODE);
});
