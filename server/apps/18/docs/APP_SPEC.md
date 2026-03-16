# APP_SPEC - 新規アプリ
app_id: 18

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-15T07:22:59.994Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "users"; var [users, setUsers] = useState([]); var [form, setForm] = useState({ name: "", gender: "male", age: "" }); var [e
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-15T07:26:30.605Z)
- App: test8
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [users, setUsers] = useState([]); var [stats, setStats] = useState({ total_count: 0, male_count: 0, female_count: 0, ot
- API routes (5): GET /api/users, GET /api/users/stats, POST /api/users, PUT /api/users/:id, DELETE /api/users/:id
- Frontend API usage (6): GET /api/users, GET /api/users/stats, DELETE /api/users, POST /api/users, DELETE /api/users/:id, PUT /api/users/:id
- Data tables: users
- Iteration policy: keep old features/data compatible; only additive DB migration.
