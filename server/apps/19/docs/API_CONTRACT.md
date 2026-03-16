# API_CONTRACT - test9
app_id: 19
version: 3
updated_at: 2026-03-15T08:48:35.696Z

## Backend routes
- DELETE /api/users/:id
- GET /api/session/current
- GET /api/users
- GET /api/users/stats
- POST /api/session/login
- POST /api/session/logout

## Frontend API usage
- DELETE /api/users
- DELETE /api/users/:id
- GET /api/session/current
- GET /api/users
- GET /api/users/stats
- POST /api/session/login
- POST /api/session/logout

## Contract diff (frontend used but backend missing)
- DELETE /api/users
