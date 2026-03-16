# App 36 Release Notes


## 2026-03-16T10:13:45.159Z publish failed
- phase: candidate_runtime
- type: RUNTIME_HEALTH_FAILED
- retryable: yes
- detail: readiness=fetch failed | container_logs_tail=✅ App backend on :3001 app=36 db=data_prod.sqlite mode=prod

## 2026-03-16T10:31:37.015Z publish failed
- phase: backend_sql_generate
- type: PUBLISH_UNKNOWN
- retryable: no
- detail: Empty model response

## 2026-03-16T10:33:38.949Z publish failed
- phase: backend_sql_generate
- type: PUBLISH_UNKNOWN
- retryable: no
- detail: Empty model response

## 2026-03-16T10:38:30.001Z publish failed
- phase: backend_sql_generate
- type: PUBLISH_UNKNOWN
- retryable: no
- detail: Empty model response

## 2026-03-16T10:46:20.863Z publish failed
- phase: candidate_runtime
- type: RUNTIME_FRONTEND_UNREACHABLE
- retryable: yes
- detail: candidate frontend route was not reachable after deploy (status 502)

## 2026-03-16T10:58:05.863Z publish failed
- phase: candidate_runtime
- type: RUNTIME_FRONTEND_UNREACHABLE
- retryable: yes
- detail: candidate frontend route was not reachable after deploy (status 502)

## 2026-03-16T11:08:05.169Z publish failed
- phase: backend_sql_generate
- type: PUBLISH_UNKNOWN
- retryable: no
- detail: Empty model response

## 2026-03-16T11:15:28.754Z verifier failed
- summary: release verifier failed: browser_smoke_runtime
- failures:
  - BROWSER_SMOKE_UNAVAILABLE: No Chrome/Chromium executable found for browser smoke verification

## 2026-03-16T11:15:28.761Z publish failed
- phase: verifier
- type: BROWSER_SMOKE_UNAVAILABLE
- retryable: no
- detail: candidate verifier failed: Browser smoke runtime available (No Chrome/Chromium executable found for browser smoke verification)

## 2026-03-16T11:39:44.989Z publish success
- releaseAppId: 36
- version: v3
- previewSlug: 8uuykedu
- publishMode: llm_provider
