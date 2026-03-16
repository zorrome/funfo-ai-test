# APP_SPEC - 新規アプリ
app_id: 19

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-15T08:40:07.066Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "users"; var SESSION_KEY = "current_user_id"; var [users, setUsers] = useState(function() { try { var raw = localStorage.getItem(
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-15T08:44:29.004Z)
- App: test9
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [users, setUsers] = useState([]); var [currentUser, setCurrentUser] = useState(null); var [stats, setStats] = useState({ total: 0
- API routes (6): POST /api/session/login, GET /api/session/current, POST /api/session/logout, GET /api/users, GET /api/users/stats, DELETE /api/users/:id
- Frontend API usage (7): GET /api/users, GET /api/users/stats, GET /api/session/current, DELETE /api/users, POST /api/session/login, POST /api/session/logout, DELETE /api/users/:id
- Data tables: users, sessions
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 3 (2026-03-15T08:48:35.694Z)
- App: test9
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [users, setUsers] = useState([]); var [currentUser, setCurrentUser] = useState(null); var [stats, setStats] = useState({ total: 0
- API routes (6): GET /api/users, GET /api/users/stats, GET /api/session/current, POST /api/session/login, POST /api/session/logout, DELETE /api/users/:id
- Frontend API usage (7): GET /api/users, GET /api/users/stats, GET /api/session/current, DELETE /api/users, POST /api/session/login, POST /api/session/logout, DELETE /api/users/:id
- Data tables: users, sessions
- Iteration policy: keep old features/data compatible; only additive DB migration.
