'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express  = require('express');
const cors     = require('cors');
const Database = require('better-sqlite3');

const app = express();
const APP_ID = 15;
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
