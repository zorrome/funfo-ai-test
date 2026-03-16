# APP_SPEC - 新規アプリ
app_id: 36

## Purpose
- This document is the stable baseline for future iterations.
- Iteration MUST read this spec before modifying code.

## Version 1 (2026-03-16T10:06:19.913Z)
- App: 新規アプリ
- Functional summary: function asArray(v) { return Array.isArray(v) ? v : []; } function App() { var STORAGE_KEYS = { ingredients: "ingredients", price_records: "price_records", menu_items: "menu_items" }; var [ingredients, setIngredients] = 
- API routes (0): none
- Frontend API usage (0): none
- Data tables: none
- Iteration policy: keep old features/data compatible; only additive DB migration.
