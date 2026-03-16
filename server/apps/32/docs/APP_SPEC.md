# APP_SPEC - 新規アプリ
app_id: 32

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-15T19:38:43.059Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEY = "users"; var SESSION_KEY = "current_user_id"; var [users, setUsers] = useState([]); var [currentUserId, setCurrentUserId] = useState("");
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.
