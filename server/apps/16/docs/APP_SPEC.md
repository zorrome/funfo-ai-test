# APP_SPEC - 新規アプリ
app_id: 15

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-14T20:06:16.641Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "users"; var [users, setUsers] = useState([]); var [name, setName] = useState(""); var [gender, setGender] = useState("male"); var [age,
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-14T20:09:24.780Z)
- App: test5
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [users, setUsers] = useState([]); var [stats, setStats] = useState({ totalCount: 0, averageAge: "0.0", maleCount: 0, fe
- API routes (4): GET /api/users, GET /api/users/stats, POST /api/users, DELETE /api/users/:id
- Frontend API usage (4): GET /api/users, GET /api/users/stats, POST /api/users, DELETE /api/users/:id
- Data tables: users
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-14T20:10:40.254Z)
- App: test5（コピー）
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [users, setUsers] = useState([]); var [stats, setStats] = useState({ totalCount: 0, averageAge: "0.0", maleCount: 0, fe
- API routes (4): GET /api/users, GET /api/users/stats, POST /api/users, DELETE /api/users/:id
- Frontend API usage (4): GET /api/users, GET /api/users/stats, POST /api/users, DELETE /api/users/:id
- Data tables: users
- Iteration policy: keep old features/data compatible; only additive DB migration.
