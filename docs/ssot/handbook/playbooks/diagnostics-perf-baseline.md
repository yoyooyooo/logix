---
title: 诊断与性能基线（project-guide）
status: draft
version: 1
---

# 诊断与性能基线（project-guide）

> **目标**：触及 runtime 核心路径时，保证“可复现的性能证据 + 可解释的诊断链路”同步存在。

## 1) 诊断分级与关键入口

- Debug 事件入口：`packages/logix-core/src/Debug.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- Devtools 聚合窗口：`packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- EvidencePackage：
  - 导出：`packages/logix-core/src/Debug.ts`（`exportEvidencePackage`）→ `DevtoolsHub.exportDevtoolsEvidencePackage`
  - 协议：`packages/logix-core/src/internal/observability/evidence.ts`

诊断分级（off/light/full）与事件裁剪（例如 dirtySet 字段缺失）可参考用户文档：`apps/docs/content/docs/guide/advanced/debugging-and-devtools.md`。

## 2) Runtime 侧可调的性能/诊断旋钮（常用）

Runtime.make 的相关配置入口：`packages/logix-core/src/Runtime.ts`

- `options.devtools`：一键启用 devtools（会注入 `trace:effectop` 相关 observer，并挂载 hub layer）
  - 旋钮：`bufferSize`、`observer`（见 `DevtoolsRuntimeOptions`）
- `options.stateTransaction`（`RuntimeStateTransactionOptions`）：
  - `instrumentation`（观测级别）
  - `traitConvergeMode`：`auto | full | dirty`
  - `traitConvergeBudgetMs` / `traitConvergeDecisionBudgetMs`
  - `traitConvergeOverridesByModuleId`（按模块覆写）
- `options.concurrencyPolicy`：并发控制（默认把 unbounded 收敛为 bounded，并允许 overrides）

## 3) 性能基线脚本（仓库内置）

> 这些脚本的价值是“可复现 + 可 diff”；跑出来的结果通常会写到对应 spec 目录下作为证据。

统一入口（见 `.codex/skills/logix-perf-evidence/package.json`）：

- 浏览器 perf 边界：`pnpm perf collect` / `pnpm perf collect:quick` / `pnpm perf diff`
- 调优推荐：`pnpm perf tuning:recommend` / `pnpm perf tuning:best`
- `useModule` 性能：`pnpm perf bench:useModule` / `pnpm perf bench:useModule:quick`
- 把证据落到其它 spec：`pnpm perf collect -- --out specs/<id>/perf/after.worktree.json` + `pnpm perf diff -- --out specs/<id>/perf/diff.<...>.json`

脚本目录：`scripts/perf/*`（含 016/024/027/028/029 等更细分的基线脚本）。

## 4) 最小“证据闭环”建议

- 改动触及 `StateTransaction` / `converge` / `DevtoolsHub` / `EffectOpCore` / `ProgramRunner`：
  - 至少能用 `pnpm perf collect:quick`（或相关 spec collect + `--out`）复现一条 baseline；
  - 并能导出 `EvidencePackage`（或在 Devtools UI 里解释出 txn/dirty/decision/trace）。
- 改动引入新策略/预算/降级：
  - 需要在诊断事件里可解释（例如 decisionBudget/执行预算/降级原因）。
- 改动引入新标识：
  - 必须稳定且可回放（避免随机化；`instanceId/txnSeq/opSeq` 单调/可预测）。
