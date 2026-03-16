# DB_SCHEMA - 新規アプリ
app_id: 3
version: 4
updated_at: 2026-03-14T15:31:24.466Z

## SQL schema (latest)
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  age INTEGER NOT NULL,
  is_logged_in INTEGER NOT NULL DEFAULT 1,
  login_at TEXT,
  logged_out_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_logged_in ON users(is_logged_in);
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
```

## Tables
- users
