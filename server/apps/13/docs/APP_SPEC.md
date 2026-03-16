# APP_SPEC - 新規アプリ
app_id: 13

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-14T18:59:02.630Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "users"; var [users, setUsers] = useState(function() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e) { retu
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 3 (2026-03-15T06:42:04.518Z)
- App: test3
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } var API_BASE = ""; function apiGet(path) { return fetch(API_BASE + path).then(function(r) { if (!r.ok) throw new Error("API error: " + r.status); return r.json(); }); }
- API routes (5): GET /api/users, GET /api/users/stats, POST /api/users, PUT /api/users/:id, DELETE /api/users/:id
- Frontend API usage (6): GET /api/users, GET /api/users/stats, DELETE /api/users, POST /api/users, DELETE /api/users/:id, PUT /api/users/:id
- Data tables: users, app
- Iteration policy: keep old features/data compatible; only additive DB migration.
