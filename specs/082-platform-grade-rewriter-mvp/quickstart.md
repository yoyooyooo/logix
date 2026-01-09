# Quickstart: 082 Platform-Grade Rewriter MVP（PatchPlan / Write-Back）

> 目标：在 Platform-Grade 子集内，把“缺失锚点字段”安全写回源码（最小 diff、幂等、可解释失败）。

## 1) 产物是什么

- `PatchPlan@v1`：结构化写回计划（report-only 与 write-back 共用）。
- `WriteBackResult@v1`：执行结果（modified/skipped/failed + reason codes）。

权威 schema：

- `specs/082-platform-grade-rewriter-mvp/contracts/schemas/patch-plan.schema.json`
- `specs/082-platform-grade-rewriter-mvp/contracts/schemas/writeback-result.schema.json`

## 2) 怎么运行（预期入口）

Rewriter 通常由 085 CLI 暴露：

- `logix anchor autofill --report`：仅输出计划/报告，不写回源码。
- `logix anchor autofill --write`：执行写回（仍输出同结构报告）。

## 3) 安全边界（必须牢记）

- 只补“未声明”的锚点字段；`services: {}` 视为作者已声明，禁止覆盖。
- 子集外/歧义/不确定：必须拒绝写回，并以 reason codes 可解释失败。
