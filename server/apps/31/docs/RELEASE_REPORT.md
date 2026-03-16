# RELEASE_REPORT - test15
app_id: 31
release_app_id: 31
status: failed
updated_at: 2026-03-15T18:54:23.089Z
## Result
- Release failed during publish pipeline (SCHEMA_DRYRUN_FAILED @ candidate_runtime).
- Error: release dry-run blocked before deploy: - SQL "db.prepare(<concatenated sql>)" would fail: SQL is built by JavaScript string concatenation inside db.prepare(); release requires one complete SQLite query string.
