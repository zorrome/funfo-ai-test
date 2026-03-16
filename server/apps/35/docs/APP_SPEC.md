# APP_SPEC - 新規アプリ
app_id: 35

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-15T21:35:55.048Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "users"; var SESSION_KEY = "current_user"; var [users, setUsers] = useState([]); var [currentUserId, setCurrentUserId] = useState(""); 
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-15T21:39:31.900Z)
- App: test18
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [users, setUsers] = useState([]); var [currentUser, setCurrentUser] = useState(null); var [stats, setStats] = useState({ total_us
- API routes (7): GET /api/users, GET /api/users/stats, POST /api/users, DELETE /api/users/:id, GET /api/session/current, POST /api/session/login, POST /api/session/logout
- Frontend API usage (7): DELETE /api/users, GET /api/users, GET /api/users/stats, GET /api/session/current, POST /api/users, POST /api/session/login, POST /api/session/logout
- Data tables: users, sessions
- Iteration policy: keep old features/data compatible; only additive DB migration.
