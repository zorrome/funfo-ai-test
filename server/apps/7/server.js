'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express  = require('express');
const cors     = require('cors');
const Database = require('better-sqlite3');

const app = express();
const APP_ID = 7;
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
