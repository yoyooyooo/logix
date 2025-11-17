# Implementation Plan: 062 Txn Lanes 默认开启（迁移与回退口径）

**Branch**: `062-txn-lanes-default-switch-migration` | **Date**: 2025-12-31 | **Spec**: `specs/062-txn-lanes-default-switch-migration/spec.md`

## Summary

目标：把 Txn Lanes 从“显式 opt-in”切换为“默认开启”，并提供可证据化的回退口径：

- default-on：未显式配置时启用 Txn Lanes
- rollback：`overrideMode=forced_off|forced_sync`
- 证据闭环：Node + Browser before/after/diff（core + core-ng 都要达标）

## Deepening Notes

- Decision: perf matrix/diff 口径以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT（`profile=default` 为硬结论档位）。
- Decision: perf evidence 允许在 dev 工作区（git dirty）采集，但必须确保 `matrix/config/env` 一致，并保留 `git.dirty.*` warnings；结论存疑时必须复测（必要时 `profile=soak`）。
- Decision: 回退口径必须“显式且可解释”，禁止隐式 fallback（与 048 的迁移口径一致）。

## Perf Evidence Plan（MUST）

### Gate 判据

- Node 与 Browser diff 必须分别满足：`meta.comparability.comparable=true && summary.regressions==0`
- Browser 主跑道：`txnLanes.urgentBacklog`（off vs default-on）
- Node 主跑道：复用 converge/txn 基线（避免默认开启造成核心路径退化）

### Collect（Browser / txnLanes.urgentBacklog）

> 说明：当前 `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx` 使用 `VITE_LOGIX_PERF_TXN_LANES_MODE=off|on` 显式配置。
> 为了证据化 default-on，本 spec 实现阶段需要扩展为 `mode=default`（不显式设置 txnLanes，让运行时默认策略生效）。

- before（forced_off / baseline 对照）：
  - core：`VITE_LOGIX_PERF_TXN_LANES_MODE=off pnpm perf collect -- --profile default --out specs/062-txn-lanes-default-switch-migration/perf/before.browser.txnLanes.off.<envId>.default.json --files test/browser/perf-boundaries/txn-lanes.test.tsx`
  - core-ng：在上面命令前加 `VITE_LOGIX_PERF_KERNEL_ID=core-ng` 并改文件名为 `before.browser.core-ng.txnLanes.off...json`
- after（default-on）：
  - core：`VITE_LOGIX_PERF_TXN_LANES_MODE=default pnpm perf collect -- --profile default --out specs/062-txn-lanes-default-switch-migration/perf/after.browser.txnLanes.default.<envId>.default.json --files test/browser/perf-boundaries/txn-lanes.test.tsx`
  - core-ng：同理加 `VITE_LOGIX_PERF_KERNEL_ID=core-ng`
- diff：`pnpm perf diff -- --before <before> --after <after> --out specs/062-txn-lanes-default-switch-migration/perf/diff.browser.txnLanes.off__default.<envId>.default.json`

### Collect（Node / converge baseline）

- before（forced_off / baseline）：`LOGIX_PERF_TXN_LANES_MODE=off pnpm perf bench:traitConverge:node -- --profile default --out specs/062-txn-lanes-default-switch-migration/perf/before.node.converge.txnCommit.txnLanes.off.<envId>.default.json`
- after（default-on）：`LOGIX_PERF_TXN_LANES_MODE=default pnpm perf bench:traitConverge:node -- --profile default --out specs/062-txn-lanes-default-switch-migration/perf/after.node.converge.txnCommit.txnLanes.default.<envId>.default.json`
- diff：`pnpm perf diff -- --before <before> --after <after> --out specs/062-txn-lanes-default-switch-migration/perf/diff.node.converge.txnCommit.txnLanes.off__default.<envId>.default.json`

## Project Structure

```text
specs/062-txn-lanes-default-switch-migration/
├── spec.md
├── plan.md
├── quickstart.md
├── tasks.md
├── contracts/
├── checklists/
└── perf/
```
