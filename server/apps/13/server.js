'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express  = require('express');
const cors     = require('cors');
const Database = require('better-sqlite3');

const app = express();
const APP_ID = 13;
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
