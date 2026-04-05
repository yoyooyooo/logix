# 2026-03-30 · unknown-write coverage cut

## 目标

把 latest-main 里 `dirty-evidence -> converge admission` 方向的第一刀收窄成一个最小实现：

- 不改 `converge` 规则本身
- 不碰 `near_full` / `dirty_all` 的既有 gate
- 只在 `requestedMode=auto` 且 `dirtyPathCountHint===0` 时，
  给 admission 增加一条 local top-level inferred dirty paths 快路

目标场景：

1. `setState(single-field, no patch)`
2. plain reducer whole-state replace

这两类当前在 admission probe 里都会直接掉进 `unknown_write`。

## 改动面

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - 保持原有 commit-time inference，不改 `dirty/full` 模式语义
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - 只补 `ConvergeContext.getBaseState`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - 保持 reducer fallback 原行为
- `packages/logix-core/src/internal/state-trait/converge.types.ts`
  - `ConvergeContext` 新增 `getBaseState?`
- `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`
  - 当 `requestedMode=auto` 且当前 dirty paths 为空时，
    用 `baseState -> draft` 做一轮 top-level tracked-key inference，
    只把结果作为本次 admission 的 local dirty paths
- `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.UnknownWriteCoverage.test.ts`
  - 新增 targeted 回归测试
- `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.CorrectnessInvariants.test.ts`
  - 更新 `trackable top-level replace` 与 `explicit wildcard` 的分界守卫

## 验证命令

```sh
pnpm -C packages/logix-core exec vitest run \
  test/StateTrait/StateTrait.ConvergeAuto.UnknownWriteCoverage.test.ts \
  test/StateTrait/StateTrait.ConvergeAuto.CorrectnessInvariants.test.ts \
  test/StateTrait/StateTrait.ConvergeDirtySet.test.ts

pnpm -C packages/logix-core exec tsc -p tsconfig.test.json --noEmit
```

## before

来自 `docs/perf/2026-03-30-dirty-evidence-converge-admission-probe.md` 与同轮 admission probe：

- `setState(single-field, no patch)`
  - `requestedMode=auto`
  - `executedMode=full`
  - `reasons=unknown_write`
  - `executedSteps=64`
  - `skippedSteps=0`
- plain reducer whole-state replace
  - `requestedMode=auto`
  - `executedMode=full`
  - `reasons=unknown_write`
  - `executedSteps=64`
  - `skippedSteps=0`
- broad covered write
  - `requestedMode=auto`
  - `executedMode=full`
  - `reasons=near_full`

## after

`pnpm -C packages/logix-core exec vitest run test/StateTrait/StateTrait.ConvergeAuto.UnknownWriteCoverage.test.ts`

输出：

```txt
[perf] unknown-write-coverage setState executedMode=dirty reasons=cache_miss executedSteps=1 skippedSteps=63
[perf] unknown-write-coverage reducerReplace executedMode=dirty reasons=cache_miss executedSteps=1 skippedSteps=63
[perf] unknown-write-coverage nearFull executedMode=full reasons=near_full executedSteps=64 skippedSteps=0
```

guard:

- `test/StateTrait/StateTrait.ConvergeAuto.CorrectnessInvariants.test.ts`
- `test/StateTrait/StateTrait.ConvergeDirtySet.test.ts`

结果：

- 全绿

## 本次裁决

- route classification: `cheap_local_positive_on_unknown_write_coverage`
- 子结论：`auto_admission_local_inference_removes_unknown_write_for_trackable_single_field_replaces`

## 含义

1. `unknown_write` 这条信号里，至少有一块是“推导时机太晚”，不是“天生不可追踪”。
2. 对可推导的 top-level replace：
   - `setState(single-field)`
   - plain reducer replace

   现在都能在 admission 阶段直接走 `dirty`，不再先掉到 `full + unknown_write`。
3. `dirty` 模式与显式 wildcard fallback 没被误伤，说明这刀只改了 `auto` admission。
4. `near_full` 这条真实 gate 没被误伤，说明这刀没有把 admission 规则整体打散。

## 当前还没覆盖的东西

1. 非 trackable / truly broad replace 仍可能走 `dirty_all`
2. browser route-level 证据还没补 focused/heavier
3. 这刀当前只证明了 latest-main cheap-local 正向，还没升级到更高证据层

## 下一步

1. 保持这条线为当前唯一实现候选
2. 先补一轮更贴近 route 的 cheap-local compare
3. 如果 route-level 仍正向，再升级到 focused-local 主裁决
