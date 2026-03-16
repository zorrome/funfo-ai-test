# 値上げ判断や仕入れ見直しに使える原価分析 Plan

- Publish mode: llm_provider
- Release strategy: localStorage中心の原価分析プロトタイプを API-driven な永続化アプリへ変換する。初期表示は GET /api/dashboard で hydrate し、ingredients・price_records・menu_items は明示的 CRUD に切り替える。一覧系は bare array、POST/PUT は作成・更新済みレコード、DELETE は { success, id } を返し、snake_case を維持して write-then-read と verifier の契約確認を通しやすくする。

## Entities
- ingredient (id, name, category, unit, supplier, created_at, updated_at)
- price_record (id, ingredient_id, recorded_at, unit_price, quantity_basis, created_at)
- menu_item (id, name, selling_price, recipe_text, created_at, updated_at)

## Routes
- GET /api/dashboard — 初期表示用に ingredients・price_records・menu_items と集計値を一括返却する
- GET /api/ingredients — 原料一覧を bare array で返す
- POST /api/ingredients — 原料を新規登録し作成済みレコードを返す
- PUT /api/ingredients/:id — 原料情報を更新し更新済みレコードを返す
- DELETE /api/ingredients/:id — 原料を削除し { success, id } を返す
- GET /api/price-records — 価格履歴一覧を bare array で返す
- POST /api/price-records — 価格記録を追加し作成済みレコードを返す
- DELETE /api/price-records/:id — 価格記録を削除し { success, id } を返す
- GET /api/menu-items — メニュー一覧を bare array で返す
- POST /api/menu-items — メニューを新規登録し作成済みレコードを返す
- PUT /api/menu-items/:id — メニュー情報を更新し更新済みレコードを返す
- DELETE /api/menu-items/:id — メニューを削除し { success, id } を返す

## Tables
- ingredients (id, name, category, unit, supplier, created_at, updated_at)
- price_records (id, ingredient_id, recorded_at, unit_price, quantity_basis, created_at)
- menu_items (id, name, selling_price, recipe_text, created_at, updated_at)

## Notes
- frontend の core data は /api 由来とし、localStorage を source of truth にしない
- GET /api/dashboard は top-level keys として ingredients, price_records, menu_items と安定した集計値を返す
- field 名は ingredient_id, recorded_at, unit_price, quantity_basis, selling_price, recipe_text をそのまま維持する
- schema は CREATE TABLE IF NOT EXISTS ベースの migration-safe な定義にする
- candidate readiness と smoke は空配列でも崩れない read endpoint と初期描画を優先する
- POST/PUT は必ず作成済み・更新済みレコード本体を返し、DELETE は { success, id } を返す
- Last successful publish: v3
- Preview slug: 8uuykedu
