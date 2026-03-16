'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express  = require('express');
const cors     = require('cors');
const Database = require('better-sqlite3');

const app = express();
const APP_ID = 29;
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

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

function parseCookies(req) {
  var header = req.headers && req.headers.cookie ? req.headers.cookie : "";
  var pairs = header ? header.split(";") : [];
  var out = {};

  pairs.forEach(function(part) {
    var idx = part.indexOf("=");
    if (idx === -1) return;
    var key = part.slice(0, idx).trim();
    var value = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  });

  return out;
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", "session_token=" + encodeURIComponent(token) + "; Path=/; HttpOnly; SameSite=Lax");
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function createToken() {
  return "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2) + "_" + Math.random().toString(36).slice(2);
}

function getActiveSessionToken(req) {
  var cookies = parseCookies(req);
  return cookies.session_token || null;
}

function getCurrentUserByRequest(req) {
  var token = getActiveSessionToken(req);
  if (!token) return null;

  return db.prepare(`
    SELECT users.id, users.name, users.gender, users.age, users.created_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
      AND sessions.logged_out_at IS NULL
    ORDER BY sessions.id DESC
    LIMIT 1
  `).get(token);
}

function getStatsObject() {
  var stats = db.prepare(`
    SELECT
      COUNT(*) AS total_users,
      SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) AS male_count,
      SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) AS female_count,
      SUM(CASE WHEN gender = 'other' THEN 1 ELSE 0 END) AS other_count,
      printf('%.1f', COALESCE(AVG(age), 0)) AS average_age
    FROM users
  `).get();

  return {
    total_users: Number(stats && stats.total_users ? stats.total_users : 0),
    male_count: Number(stats && stats.male_count ? stats.male_count : 0),
    female_count: Number(stats && stats.female_count ? stats.female_count : 0),
    other_count: Number(stats && stats.other_count ? stats.other_count : 0),
    average_age: String(stats && stats.average_age != null ? stats.average_age : "0.0")
  };
}

function getHealthPayload() {
  db.prepare(`SELECT 1 AS ok`).get();

  return {
    ok: true,
    status: "ok",
    service: "user-login-app",
    db_mode: "sqlite",
    timestamp: new Date().toISOString()
  };
}











app.get('/api/health', function(req, res) {
  try {
    res.json(getHealthPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      status: "error",
      service: "user-login-app",
      db_mode: "sqlite",
      error: "health check failed"
    });
  }
});

app.get('/api/session/current', function(req, res) {
  try {
    var user = getCurrentUserByRequest(req);
    res.json(user || null);
  } catch (err) {
    res.status(500).json({ error: 'ログイン状態の取得に失敗しました' });
  }
});

app.post('/api/session/login', function(req, res) {
  try {
    var body = req.body || {};
    var userId = Number(body.user_id);

    if (!Number.isFinite(userId) || userId <= 0) {
      res.status(400).json({ error: 'ユーザーが不正です' });
      return;
    }

    var user = db.prepare(`
      SELECT id, name, gender, age, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' });
      return;
    }

    var existingToken = getActiveSessionToken(req);
    if (existingToken) {
      db.prepare(`
        UPDATE sessions
        SET logged_out_at = CURRENT_TIMESTAMP
        WHERE token = ?
          AND logged_out_at IS NULL
      `).run(existingToken);
    }

    var token = createToken();

    db.prepare(`
      INSERT INTO sessions (token, user_id)
      VALUES (?, ?)
    `).run(token, userId);

    setSessionCookie(res, token);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

app.post('/api/session/logout', function(req, res) {
  try {
    var token = getActiveSessionToken(req);

    if (token) {
      db.prepare(`
        UPDATE sessions
        SET logged_out_at = CURRENT_TIMESTAMP
        WHERE token = ?
          AND logged_out_at IS NULL
      `).run(token);
    }

    clearSessionCookie(res);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'ログアウトに失敗しました' });
  }
});

app.get('/api/users', function(req, res) {
  try {
    var rows = db.prepare(`
      SELECT id, name, gender, age, created_at
      FROM users
      ORDER BY id ASC
    `).all();

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
  }
});

app.delete('/api/users', function(req, res) {
  try {
    var token = getActiveSessionToken(req);

    if (token) {
      db.prepare(`
        UPDATE sessions
        SET logged_out_at = CURRENT_TIMESTAMP
        WHERE token = ?
          AND logged_out_at IS NULL
      `).run(token);
    }

    clearSessionCookie(res);
    res.json({ success: true, logged_out_current_session: true });
  } catch (err) {
    res.status(500).json({ error: 'セッション削除に失敗しました' });
  }
});

app.post('/api/users', function(req, res) {
  try {
    var body = req.body || {};
    var name = typeof body.name === 'string' ? body.name.trim() : '';
    var gender = typeof body.gender === 'string' ? body.gender : '';
    var age = Number(body.age);

    if (!name) {
      res.status(400).json({ error: '姓名を入力してください' });
      return;
    }

    if (['male', 'female', 'other'].indexOf(gender) === -1) {
      res.status(400).json({ error: '性別が不正です' });
      return;
    }

    if (!Number.isFinite(age) || age <= 0 || Math.floor(age) !== age) {
      res.status(400).json({ error: '正しい年齢を入力してください' });
      return;
    }

    var info = db.prepare(`
      INSERT INTO users (name, gender, age)
      VALUES (?, ?, ?)
    `).run(name, gender, age);

    var created = db.prepare(`
      SELECT id, name, gender, age, created_at
      FROM users
      WHERE id = ?
    `).get(info.lastInsertRowid);

    res.json(created);
  } catch (err) {
    res.status(500).json({ error: 'ユーザー登録に失敗しました' });
  }
});

app.get('/api/users/stats', function(req, res) {
  try {
    res.json(getStatsObject());
  } catch (err) {
    res.status(500).json({ error: '統計の取得に失敗しました' });
  }
});

app.delete('/api/users/:id', function(req, res) {
  try {
    var userId = Number(req.params.id);

    if (!Number.isFinite(userId) || userId <= 0) {
      res.status(400).json({ error: 'ユーザーIDが不正です' });
      return;
    }

    var user = db.prepare(`
      SELECT id, name, gender, age, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' });
      return;
    }

    var activeToken = getActiveSessionToken(req);
    var currentSession = activeToken ? db.prepare(`
      SELECT user_id
      FROM sessions
      WHERE token = ?
        AND logged_out_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `).get(activeToken) : null;

    db.prepare(`
      UPDATE sessions
      SET logged_out_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND logged_out_at IS NULL
    `).run(userId);

    db.prepare(`
      DELETE FROM users
      WHERE id = ?
    `).run(userId);

    var deletedCurrent = !!(currentSession && Number(currentSession.user_id) === userId);
    if (deletedCurrent) {
      clearSessionCookie(res);
    }

    res.json({
      success: true,
      id: userId,
      logged_out_current_session: deletedCurrent
    });
  } catch (err) {
    res.status(500).json({ error: 'ユーザー削除に失敗しました' });
  }
});

app.get('/health', function(req, res) {
  try {
    res.json(getHealthPayload());
  } catch (err) {
    res.status(500).json({
      ok: false,
      status: "error",
      service: "user-login-app",
      db_mode: "sqlite",
      error: "health check failed"
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
