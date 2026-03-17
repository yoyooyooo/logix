# 2026-03-19 · P2-2B dispatch reducer/writeback execution plan（evidence-only 回收）

## 本刀范围

- 目标：验证 `DispatchPlan-B` 最小切口，聚焦 `Reducer/Writeback` 执行计划化。
- 不触碰：
  - `StateTransaction.ts`
  - `SelectorGraph.ts`
  - `process/**`
  - `logix-react/internal/**`
  - Action/topic fanout 预编译（已由 `P2-2A` 覆盖）
- 代码落点（来源分支实现）：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`

## 实现摘要（来源分支）

1. 新增 `dispatchExecutionPlanByActionTag`，维护 `actionTag -> { reducer, writebacks }`。
2. 安装期按 `initialReducers` 预热计划表，`registerReducer/registerActionStateWriteback` 走增量同步。
3. dispatch 事务体在 `dispatchInTransaction` 开头解析一次执行计划，再复用给：
   - `applyPrimaryReducer`
   - `applyActionStateWritebacks`
4. 兼容语义保持：
   - duplicate reducer 仍报错。
   - late reducer/writeback 注册仍走现有错误通道。
   - 仅减少每次 action 的重复 Map 查找，不改变事务边界与 publish 时序。

## 贴边证据

### dispatch shell micro-bench（同命令、同机、同参数）

命令：

```bash
pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

before：

- `dispatch.p50=0.078ms`
- `dispatch.p95=0.118ms`
- `residual.avg=0.051ms`

after：

- `dispatch.p50=0.078ms`
- `dispatch.p95=0.144ms`
- `residual.avg=0.057ms`

delta（after - before）：

- `dispatch.p50: +0.000ms`
- `dispatch.p95: +0.026ms`
- `residual.avg: +0.006ms`

recheck：

- `dispatch.p50=0.076ms`
- `dispatch.p95=0.142ms`
- `residual.avg=0.061ms`

判读：

- probe 状态为 `clear`，说明当前探针链路可继续推进。
- targeted perf 结论为负向，`dispatch.p95` 与 `residual.avg` 连续两次高于 before。
- 因性能收益不成立，本线保持 docs/evidence-only 回收，不回任何代码改动。

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-2b-dispatch-plan.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-2b-dispatch-plan.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-2b-dispatch-plan.diff.json`

## 最小验证（来源分支）

已执行并通过：

```bash
pnpm -C packages/logix-core test -- test/Module.test.ts -t "primary reducer|Duplicate primary reducer|Late primary reducer"
pnpm -C packages/logix-core test -- test/Flow/WatcherPatterns.test.ts -t "runFork watcher should behave like runParallel pattern|production burst watcher writebacks should collapse into a single state:update commit"
pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts -t "dispatchBatch fan-out|actionsByTag\\$ should keep _tag/type OR semantics|actionsByTag\\$ should dedupe duplicated _tag/type topic fanout"
pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
pnpm -C packages/logix-core typecheck:test
python3 fabfile.py probe_next_blocker --json
```

`probe_next_blocker` 状态：`clear`。

## 裁决

- 分类：`rejected_with_evidence_probe_clear`
- 结论：probe 已 clear，但 targeted perf 为负向收益，当前不回代码。
