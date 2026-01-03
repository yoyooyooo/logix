# Entrypoints

## Spec / Plan / Contracts

- `specs/071-logix-router-bridge/spec.md`：需求与验收点（FR/NFR/SC）。
- `specs/071-logix-router-bridge/plan.md`：实现方案与落点目录（已对齐注入形态：`Router.layer(Router.ReactRouter.make(...))` 等）。
- `specs/071-logix-router-bridge/tasks.md`：可执行任务分解（按 User Story 分组）。
- `specs/071-logix-router-bridge/contracts/public-api.md`：对外 API 草案（已回写：不对外暴露 `RouterAdapter`）。
- `specs/071-logix-router-bridge/contracts/diagnostics.md`：诊断事件与错误口径。
- `specs/071-logix-router-bridge/quickstart.md`：最小装配与验证路径。

## Analog Reference (Query)

- `apps/docs/content/docs/guide/learn/query.md`：`Query.Engine.layer(Query.TanStack.engine(...))` 的用户心智与注入模式。
- `packages/logix-query/src/internal/middleware/middleware.ts`：注入服务的 closure 缓存与“缺失注入显式失败”的范式。

## Research Notes

- `specs/071-logix-router-bridge/notes/sessions/2026-01-03.md`：本轮调研证据与对比要点。
