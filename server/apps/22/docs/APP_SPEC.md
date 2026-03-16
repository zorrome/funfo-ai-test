# APP_SPEC - 新規アプリ
app_id: 22

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-15T10:06:48.015Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_TABLES = "tables"; var STORAGE_CUSTOMERS = "customers"; var STORAGE_RESERVATIONS = "reservations"; var OPEN_HOUR = 10; var CLOSE_HOUR = 22; 
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.
