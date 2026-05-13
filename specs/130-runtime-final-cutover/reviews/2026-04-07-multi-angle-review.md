# Multi-Angle Review Summary

**Date**: 2026-04-07
**Scope**: `spec.md`, `plan.md`, `tasks.md`, `inventory/*`

## Review Lenses

1. runtime spine / shell residue / allowlist 激进度
2. runtime control plane 一级入口与 direct consumer 路径
3. 大文件拆解与 perf evidence 门禁
4. spec / plan / tasks 的可执行性与反保守约束

## Key Findings Absorbed

### 1. direct consumers 原先写得不够实

- 仅写 `packages/logix-cli/**`、`packages/logix-test/**`、`packages/logix-sandbox/**` 这种目录级笼统范围还不够。
- 必须点名以下热点：
  - `packages/logix-sandbox/src/Client.ts`
  - `packages/logix-sandbox/src/Service.ts`
  - `packages/logix-sandbox/test/browser/**`
  - `packages/logix-test/test/**`
  - `packages/logix-core/test/observability/**`
  - `packages/logix-core/test/Reflection*.test.ts`
  - `packages/logix-core/test/Contracts/Contracts.045.*`
  - `examples/logix/src/scenarios/trial-run-evidence.ts`

### 2. `Reflection` / `Observability` 原先缺少最终角色定性

- 只写“control plane backing/expert”还不够。
- 必须在 runtime spine ledger 和 tasks 中明确：
  - 它们不是 canonical runtime 一级入口
  - trial/evidence 相关暴露要么降为 expert/backing-only，要么删除

### 3. 测试与 sandbox 不能被默认为“以后再清”

- 如果 `packages/logix-test` 和 `packages/logix-sandbox` 不进入本轮 tasks，实施阶段会天然退化成只清 facade。
- 因此 tasks 已补：
  - direct consumer hotspot inventory
  - old default path regression tests
  - `logix-test` / sandbox / core observability tests 的迁移或 allowlist 任务

### 4. docs owner matrix 原先缺少几个关键 owner 页面

- 已补：
  - `runtime/03`
  - `runtime/05`
  - `runtime/07`
  - `platform/02`
  - `runtime/README`

### 5. shell residue 原先缺少 `Runtime.ts` 外层桥接这一类壳层

- 已在 shell residue ledger 中补：
  - `Runtime.ts` 对 `internal/runtime/ProgramRunner*` 与 `internal/runtime/ModuleRuntime` 的外层依赖

### 6. allowlist 原先虽然有 gate，但没把“预算为 0”写进 requirements

- 已在 `spec.md` 明确：allowlist 默认预算为 0，任何保留项都必须带 owner、退出条件与必要性证明。

## Result

规划产物已从“总方向激进，但 direct consumer 与 residue 落点偏粗”提升到“可直接进入实施，且不容易在实施阶段回归保守”。
