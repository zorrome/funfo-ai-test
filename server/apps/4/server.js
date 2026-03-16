'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express  = require('express');
const cors     = require('cors');
const Database = require('better-sqlite3');

const app = express();
const APP_ID = 4;
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

function toIsoNow() {
  return new Date().toISOString();
}

function normalizeUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: row.age,
    is_logged_in: Number(row.is_logged_in) === 1 ? 1 : 0,
    login_at: row.login_at,
    logged_out_at: row.logged_out_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function parseUserId(value) {
  var id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function validateUserPayload(body) {
  var payload = body || {};
  var name = typeof payload.name === "string" ? payload.name.trim() : "";
  var gender = typeof payload.gender === "string" ? payload.gender.trim() : "";
  var age = Number(payload.age);

  if (!name) {
    return { ok: false, error: "请输入姓名。" };
  }

  if (!gender) {
    return { ok: false, error: "请选择性别。" };
  }

  if (!Number.isInteger(age) || age <= 0 || age > 120) {
    return { ok: false, error: "请输入正确的年龄（1-120）。" };
  }

  return {
    ok: true,
    value: {
      name: name,
      gender: gender,
      age: age
    }
  };
}

function getUserById(id) {
  return db
    .prepare(
      "SELECT id, name, gender, age, is_logged_in, login_at, logged_out_at, created_at, updated_at " +
        "FROM users WHERE id = ?"
    )
    .get(id);
}

function getStats() {
  var row = db
    .prepare(
      "SELECT " +
        "COUNT(*) AS total, " +
        "COALESCE(SUM(CASE WHEN is_logged_in = 1 THEN 1 ELSE 0 END), 0) AS logged_in, " +
        "COALESCE(SUM(CASE WHEN gender = '男' THEN 1 ELSE 0 END), 0) AS male, " +
        "COALESCE(SUM(CASE WHEN gender = '女' THEN 1 ELSE 0 END), 0) AS female, " +
        "COALESCE(SUM(CASE WHEN gender NOT IN ('男', '女') THEN 1 ELSE 0 END), 0) AS other, " +
        "ROUND(AVG(age), 1) AS average_age " +
        "FROM users"
    )
    .get();

  return {
    total: Number((row && row.total) || 0),
    logged_in: Number((row && row.logged_in) || 0),
    male: Number((row && row.male) || 0),
    female: Number((row && row.female) || 0),
    other: Number((row && row.other) || 0),
    average_age: row && row.average_age != null ? row.average_age : null
  };
}








// Auto-added API contract stubs to prevent runtime 404



app.get("/api/users", function (req, res) {
  try {
    var users = db
      .prepare(
        "SELECT id, name, gender, age, is_logged_in, login_at, logged_out_at, created_at, updated_at " +
          "FROM users " +
          "ORDER BY datetime(COALESCE(created_at, login_at)) DESC, id DESC"
      )
      .all()
      .map(normalizeUserRow);

    res.json({ users: users });
  } catch (error) {
    res.status(500).json({ error: "获取用户列表失败。" });
  }
});

app.post("/api/users/login", function (req, res) {
  try {
    var validation = validateUserPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    var value = validation.value;
    var now = toIsoNow();

    var result = db
      .prepare(
        "INSERT INTO users (name, gender, age, is_logged_in, login_at, logged_out_at, created_at, updated_at) " +
          "VALUES (?, ?, ?, 1, ?, NULL, ?, ?)"
      )
      .run(value.name, value.gender, value.age, now, now, now);

    var user = getUserById(result.lastInsertRowid);

    res.status(201).json({
      message: "用户登录成功。",
      user: normalizeUserRow(user)
    });
  } catch (error) {
    res.status(500).json({ error: "用户登录失败。" });
  }
});

app.get("/api/users/stats", function (req, res) {
  try {
    res.json(getStats());
  } catch (error) {
    res.status(500).json({ error: "获取统计数据失败。" });
  }
});

app.get("/api/users/:id", function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "用户ID无效。" });
    }

    var user = getUserById(id);
    if (!user) {
      return res.status(404).json({ error: "用户不存在。" });
    }

    res.json({ user: normalizeUserRow(user) });
  } catch (error) {
    res.status(500).json({ error: "获取用户详情失败。" });
  }
});

app.delete("/api/users/:id", function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "用户ID无效。" });
    }

    var existing = getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "用户不存在。" });
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    res.json({
      message: "用户已删除。",
      user: normalizeUserRow(existing)
    });
  } catch (error) {
    res.status(500).json({ error: "删除用户失败。" });
  }
});

app.post('/api/users/:id', (req, res) => {
  return res.json({ ok: true, placeholder: true, route: 'POST /api/users/:id' });
});

app.post("/api/users/:id/logout", function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "用户ID无效。" });
    }

    var existing = getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "用户不存在。" });
    }

    if (Number(existing.is_logged_in) !== 1) {
      return res.status(400).json({ error: "该用户当前未登录。" });
    }

    var now = toIsoNow();

    db
      .prepare(
        "UPDATE users " +
          "SET is_logged_in = 0, logged_out_at = ?, updated_at = ? " +
          "WHERE id = ?"
      )
      .run(now, now, id);

    var user = getUserById(id);

    res.json({
      message: "用户已退出登录。",
      user: normalizeUserRow(user)
    });
  } catch (error) {
    res.status(500).json({ error: "用户退出失败。" });
  }
});

app.post("/api/users/:id/relogin", function (req, res) {
  try {
    var id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "用户ID无效。" });
    }

    var existing = getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "用户不存在。" });
    }

    if (Number(existing.is_logged_in) === 1) {
      return res.status(400).json({ error: "该用户当前已登录。" });
    }

    var now = toIsoNow();

    db
      .prepare(
        "UPDATE users " +
          "SET is_logged_in = 1, login_at = ?, logged_out_at = NULL, updated_at = ? " +
          "WHERE id = ?"
      )
      .run(now, now, id);

    var user = getUserById(id);

    res.json({
      message: "用户已重新登录。",
      user: normalizeUserRow(user)
    });
  } catch (error) {
    res.status(500).json({ error: "用户重新登录失败。" });
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
