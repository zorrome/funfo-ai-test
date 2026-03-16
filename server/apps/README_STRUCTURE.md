# server/apps layout

Each funfo app lives in `server/apps/<appId>/`.

## Canonical top-level files
- `App.jsx` — current frontend entry
- `server.js` — current backend entry
- `schema.sql` — current schema snapshot
- `APP_SPEC.md` — product spec
- `API_CONTRACT.md` — frontend/backend contract notes
- `DB_SCHEMA.md` — schema notes
- `RELEASE_MANIFEST.json` — latest release/runtime metadata
- `RELEASE_REPORT.md` / `RELEASE_NOTES.md` — release diagnostics

## Canonical subdirectories
- `versions/vN/` — immutable version snapshots
- `runtime/` — runtime-only artifacts (recommended future location)
- `docs/` — generated docs/spec notes (recommended future location)

## Runtime files currently seen in-place
Legacy runtime files like `data_dev.sqlite`, `data_prod.sqlite`, `*-wal`, `*-shm` may still exist at the app root for compatibility. New maintenance work should gradually converge runtime artifacts into a dedicated `runtime/` folder without breaking existing flows.
