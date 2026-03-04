# Effect v4 迁移分析（Logix）

## 背景

- 目标：在 `effect-v4` worktree 中，提前完成一套可直接执行的 Effect v4 前向式重构规划。
- 当前 worktree：
  - 路径：`/Users/yoyo/Documents/code/personal/logix.worktrees/effect-v4`
  - 分支：`effect-v4`（基于 `main` 创建）
- 官方迁移来源：`Effect-TS/effect-smol/migration/*`。

## 迁移总裁决（已锁定）

- 只做 `v4-only`，不保留 v3 兼容层、不做双栈、不设弃用期。
- 允许并鼓励重构既有模块实现思路，以 v4 原生能力为第一优先级。
- 事务窗口禁止 IO、统一最小 IR、稳定标识、Slim 诊断事件约束保持不变。
- STM（Tx*）采用“局部引入 + 滞后半步 + go/no-go”策略，不阻断主线。
- 执行顺序新增前置门：等待 `feat/perf-dynamic-capacity-maxlevel` 合入 `main`，先完成 Perf 前置收口（P-1/GP-1），再进入 S0~S6。

## 本目录内容

- `01-official-v3-v4-delta.md`：官方 v3->v4 变化解读（含语义风险）。
- `02-logix-core-migration-analysis.md`：`logix-core` 核心路径改造蓝图（含热点与重构方向）。
- `03-ecosystem-migration-analysis.md`：非 core 包迁移影响与优先级。
- `04-roadmap-and-execution.md`：执行路线、阶段门禁、证据策略与 STM 插入点。
- `05-stm-local-adoption.md`：STM 局部引入策略、边界与 go/no-go 判据。
- `06-schema-v4-opportunity-analysis.md`：Schema v4 能力机会点、模块优先级与 PoC 建议。
- `07-logix-core-v4-optimization-tier-analysis.md`：logix-core 的阶梯化优化机会（快收益/中收益/深重构）。
- `08-tier-debate-consensus.md`：三层（Tier-1/2/3）辩论后统一裁决、节奏与硬门禁。
- `09-release-notes-v1.0.zh-CN.md`：Logix 1.0（Effect v4）breaking changes + 中文迁移说明。

## Spec 入口（实施主线）

- `specs/103-effect-v4-forward-cutover/spec.md`
- `specs/103-effect-v4-forward-cutover/plan.md`
- `specs/103-effect-v4-forward-cutover/tasks.md`

## 官方参考链接

- 目录：https://github.com/Effect-TS/effect-smol/tree/main/migration
- 总入口：https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md
