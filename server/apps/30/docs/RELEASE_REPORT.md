# RELEASE_REPORT - 日视图的日历（カレンダー）形式展示，方便
app_id: 30
release_app_id: 30
status: failed
updated_at: 2026-03-15T16:57:22.677Z
## Result
- Release failed during publish pipeline (SCHEMA_DRYRUN_FAILED @ candidate_runtime).
- Error: release dry-run blocked before deploy: - SQL "SELECT id, name, phone, last_visit_date, created_at, updated_at FROM customers ORDER BY COALESCE(last_visit_date, "") DESC, name COLLATE NOCASE ASC, id ASC" would fail: no such column: "" - should this be a string literal in single-quotes?
