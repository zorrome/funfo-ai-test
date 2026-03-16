# APP_SPEC - 新規アプリ
app_id: 33

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-15T20:01:53.719Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "users"; var [users, setUsers] = useState([]); var [form, setForm] = useState({ name: "", gender: "male", age: "" }); var [e
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-15T20:03:21.993Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "users"; var THEME_KEY = "users_theme"; var [users, setUsers] = useState([]); var [form, setForm] = useState({ name: "", gender: "
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.
