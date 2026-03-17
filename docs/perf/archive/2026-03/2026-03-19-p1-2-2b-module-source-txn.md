# 2026-03-19 · P1-2.2b ModuleAsSource target-txn 收敛修复

## 结果分类

- `failed_blocked`

## 目标与边界

- 目标：仅修复 `ModuleAsSource` external-store writeback 在 source 事务 fiber 内执行时，target 侧无活动 txn 导致 `recordStatePatch/updateDraft` 空写的问题。
- 禁区遵守：未改 `packages/logix-react/src/internal/**`、`process/**`、`SelectorGraph.ts`，未引入 draft primitive / large-batch-only / dual path。

## 本轮代码改动（来源 worktree 失败证据）

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - 新增 `isTxnIdOwnedByInstance` / `isLocalTransactionFiber`，用于按 `instanceId + txnId` 识别“当前 fiber 是否在本 runtime 的事务内”。
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - `$.state.update` / `$.state.mutate` 的事务内快路径改为 `isInLocalTransactionFiber()` 判定，避免跨 runtime fiber 误判。
- `packages/logix-core/src/internal/state-trait/external-store.ts`
  - `ModuleAsSource` 的 `writeValue` 与常规 external-store 的 `writeValueSync` 改为强制走 `internals.txn.runWithStateTransaction` 提交。
  - 保留捕获 env 的执行上下文，仅移除“inTxn 直接写 draft”的入口。

## 验证结果

### 1) 语义红线（未转绿）

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts
```

仍失败：

- `StateTrait.ExternalStoreTrait.Runtime.test.ts :: perf skeleton: externalStore ingest proxy phases`
  - `waitUntil timed out`
- `ModuleAsSource.tick.test.ts :: should settle A->B writeback and downstream derived within the same tick`
  - `expected { fromSource: +0, keyHash: 'h:0' } to deeply equal { fromSource: 2, keyHash: 'h:2' }`
- `ModuleAsSource.tick.test.ts :: should apply Module-as-Source during scheduled microtask tick (no manual flushNow)`
  - `[TestKit.advanceTicks] Expected >=1 ticks, got 0`

### 2) 既有性能守门（通过）

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts
```

通过，输出三组 perf 样本（single/eight/many）。

### 3) probe 队列（通过）

```bash
python3 fabfile.py probe_next_blocker --json
```

- `status=clear`
- 三条 gate 均 `passed`

## 收口结论

- 失败证据已收口，建议扩面到 `commit->tick->module-as-source` 触发链。
- 当前结论：`target-txn` 入口修补已覆盖，红线仍未转绿，现象与“仅 target-txn 空写”单根因假设不一致。

## 部分落盘清单（docs-only 回收）

- 已完成：
  - `docs/perf/archive/2026-03/2026-03-19-p1-2-2b-module-source-txn.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-2-2b-module-source-txn.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-2-2b-module-source-txn.probe.json`
- 待完成：
  - 允许扩面后进入下一刀实现线

