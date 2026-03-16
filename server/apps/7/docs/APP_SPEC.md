# APP_SPEC - 新規アプリ
app_id: 7

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-14T16:10:03.393Z)
- App: 新規アプリ
- Functional summary: function App() { const STORAGE_KEY = 'funfo-user-login-app'; function asArray(value) { return Array.isArray(value) ? value : []; } const [form, setForm] = useState({ name: '', gender: '男性', age: '' }); const [u
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-14T16:13:11.977Z)
- App: 用户管理
- Functional summary: function App() { var API_BASE = typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ''; function asArray(value) { return Array.isArray(value) ? value : []; } function apiGet(path) { return fetch(API_BA
- API routes (5): GET /api/users, GET /api/users/stats, POST /api/users, DELETE /api/users/:id, DELETE /api/users
- Frontend API usage (5): GET /api/users, GET /api/users/stats, DELETE /api/users, POST /api/users, DELETE /api/users/:id
- Data tables: users
- Iteration policy: keep old features/data compatible; only additive DB migration.
