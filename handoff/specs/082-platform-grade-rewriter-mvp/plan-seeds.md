# 082 · 已完成 plan + tasks（下一步进入 implement）

- `specs/082-platform-grade-rewriter-mvp/plan.md` 已落地（含 `contracts/schemas/patch-plan.schema.json` 与 `writeback-result.schema.json`）。

## 下一步（resume 后立即执行）

- 执行 `specs/082-platform-grade-rewriter-mvp/tasks.md` 的任务（Rewriter API、report/write 模式、reason codes、单测、CLI 集成验证）。
- 实现落点：`packages/logix-anchor-engine/`（Node-only；必须宁可失败不 silent corruption）。
