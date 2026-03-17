# 2026-03-22 · SW-N3 degradation ledger contract freeze（implementation-ready）

## 目标与范围

- workspace：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf`
- branch：`v4-perf`
- 本轮目标：冻结 `SW-N3 Degradation-Ledger + ReducerPatchSink contract` 的最小合同、决策矩阵、统一词表与验证矩阵。
- 本轮实际收口：`docs/proposal-only`，不保留 `packages/**` 实现改动。

## 结论类型

- `docs/evidence-only`
- `implementation-ready=true`
- 结果分类：`docs_only_ready_for_impl`

## 结论

`SW-N3` 现在可以进入独立 implementation line。  
此前 design package 缺失的 D1/D2/D3/D4 已在本文件冻结，后续实现线只需按本文件口径落代码、测试与证据。

## D1 · `StateWriteIntent` 最小合同

### 冻结字段

```ts
type StateWriteIntentSource =
  | 'reducer'
  | 'boundApi.update'
  | 'trait.externalStore'
  | 'moduleAsSource'

type StateWriteIntentCoverage =
  | 'precisePatch'
  | 'topLevelKnown'
  | 'customMutation'

type StateWriteIntent = {
  readonly source: StateWriteIntentSource
  readonly anchor: {
    readonly instanceId: string
    readonly txnSeq: number
    readonly opSeq?: number
  }
  readonly coverage: StateWriteIntentCoverage
  readonly degradeReason?: 'unknownWrite' | 'customMutation' | 'nonTrackablePatch' | 'fallbackPolicy'
  readonly pathIdsTopK?: ReadonlyArray<number>
}
```

### 冻结约束

- `anchor` 复用现有 `instanceId/txnSeq/opSeq`。
- `coverage='customMutation'` 时必须带 `degradeReason`。
- `pathIdsTopK` 只承载 TopK id。
- 不携带大对象快照。

### 入口映射

| 现有入口 | 现有锚点 | 新 `source` |
| --- | --- | --- |
| reducer 写回 | `PatchReason='reducer'` | `reducer` |
| `$.state.update / $.state.mutate` | `origin.kind='state'` + `name='update' | 'mutate'` | `boundApi.update` |
| external store writeback | `origin.kind='trait-external-store'` | `trait.externalStore` |
| module-as-source / source-refresh | `PatchReason='source-refresh'` | `moduleAsSource` |

## D2 · `ReducerPatchSink` 决策矩阵

| 条件 | `coverage` | `degradeReason` | 说明 |
| --- | --- | --- | --- |
| 能提供可映射 patch path / pathId | `precisePatch` | 无 | 走现有 `recordPatch` / id-first 路径 |
| 无精确 patch，但可稳定给出 top-level changed keys | `topLevelKnown` | 无 | 仅允许 top-level 已知集合 |
| 无 patch 证据，且 whole-state / mutate 类路径显式降级 | `customMutation` | `customMutation` | 必须显式降级 |
| 路径不可跟踪 | `customMutation` | `nonTrackablePatch` | 复用现有原因枚举 |
| registry 缺失或 id 映射失败 | `customMutation` | `fallbackPolicy` | 复用现有原因枚举 |
| 完全无 dirty evidence | `customMutation` | `unknownWrite` | 复用现有原因枚举 |

冻结规则：
- 禁止静默 `dirtyAll`。
- 任何 `dirtyAll=true` 的 `state:update` 都必须能回溯到 `StateWriteIntent.coverage='customMutation'`。

## D3 · `state:update` / devtools / perf 统一词表

在现有 `meta.dirtySet` 之外，新增 slim 字段：

```ts
meta.stateWrite = {
  source,
  coverage,
  degradeReason,
  anchor: { instanceId, txnSeq, opSeq },
  pathIdsTopK,
}
```

冻结规则：
- `dirtySet` 保留，作为既有 diff/兼容锚点。
- devtools 以 `meta.stateWrite` 作为主读取面。
- perf 指标冻结为：
  - `stateWrite.degradeRatio`
  - `stateWrite.degradeUnknownShare`

## D4 · focused validation matrix

### 契约层

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/Contracts.019.TxnPerfControls.test.ts \
  test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts
```

### 入口层

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts
```

### projection 层

```bash
pnpm -C packages/logix-devtools-react exec vitest run \
  test/internal/devtools-react.integration.test.tsx \
  test/internal/ConvergeTimelinePane.test.tsx
```

### comparability 层

```bash
python3 fabfile.py probe_next_blocker --json
```

## 开线准入条件

满足以下条件即可开 `SW-N3` 实施线：
- `public API change=false` 仍成立
- 与 `SW-N2` 保持串行
- 实现线沿本文验证矩阵出工件并单提交收口

## 本轮收口说明

- 本轮不实施代码。
- 本轮不改 public API。
- 本轮把 `SW-N3` 从 design-package 推进到 `implementation-ready=true`。
