# 081 · 已完成 plan + tasks（下一步进入 implement）

- `specs/081-platform-grade-parser-mvp/plan.md` 已落地（含 `contracts/schemas/anchor-index.schema.json`）。

## 下一步（resume 后立即执行）

- 执行 `specs/081-platform-grade-parser-mvp/tasks.md` 的任务（Parser API、reason codes、单测、CLI 集成验证）。
- 实现落点：`packages/logix-anchor-engine/src/Parser.ts`（Node-only；`@logixjs/core` 不引入 `ts-morph/swc`）。
