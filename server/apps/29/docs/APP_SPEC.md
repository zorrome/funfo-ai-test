# APP_SPEC - 新規アプリ
app_id: 28

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-15T15:24:36.032Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "users"; var SESSION_KEY = "current_user_id"; var [users, setUsers] = useState([]); var [current_user_id, setCurrentUserId] = useState(""
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-15T15:28:41.598Z)
- App: test13
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [users, setUsers] = useState([]); var [currentUser, setCurrentUser] = useState(null); var [stats, setStats] = useState({ total_us
- API routes (8): GET /api/users, GET /api/users/stats, DELETE /api/users, POST /api/users, POST /api/session/login, GET /api/session/current, POST /api/session/logout, DELETE /api/users/:id
- Frontend API usage (8): GET /api/users, GET /api/session/current, GET /api/users/stats, DELETE /api/users, POST /api/users, POST /api/session/login, POST /api/session/logout, DELETE /api/users/:id
- Data tables: users, sessions
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-15T15:53:47.899Z)
- App: test13（コピー）
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [users, setUsers] = useState([]); var [currentUser, setCurrentUser] = useState(null); var [stats, setStats] = useState({ total_us
- API routes (8): GET /api/users, GET /api/users/stats, DELETE /api/users, POST /api/users, POST /api/session/login, GET /api/session/current, POST /api/session/logout, DELETE /api/users/:id
- Frontend API usage (8): GET /api/users, GET /api/session/current, GET /api/users/stats, DELETE /api/users, POST /api/users, POST /api/session/login, POST /api/session/logout, DELETE /api/users/:id
- Data tables: users, sessions
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 3 (2026-03-15T15:55:58.438Z)
- App: test13（ワークスペース）
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [users, setUsers] = useState([]); var [currentUser, setCurrentUser] = useState(null); var [stats, setStats] = useState({ total_us
- API routes (0): none
- Frontend API usage (8): GET /api/users, GET /api/session/current, GET /api/users/stats, DELETE /api/users, POST /api/users, POST /api/session/login, POST /api/session/logout, DELETE /api/users/:id
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.
