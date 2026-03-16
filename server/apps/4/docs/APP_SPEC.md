# APP_SPEC - 新規アプリ
app_id: 3

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-14T13:46:18.133Z)
- App: 新規アプリ
- Functional summary: function App() { const STORAGE_KEY = 'user-login-stats-app-v1'; function asArray(value) { return Array.isArray(value) ? value : []; } const [users, setUsers] = useState([]); const [form, setForm] = useState({ name: '', 
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 1 (2026-03-14T13:56:05.131Z)
- App: 新規アプリ
- Functional summary: function App() { var STORAGE_KEY = "user-login-stats-app-v1"; function asArray(value) { return Array.isArray(value) ? value : []; } function readStorage() { try { var raw = localStorage.getItem(STORAGE_KEY); if
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-14T14:00:47.466Z)
- App: 新規アプリ
- Functional summary: function App() { var API_BASE = typeof window !== "undefined" && window.API_BASE ? window.API_BASE : ""; var genderOptions = ["男", "女", "其他"]; function asArray(value) { return Array.isArray(value) ? value : []; } function pa
- API routes (8): GET /api/users, GET /api/users/stats, GET /api/users/:id, POST /api/users/login, POST /api/users/:id/logout, POST /api/users/:id/relogin, DELETE /api/users/:id, POST /api/users/:id
- Frontend API usage (7): GET /api/users, GET /api/users/stats, DELETE /api/users, POST /api/users/login, GET /api/users/:id, DELETE /api/users/:id, POST /api/users/:id
- Data tables: users
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-14T14:00:48.334Z)
- App: 新規アプリ（コピー）
- Functional summary: function App() { var API_BASE = typeof window !== "undefined" && window.API_BASE ? window.API_BASE : ""; var genderOptions = ["男", "女", "其他"]; function asArray(value) { return Array.isArray(value) ? value : []; } function pa
- API routes (8): GET /api/users, GET /api/users/stats, GET /api/users/:id, POST /api/users/login, POST /api/users/:id/logout, POST /api/users/:id/relogin, DELETE /api/users/:id, POST /api/users/:id
- Frontend API usage (7): GET /api/users, GET /api/users/stats, DELETE /api/users, POST /api/users/login, GET /api/users/:id, DELETE /api/users/:id, POST /api/users/:id
- Data tables: users
- Iteration policy: keep old features/data compatible; only additive DB migration.
