# DB_SCHEMA - test3
app_id: 13
version: 3
updated_at: 2026-03-15T06:42:04.521Z

## SQL schema (latest)
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT 'その他',
  age INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (age >= 0 AND age <= 150)
);

CREATE TABLE IF NOT EXISTS app (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT 'その他',
  age INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (age >= 0 AND age <= 150)
);

INSERT INTO app (id, name, gender, age, created_at, updated_at)
SELECT u.id, u.name, u.gender, u.age, u.created_at, u.updated_at
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM app a WHERE a.id = u.id
);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_app_created_at ON app(created_at);
CREATE INDEX IF NOT EXISTS idx_app_gender ON app(gender);
```

## Tables
- users
- app
