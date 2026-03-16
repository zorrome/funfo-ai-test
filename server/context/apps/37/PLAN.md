# 新規アプリ Plan

- Publish mode: llm_provider
- Release strategy: Convert the localStorage-based prototype into an API-driven CRUD app backed by a single people table. Keep the existing create/search/delete workflow and snake_case fields, add explicit list/create/delete routes plus a small stats route for verifier-friendly backend coverage, and use additive idempotent schema only.

## Entities
- people (id, name, phone, created_at)

## Routes
- GET /api/people — 获取人员列表，支持按姓名或电话查询
- POST /api/people — 新增人员信息并返回创建记录
- DELETE /api/people/:id — 删除指定人员记录
- GET /api/people/stats — 返回人员总数等基础统计信息

## Tables
- people (id, name, phone, created_at)

## Notes
- Frontend currently uses localStorage and mock in-memory state, so release artifacts must replace core persistence with backend APIs.
- Preserve field names exactly as name, phone, created_at to avoid contract drift.
- GET /api/people should return a bare array, not wrapped in an object, because list rendering naturally expects an array.
- POST /api/people should return the created record with id, name, phone, created_at for immediate UI update.
- Register /api/people/stats before /api/people/:id-style parameterized routes if such routes are added later.
- Schema should use CREATE TABLE IF NOT EXISTS and remain migration-safe.
- Last successful publish: v2
- Preview slug: jsxllw3s
