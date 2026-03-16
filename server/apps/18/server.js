'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express  = require('express');
const cors     = require('cors');
const Database = require('better-sqlite3');

const app = express();
const APP_ID = 18;
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

function nowTs() {
  return Date.now();
}

function normalizeGender(value) {
  if (value === "male" || value === "female" || value === "other") return value;
  return null;
}

function parseUserId(value) {
  var id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function parseUserPayload(body) {
  var name = body && typeof body.name === "string" ? body.name.trim() : "";
  var gender = normalizeGender(body && body.gender);
  var age = body && body.age !== undefined ? Number(body.age) : NaN;

  if (!name) {
    return { error: "名前を入力してください" };
  }

  if (!gender) {
    return { error: "性別を正しく選択してください" };
  }

  if (!Number.isInteger(age) || age <= 0) {
    return { error: "年齢は1以上の整数で入力してください" };
  }

  return {
    value: {
      name: name,
      gender: gender,
      age: age
    }
  };
}

function getUserById(id) {
  return db.prepare("SELECT id, name, gender, age, created_at, updated_at FROM users WHERE id = ?").get(id);
}

function buildStats() {
  var aggregate = db.prepare("SELECT COUNT(*) AS total_count, COALESCE(SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END), 0) AS male_count, COALESCE(SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END), 0) AS female_count, COALESCE(SUM(CASE WHEN gender = 'other' THEN 1 ELSE 0 END), 0) AS other_count, COALESCE(ROUND(AVG(age), 1), 0) AS average_age, COALESCE(MIN(age), 0) AS min_age, COALESCE(MAX(age), 0) AS max_age, COALESCE(SUM(CASE WHEN age < 20 THEN 1 ELSE 0 END), 0) AS under_20_count, COALESCE(SUM(CASE WHEN age >= 20 THEN 1 ELSE 0 END), 0) AS adult_count FROM users").get();

  var topGenderRow = db.prepare("SELECT gender, COUNT(*) AS count FROM users GROUP BY gender ORDER BY count DESC, CASE gender WHEN 'male' THEN 1 WHEN 'female' THEN 2 ELSE 3 END LIMIT 1").get();

  return {
    total_count: Number(aggregate.total_count || 0),
    male_count: Number(aggregate.male_count || 0),
    female_count: Number(aggregate.female_count || 0),
    other_count: Number(aggregate.other_count || 0),
    average_age: Number(aggregate.average_age || 0),
    min_age: Number(aggregate.min_age || 0),
    max_age: Number(aggregate.max_age || 0),
    under_20_count: Number(aggregate.under_20_count || 0),
    adult_count: Number(aggregate.adult_count || 0),
    top_gender: topGenderRow && topGenderRow.gender ? topGenderRow.gender : ""
  };
}






app.get('/api/users', function (req, res) {
  try {
    var users = db.prepare("SELECT id, name, gender, age, created_at, updated_at FROM users ORDER BY created_at DESC, id DESC").all();

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
    var parsed = parseUserPayload(req.body);
    if (parsed.error) {
      return res.status(400).json({
        error: parsed.error
      });
    }

    var ts = nowTs();
    var result = db.prepare("INSERT INTO users (name, gender, age, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
      parsed.value.name,
      parsed.value.gender,
      parsed.value.age,
      ts,
      ts
    );

    res.status(201).json({
      user: getUserById(result.lastInsertRowid)
    });
  } catch (error) {
    res.status(500).json({
      error: "ユーザーの登録に失敗しました"
    });
  }
});

app.get('/api/users/stats', function (req, res) {
  try {
    res.json(buildStats());
  } catch (error) {
    res.status(500).json({
      error: "統計情報の取得に失敗しました"
    });
  }
});

app.put('/api/users/:id', function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({
        error: "ユーザーIDが不正です"
      });
    }

    var existing = getUserById(id);
    if (!existing) {
      return res.status(404).json({
        error: "ユーザーが見つかりません"
      });
    }

    var parsed = parseUserPayload(req.body);
    if (parsed.error) {
      return res.status(400).json({
        error: parsed.error
      });
    }

    db.prepare("UPDATE users SET name = ?, gender = ?, age = ?, updated_at = ? WHERE id = ?").run(
      parsed.value.name,
      parsed.value.gender,
      parsed.value.age,
      nowTs(),
      id
    );

    res.json({
      user: getUserById(id)
    });
  } catch (error) {
    res.status(500).json({
      error: "ユーザー情報の更新に失敗しました"
    });
  }
});

app.delete('/api/users/:id', function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({
        error: "ユーザーIDが不正です"
      });
    }

    var existing = getUserById(id);
    if (!existing) {
      return res.status(404).json({
        error: "ユーザーが見つかりません"
      });
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    res.json({
      success: true,
      deleted_id: id
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
