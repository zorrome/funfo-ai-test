# APP_SPEC - 新規アプリ
app_id: 27

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-15T15:12:54.253Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "user_profiles_app_v1"; var [profiles, setProfiles] = useState(function() { try { var raw = localStorage.getItem(STORAGE_KEY); 
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.

## Version 2 (2026-03-15T15:15:24.494Z)
- App: test12
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var API_BASE = ""; var [profiles, setProfiles] = useState([]); var [current_user, setCurrentUser] = useState(null); var [stats, setStats] = useState({ t
- API routes (8): GET /api/users, GET /api/users/stats, GET /api/session/current, DELETE /api/users, POST /api/users, POST /api/session/login, POST /api/session/logout, DELETE /api/users/:id
- Frontend API usage (8): GET /api/users, GET /api/users/stats, GET /api/session/current, DELETE /api/users, POST /api/users, POST /api/session/login, POST /api/session/logout, DELETE /api/users/:id
- Data tables: users, sessions
- Iteration policy: keep old features/data compatible; only additive DB migration.
