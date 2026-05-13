---
title: Field Kernel Perf Proposal
status: consumed
owner: runtime-core
target-candidates:
  - docs/superpowers/plans/2026-05-08-field-kernel-dirty-plan-hotpath.md
  - specs/039-field-converge-int-exec-evidence/perf/
  - specs/073-logix-external-store-tick/perf/
last-updated: 2026-05-09
---

## 去向

2026-05-08 已消费到 [Field Kernel Dirty Plan Hot Path Implementation Plan](../superpowers/plans/2026-05-08-field-kernel-dirty-plan-hotpath.md)。本提案不再作为活跃事实源；实现证据落在 `packages/logix-core/**`、`packages/logix-react/**`、`packages/logix-form/**` 的内部测试，以及 `specs/039-field-converge-int-exec-evidence/perf/`、`specs/073-logix-external-store-tick/perf/` 的 perf evidence。

当前口径以 active plan 和 `docs/ssot/runtime/02-hot-path-direction.md` 为准。本提案中的“预期收益”只保留为实施前假设，不构成已实现的性能结论。2026-05-09 的当前 perf artifact 属于 after-only evidence，且仍有 budgetExceeded；没有 clean comparable before/diff 时，不得声明 hot-path 性能已提升。

ValidateStaticIr 的当前已成立结论限于：减少 validate graph/reverseClosure 的事务内固定税，并接通 changedIndices/validateChanged 协议。list-scope uniqueness 的当前实现仍是 changed-value scoped scan，不是 indexed `O(1)` 或 `O(logN)` 方案。

基于 2026-05-08 的源码/spec 快照，我把重点压到 **Field-kernel 热路径逻辑**，不把 LOC 拆分当主目标。我的核心判断是：

> **现在最大的性能风险不是某个函数“慢”，而是同一事务里的 dirty / list / selector / source / validate / externalStore 证据被多个子系统各算一遍、各自 fallback。**
> 所以优化方向不是先拆文件，而是先建立一条内部逻辑主线：
> **一次事务 → 一份 canonical dirty plan → 一个 converge planner → source / validate / row companion / selector / runtimeStore 都消费同一份证据。**

这条路线不需要改公开 API，也不需要恢复 public `FieldKernel` family。它利用当前已经正确冻结的基础：computed/source 都有显式 `deps`，而且文档明确把 deps 当成 Graph / ReverseClosure / incremental scheduling / perf 的唯一依赖事实源。

---

# 1. 当前源码里的性能链路问题

当前事务大致是：

```text
ModuleRuntime.transaction
  → 用户 action/mutate/update 写 draft
  → StateTransaction 记录 dirtyPathIds / list evidence
  → FieldKernel.convergeInTransaction
      - 自己消费 dirtyPaths Set
      - 自己算 rootIds / dirty plan / cache
      - decision 阶段与 execution 阶段存在重复 dirty plan 逻辑
  → FieldValidate.validateInTransaction
      - 每次 buildDependencyGraph(program)
      - reverseClosure 选 check
      - list/item scope 局部化已有雏形
  → FieldSource.syncIdleInTransaction
      - 遍历 program.entries
      - source 全部 key eval
      - list source 全部 rows key eval
  → commit
  → SelectorGraph.onCommit
      - 再把 dirtyPathIds 转 path/root
      - 再判断 selector overlap
  → RuntimeStore / React external store notify
```

这说明你现在的 Field-kernel 不是缺能力，而是缺一个 **事务级性能事实源**。spec 里也已经要求 converge 优化必须保持 IR/trace 同源、可解释、diagnostics off 不产生显著分配或 O(n) 扫描，这正好说明下一步要做的是“证据收敛”，不是“多加功能”。

我建议把下一阶段 Field-kernel 性能优化定义为：

```text
目标：把 hot path 从“多系统重复推理”改成“单 dirty plan 驱动的多消费者执行”。
非目标：不改公开 API；不引入 public FieldKernel helper；不先做 LOC 优化；不引入 AOT/编译器依赖。
```

---

# 2. P0 改造：TxnDirtyPlanSnapshot，统一 dirty 权威

## 源码问题

`StateTransaction` 现在已经有 `TxnDirtyEvidence` 和 `readDirtyEvidence()`，但它暴露的主要还是 raw `dirtyPathIds: Set<FieldPathId>`、`dirtyPathsKeyHash`、list evidence。`convergeInTransaction` 又会自己从这个 Set 里推 rootIds、hash、cache key；`SelectorGraph.onCommit` 又把 commit snapshot 里的 dirty ids 转成 path/root；`validate` 消费 list evidence；`source.syncIdleInTransaction` 目前甚至没有 dirty evidence 输入。

更关键的是：`materializeDirtyPathSnapshotAndKey()` 的 hash 仍然是 raw dirty id 的插入顺序 hash。converge 内部后来会排序 rootIds，但 inline dirty micro-cache 仍可能用 raw hash。这个会让同一组 dirty，只要写入顺序不同，就降低 cache 命中稳定性。

## 改造目标

新增一个内部对象：

```ts
export interface TxnDirtyPlanSnapshot {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: DirtyAllReason

  // raw evidence，保留给 debug/diagnostics。
  readonly rawPathIds: ReadonlyArray<FieldPathId>
  readonly rawKeyHash: number
  readonly rawKeySize: number

  // canonical evidence，所有 hot path 优先使用。
  readonly rootIds: Int32Array
  readonly rootKeyHash: number
  readonly rootCount: number

  readonly authority:
    | "field-path-registry"
    | "dirty-all"
    | "unknown-write"
    | "missing-registry"

  readonly list?: TxnDirtyEvidence["list"]
}
```

重点是 `rootIds/rootKeyHash`：

```text
rootIds = prefix-free + sorted + stable
rootKeyHash = hash(sorted rootIds)
```

这样 converge plan cache、source gating、selector overlap、validate list gating 都使用同一份 canonical dirty root。

## 落地文件

```text
packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts
packages/logix-core/src/internal/runtime/core/StateTransaction.ts
packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts
packages/logix-core/src/internal/field-path.ts
packages/logix-core/src/internal/field-kernel/converge.types.ts
packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts
packages/logix-core/src/internal/runtime/core/SelectorGraph.ts
```

## 补丁形态

在 `StateTransaction.dirty.ts` 加：

```ts
export const materializeDirtyPlanSnapshot = <S>(
  state: StateTxnState<S>,
): TxnDirtyPlanSnapshot => {
  const materialized = materializeDirtyPathSnapshotAndKey(state)
  const list =
    state.listPathSet && state.listPathSet.size > 0
      ? {
          indexBindings: state.listIndexEvidence,
          rootTouched: state.listRootTouched,
          itemTouched: state.listItemTouched,
        }
      : undefined

  if (state.dirtyAllReason) {
    return {
      dirtyAll: true,
      dirtyAllReason: state.dirtyAllReason,
      rawPathIds: materialized.dirtyPathIds,
      rawKeyHash: materialized.dirtyPathsKeyHash,
      rawKeySize: materialized.dirtyPathsKeySize,
      rootIds: new Int32Array(0),
      rootKeyHash: 0,
      rootCount: 0,
      authority: "dirty-all",
      ...(list ? { list } : null),
    }
  }

  const registry = state.fieldPathIdRegistry
  if (!registry) {
    return {
      dirtyAll: true,
      dirtyAllReason: "fallbackPolicy",
      rawPathIds: materialized.dirtyPathIds,
      rawKeyHash: materialized.dirtyPathsKeyHash,
      rawKeySize: materialized.dirtyPathsKeySize,
      rootIds: new Int32Array(0),
      rootKeyHash: 0,
      rootCount: 0,
      authority: "missing-registry",
      ...(list ? { list } : null),
    }
  }

  const dirty = dirtyPathIdsToRootIds({
    dirtyPathIds: materialized.dirtyPathIds,
    registry,
  })

  if (dirty.dirtyAll) {
    return {
      dirtyAll: true,
      dirtyAllReason: dirty.reason ?? "unknownWrite",
      rawPathIds: materialized.dirtyPathIds,
      rawKeyHash: materialized.dirtyPathsKeyHash,
      rawKeySize: materialized.dirtyPathsKeySize,
      rootIds: new Int32Array(0),
      rootKeyHash: 0,
      rootCount: 0,
      authority: "unknown-write",
      ...(list ? { list } : null),
    }
  }

  const rootIds = Int32Array.from(dirty.rootIds)

  return {
    dirtyAll: false,
    rawPathIds: materialized.dirtyPathIds,
    rawKeyHash: materialized.dirtyPathsKeyHash,
    rawKeySize: materialized.dirtyPathsKeySize,
    rootIds,
    rootKeyHash: dirty.keyHash,
    rootCount: dirty.rootCount,
    authority: "field-path-registry",
    ...(list ? { list } : null),
  }
}
```

然后在 `ModuleRuntime.transaction.ts` 中，三次 materialize，而不是沿用同一份：

```ts
const dirtyBeforeConverge =
  StateTransaction.readDirtyPlanSnapshot(txnContext)

yield* FieldKernelConverge.convergeInTransaction(fieldProgram, {
  ...,
  dirtyPlan: dirtyBeforeConverge,
})

const dirtyBeforeValidate =
  StateTransaction.readDirtyPlanSnapshot(txnContext)

yield* FieldValidate.validateInTransaction(fieldProgram, {
  ...,
  dirtyPlan: dirtyBeforeValidate,
  txnDirtyEvidence: dirtyBeforeValidate,
})

const dirtyBeforeSource =
  StateTransaction.readDirtyPlanSnapshot(txnContext)

yield* FieldSource.syncIdleInTransaction(fieldProgram, {
  ...,
  dirtyPlan: dirtyBeforeSource,
})
```

必须是三次，因为：

```text
用户 mutation 会产生 dirty
converge derived write 会继续产生 dirty
validate error writeback 也会产生 dirty
source idle sync 需要看到 validate 后的最终 dirty 事实
```

## 测试门禁

```text
packages/logix-core/test/internal/runtime/StateTransaction.DirtyPlanSnapshot.test.ts
packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.DirtyPlanStableHash.test.ts
packages/logix-core/test/Runtime/Runtime.SelectorDirtyPlanSnapshot.test.ts
```

断言：

```ts
// 同一 dirty set，不同写入顺序，rootKeyHash 一致。
expect(txn(["a", "b"]).dirtyPlan.rootKeyHash)
  .toBe(txn(["b", "a"]).dirtyPlan.rootKeyHash)

// prefix-free。
expect(rootIds(["user", "user.name"])).toEqual(["user"])

// unknown write 不伪装 exact。
expect(plan.authority).not.toBe("field-path-registry")
```

---

# 3. P0 改造：Source sync dirty gating，先拿最稳收益

## 源码问题

`source.impl.ts` 的 `syncIdleInTransaction()` 现在逻辑很直接：遍历 `program.entries`，找到所有 `source`，每个 source 都算一次 key；如果是 list.item source，就遍历所有 rows 算 key。

这条路径在语义上没问题，但热路径上非常贵：

```text
任意 unrelated field mutation
  → 所有 source key 都被重新计算
  → list source 还可能扫全部 rows
```

而你的 model 已经明确 `SourceMeta.deps` 是唯一依赖事实源，source key 的依赖不需要运行时猜。

## 改造目标

`syncIdleInTransaction()` 只处理本次 dirty 可能影响 key 的 source。

## 新增内部 IR

在 `FieldProgram` 上加内部可选字段：

```ts
export interface FieldProgram<S> {
  // existing
  readonly convergeIr?: ConvergeStaticIrRegistry
  readonly convergeExecIr?: ConvergeExecIr

  // new internal acceleration IR
  readonly sourceDepIr?: SourceDepIr
}
```

IR 形态：

```ts
export interface SourceDepIr {
  readonly sourcesById: ReadonlyArray<CompiledSource>
  readonly sourceIdsByDepRootId: ReadonlyMap<FieldPathId, Int32Array>
  readonly sourceIdsByFieldPath: ReadonlyMap<string, number>
}

export interface CompiledSource {
  readonly id: number
  readonly fieldPath: string
  readonly depPathIds: Int32Array
  readonly depRootIds: Int32Array
  readonly listScope?: {
    readonly listPath: string
    readonly itemPath: string
  }
}
```

在 `build.ts` 阶段根据 `entry.kind === "source"` 和 `entry.meta.deps` 编译，不改变外部 API。

## `syncIdleInTransaction` 改法

当前：

```ts
for (const entry of program.entries) {
  if (entry.kind !== "source") continue
  // root source: key(draft)
  // list source: for every row key(item)
}
```

改成：

```ts
const plan = ctx.dirtyPlan

if (!plan || plan.dirtyAll || plan.authority !== "field-path-registry") {
  return syncAllSources(program, ctx)
}

const sourceIds = collectAffectedSourceIds(program.sourceDepIr, plan.rootIds)

if (sourceIds.length === 0) {
  return Effect.void
}

for (const sourceId of sourceIds) {
  const source = sourceIr.sourcesById[sourceId]

  if (!source.listScope) {
    syncRootSourceIdle(source, ctx)
    continue
  }

  const changedIndices = getChangedIndicesForList(plan.list, source.listScope.listPath)

  if (!changedIndices) {
    syncAllRowsForSource(source, ctx)
  } else {
    syncChangedRowsForSource(source, changedIndices, ctx)
  }
}
```

## 正确性规则

| 情况                                          | 行为                        |
| ------------------------------------------- | ------------------------- |
| unrelated txn                               | 不 eval source key         |
| source dep dirty                            | eval affected source key  |
| list item dep dirty                         | 只 eval affected row       |
| list root touched / reorder / unknown write | fallback full             |
| dirtyAll / missing registry                 | fallback full             |
| key throws                                  | 保持当前 no-op/idle 语义，不扩大错误面 |

## 历史预期收益

以下表格是提案阶段的目标假设，只能作为实现验收方向。最终性能结论必须使用 active spec 的 comparable before/after 或 diff evidence。

| 场景                                   |            当前 |               改后 |
| ------------------------------------ | ------------: | ---------------: |
| unrelated field mutation，100 sources |  100 key eval |                0 |
| 1000 rows list source，改一行            | 1000 key eval |                1 |
| list reorder                         | 1000 key eval | 1000，明确 fallback |

## 测试

```text
packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts
packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.ListDirtyGate.test.ts
```

断言：

```ts
expect(keyEvalCount).toBe(0) // unrelated txn
expect(rowKeyEvalCount).toBe(1) // one row changed
expect(fallbackReason).toBe("list_root_touched") // reorder/remove/unknown
```

---

# 4. P0 改造：Validate 预编译 IR，不要每次 validate 重建 graph

## 源码问题

`validate.impl.ts` 里每次 `validateInTransaction()` 都会：

```ts
const checks = program.entries.filter(...)
const graph = buildDependencyGraph(program)
reverseClosure(graph, target)
const selectedChecks = checks.filter(...)
```

这意味着 onChange/onBlur 高频校验里，Graph / ReverseClosure / checks filter 都在事务内重复做。这个成本和 rule 本身无关，是 kernel 自己的固定税。

同时，list/item incremental 已经有雏形：`txnDirtyEvidence`、`changedIndices`、`listIndexEvidence` 已经传进来了；但 list-scope rule 仍然是 `rule.validate(input, ctx)`，input 是完整 items。也就是说 kernel 给了 changedIndices，但规则本身不一定用，仍可能 O(N) 扫全表。

Form spec 已经明确不接受“每次 onChange 全表扫描”的隐式实践，跨行规则应收敛为 list-scope check，并以 deps 作为唯一依赖事实源。

## 改造目标 A：ValidateStaticIr

在 `build.ts` 阶段生成：

```ts
export interface ValidateStaticIr {
  readonly checksByFieldPath: ReadonlyMap<string, Int32Array>
  readonly checkEntries: ReadonlyArray<CompiledCheck>
  readonly reverseCheckIdsByTargetPath: ReadonlyMap<string, Int32Array>
  readonly listCheckIdsByListPath: ReadonlyMap<string, Int32Array>
  readonly itemCheckIdsByListPath: ReadonlyMap<string, Int32Array>
}

export interface CompiledCheck {
  readonly id: number
  readonly fieldPath: string
  readonly kind: "field" | "list" | "item" | "root"
  readonly entry: Extract<FieldEntry<any, string>, { kind: "check" }>
  readonly ruleKeySets: ReadonlyMap<string, ReadonlyArray<string>>
}
```

`validateInTransaction()` 不再 runtime build graph：

```ts
const selectedCheckIds = selectChecks(validateIr, requests)
if (selectedCheckIds.length === 0) return
```

## 改造目标 B：内部 incremental list rule 协议

不改公开 Form API，但给内置 rule 降成本：

```ts
type IncrementalListRule = {
  readonly deps: ReadonlyArray<string>
  readonly validate: (items: ReadonlyArray<unknown>, ctx: RuleContext) => unknown

  // internal optional fast path
  readonly validateChanged?: (
    items: ReadonlyArray<unknown>,
    changedIndices: ReadonlyArray<number>,
    ctx: RuleContext,
  ) => unknown
}
```

`evalListScopeCheck()` 改成：

```ts
const canUseChanged =
  ctx.scope.changedIndices &&
  ctx.scope.changedIndices.length > 0 &&
  typeof rule.validateChanged === "function"

const out = canUseChanged
  ? rule.validateChanged(input, ctx.scope.changedIndices, ctx)
  : rule.validate(input, ctx)
```

如果 `changedIndices` 存在但 rule 没有 `validateChanged`，diagnostics light/full 下记录：

```ts
{
  code: "field::validate_list_scope_full_fallback",
  reason: "rule_incremental_protocol_missing",
  listPath,
  changedIndicesCount,
  rowCount,
}
```

diagnostics off 下不构造对象。

## 历史预期收益

| 场景                        |                                   当前 |                     改后 |
| ------------------------- | -----------------------------------: | ---------------------: |
| onChange 单字段校验            | runtime build graph + reverseClosure |                  IR 查表 |
| list.item required/email  |                                  已局部 |                    更稳定 |
| list-scope uniqueness 改一行 |                              常见 O(N) | 需要 rule-specific index/delta 才能达成 O(1)/O(logN) |
| 自定义 list-scope rule       |                        fallback full |                  有诊断解释 |

当前落地不得把 `validateChanged` 本身解释成 uniqueness 已经 O(1)/O(logN)。如果没有 value -> row indices cache、previous-value delta 或 rule-level index invalidation，只能声明 changedIndices 协议已接入。

## 测试

```text
packages/logix-core/test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts
packages/logix-core/test/internal/FieldKernel/FieldKernel.Validate.ListIncrementalRule.test.ts
packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx
```

断言：

```ts
expect(buildDependencyGraphCallCount).toBe(0) // validate txn 内
expect(validateChangedCallCount).toBe(1)
expect(validateAllCallCount).toBe(0)
```

---

# 5. P0/P1 改造：Row-scoped computed / companion 只跑 changed rows

## 源码问题

`converge-step.ts` 里 `runRowScopedComputedStep()` 对 `_companionValuePatternPath` 会调用 `enumerateConcreteValuePaths(rootState, patternPath)`，遇到 `[]` 就遍历整张 list。另一条 `_rowScopeSourceListPath` 分支也是：

```ts
for (let rowIndex = 0; rowIndex < items.length; rowIndex += 1) {
  deriveRow(...)
}
```

所以 Form companion / row computed 现在有这个热路径：

```text
改 items[3].warehouseId
  → row-scoped computed 被触发
  → enumerate all items
  → 每行 derive
```

这会直接打到 `form.listScopeCheck` 和复杂表单体验。

## 改造目标

把 row-scoped computed 从：

```text
pattern contains [] → enumerate all concrete rows
```

改为：

```text
dirty evidence 有 changedIndices → only changed rows
list root touched / reorder / unknown → full fallback
```

## 需要给 converge ctx 加字段

```ts
export interface ConvergeContext<S> {
  // existing
  readonly dirtyPlan?: TxnDirtyPlanSnapshot
}
```

然后 `runRowScopedComputedStep()` 接收：

```ts
const changedRows = getChangedRowsForRowScopedComputed({
  dirtyPlan: params.ctx.dirtyPlan,
  sourceListPath,
  valuePatternPath,
})
```

## 改造 row pattern 编译

不要每次 split pattern。build/exec IR 阶段预编译：

```ts
interface RowPatternTemplate {
  readonly listPath: string
  readonly prefixSegments: ReadonlyArray<string>
  readonly suffixSegments: ReadonlyArray<string>
  readonly outputPrefixSegments: ReadonlyArray<string>
  readonly outputSuffixSegments: ReadonlyArray<string>
}
```

例如：

```text
items[].warehouseId
```

编译成：

```ts
{
  listPath: "items",
  prefixSegments: ["items"],
  suffixSegments: ["warehouseId"],
}
```

执行时：

```ts
for (const index of indicesToRun) {
  const valuePath = materialize(template, index)
  const next = deriveAtPath(root, valuePath, valuePath, [index])
}
```

## 正确性规则

| dirty 情况                   | 执行策略                                       |
| -------------------------- | ------------------------------------------ |
| `items.3.name`             | 只跑 row 3                                   |
| `items.3`                  | 只跑 row 3                                   |
| `items` root touched       | full rows                                  |
| insert/remove/reorder      | full rows                                  |
| dirtyAll / unknown         | full rows                                  |
| nested list parent touched | 该 parent 下 child list full，或保守 global full |

## 测试

```text
packages/logix-core/test/FieldKernel/FieldKernel.Converge.RowScopedComputed.Incremental.test.ts
packages/logix-form/test/Form/Form.Companion.RowScope.Incremental.test.ts
```

断言：

```ts
expect(deriveCallCount).toBe(1)
expect(changedRowIds).toEqual([3])
expect(noStaleCompanionForRemovedRow).toBe(true)
```

---

# 6. P1 改造：Converge planner 单一化，去掉 decision/execution 双推理

## 源码问题

`converge-in-transaction.impl.ts` 已经做了很多正确优化：near-full、plan cache、inline dirty、decision budget、off-fast path、typed reachability、immediate/deferred scope。问题是这些逻辑分散在 decision 阶段和 execution 阶段。

我看到的核心分叉是：

```text
decision 阶段：
  ensureDirtyRootIds()
  getOrComputePlan()
  nearFull 判断
  cache / 2-hit admission

execution 阶段：
  如果 mode=dirty 且没有 planStepIds
    又从 dirtyPaths Set 算 inline dirty plan
    又维护 inline micro-cache
    失败后又回 ensureDirtyRootIds()
```

这会让同一个 dirty 输入在两个阶段走不同逻辑。短期能跑，长期会让性能调优变得很难，因为 regression 不知道是 decision、cache、inline fallback 还是 execution 造成的。

## 改造目标

新增内部 planner：

```text
packages/logix-core/src/internal/field-kernel/converge-planner.ts
```

接口：

```ts
export interface ConvergePlanRequest {
  readonly execIr: ConvergeExecIr
  readonly dirtyPlan: TxnDirtyPlanSnapshot
  readonly requestedMode: "auto" | "dirty" | "full"
  readonly schedulingScope: "all" | "immediate" | "deferred"
  readonly schedulingScopeStepIds?: Int32Array
  readonly diagnosticsLevel: "off" | "light" | "full" | "sampled"
  readonly middlewareStackEmpty: boolean
  readonly decisionBudgetMs?: number
  readonly planCache?: ConvergePlanCache
}

export interface ConvergePlanResult {
  readonly mode: "noop" | "full" | "dirty"
  readonly stepIds?: Int32Array
  readonly stepCount: number
  readonly affectedSteps: number
  readonly reason:
    | "no_dirty"
    | "dirty_all"
    | "dirty_sparse"
    | "near_full"
    | "cache_hit"
    | "cache_miss"
    | "decision_budget_cutoff"
    | "unknown_dirty"
  readonly planKeyHash: number
  readonly fallback?: "unknown_dirty" | "near_full" | "decision_budget"
}
```

`convergeInTransaction()` 改成：

```ts
const plan = planConverge({
  execIr,
  dirtyPlan: ctx.dirtyPlan,
  requestedMode,
  schedulingScope,
  schedulingScopeStepIds: ctx.schedulingScopeStepIds,
  diagnosticsLevel,
  middlewareStackEmpty: stack.length === 0,
  planCache: ctx.planCache,
})

if (plan.mode === "noop") return Noop
if (plan.mode === "full") runSteps(scopeStepIds)
if (plan.mode === "dirty") runSteps(plan.stepIds!, plan.stepCount)
```

## 关键策略

不要一开始就删掉 off-fast inline dirty。建议两阶段：

### Phase 1：planner 只接管 root canonical + cache key

保留现有 inline 执行，但 inline key 改用：

```ts
dirtyPlan.rootKeyHash ^ scopeKey
```

而不是 raw `dirtyPathsKeyHash`。

### Phase 2：planner 接管所有 dirty plan 生成

执行阶段不再重新算 dirty plan。它只消费 `plan.stepIds`。

## DenseIdBitSet 自适应 clear

当前 `DenseIdBitSet` 支持 `fill` 和 `touched-words`，但 `converge-exec-ir.ts` 默认都是 `new DenseIdBitSet(size)`。建议按规模切换：

```ts
const clearStrategy =
  fieldPathCount >= 1024 || stepCount >= 1024
    ? "touched-words"
    : "fill"

dirtyPrefixBitSet: new DenseIdBitSet(fieldPathCount, { clearStrategy })
reachableStepBitSet: new DenseIdBitSet(stepCount, { clearStrategy })
```

这是低风险优化，尤其对 sparse dirty + large graph 有帮助。

## 测试

```text
packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts
packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts
packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.NearFullReason.test.ts
```

断言：

```ts
expect(plan.reason).toBe("dirty_sparse")
expect(executionDidNotRecomputeDirtyPlan).toBe(true)
expect(plan.reason).toBe("near_full") // near-full 明确解释
```

---

# 7. P1 改造：Deferred time-slicing 只 slice reachable deferred plan

## 源码问题

`ModuleRuntime.transaction.ts` 里 deferred flush 用的是：

```ts
fieldProgram.convergeExecIr.topoOrderDeferredInt32.subarray(start, end)
```

这表示 time-slicing 是按全量 deferred topoOrder 切片。问题是：

```text
deferred graph 1000 steps
本次 dirty 只影响 5 个 deferred steps
当前仍可能按全量 deferred scope 切片调度
```

## 改造目标

不要 slice full deferred topo。先用 dirtyPlan 算 deferred reachable closure，再 slice closure。

```ts
const deferredPlan = planConverge({
  execIr,
  dirtyPlan,
  requestedMode: "dirty",
  schedulingScope: "deferred",
})

fieldConvergeTimeSlicing.backlog = {
  stepIds: deferredPlan.stepIds,
  stepCount: deferredPlan.stepCount,
  cursor: 0,
}
```

flush 时：

```ts
const slice = backlog.stepIds.subarray(cursor, cursor + chunkSize)

yield* FieldKernelConverge.convergeInTransaction(program, {
  ...,
  requestedMode: "dirty",
  schedulingScope: "deferred",
  precomputedStepIds: slice,
})
```

## 正确性注意

不要每个 slice 再用原始 dirty 重算一次。必须先算完整 deferred reachable closure，再按 topo 顺序 slice。否则第一片产生的 derived output 可能影响第二片，但第二片如果只看原始 dirty 会漏。

## 测试

```text
packages/logix-core/test/FieldKernel/FieldKernel.Converge.TimeSlicing.ReachablePlan.test.ts
```

断言：

```ts
expect(executedDeferredSteps).toBeLessThan(totalDeferredSteps)
expect(slicedFinalState).toEqual(fullDeferredFinalState)
```

---

# 8. P1 改造：ExternalStore coalescing 真正使用 coalesceWindowMs

## 源码问题

`external-store.ts` 里已经有 `ExternalStoreWritebackCoordinator`，有 `stage / flush / enqueue`。但当前 raw external store 的 `enqueue` 是：

```ts
yield* coordinator.stage(request)
yield* coordinator.flush()
```

也就是 signal 后基本立即开事务 flush。`coalesceWindowMs` 在 model/spec 里存在，但 raw path 没有真正用于 batch window。ExternalStore spec 明确要求写回进入事务窗口，参与 converge/validate/source idle sync，同时不能让外部订阅变成 payload queue 风暴。

## 改造目标

ExternalStore signal 仍然是 dirty signal + pull snapshot，但写回事务要合并：

```text
same tick burst → one transaction
coalesceWindowMs > 0 → window 内 one transaction
low priority → low-priority host scheduler
initial snapshot → immediate，不延迟
```

## 补丁形态

Coordinator 增加 scheduled flush：

```ts
type ExternalStoreWritebackCoordinator = {
  readonly stage: (...)
  readonly scheduleFlush: (policy: FlushPolicy) => Effect.Effect<void>
  readonly flush: () => Effect.Effect<void>
  readonly enqueue: (request, policy) => Effect.Effect<void>
}
```

实现：

```ts
enqueue: (request, policy) =>
  Effect.gen(function* () {
    yield* coordinator.stage(request)

    if (policy.immediate) {
      yield* coordinator.flush()
      return
    }

    yield* coordinator.scheduleFlush({
      delayMs: policy.coalesceWindowMs ?? 0,
      priority: request.commitPriority,
    })
  })
```

raw external store loop：

```ts
const enqueueWriteValue = (nextValue: unknown) =>
  coordinator.enqueue(
    { ...request },
    {
      immediate: false,
      coalesceWindowMs: entry.meta.coalesceWindowMs ?? 0,
    },
  )
```

initial write 保留：

```ts
yield* writeValueSync(computeValue(after))
```

不要延迟首屏同步。

## 测试

```text
packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.CoalesceWindow.test.ts
packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx
```

断言：

```ts
expect(commitCountForSameTickBurst).toBe(1)
expect(state[fieldPath]).toBe(lastValue)
```

---

# 9. P1 改造：RuntimeExternalStore readQuery snapshot 不要 active listener 时绕开 runtimeStore

## 源码问题

`RuntimeExternalStore.ts` 的 read query store 现在：

```ts
const state = hasActiveReadQueryListener
  ? undefined
  : runtimeStore.getModuleState(moduleInstanceKey)

const current = state ?? runtime.runSync(moduleRuntime.getState)
return selectorReadQuery.select(current)
```

也就是说 active read query listener 存在时，snapshot read 会强制走 `runtime.runSync(moduleRuntime.getState)`，而不是优先 runtimeStore committed snapshot。

这会影响两个目标：

1. no-tearing：React read snapshot 最好统一读 runtimeStore 的 committed state。
2. 性能：active listener 下 runSync 读可能增加尾部成本。

RuntimeStore 的性能证据/设计已经把 runtimeStore 作为 tick notify / no-tearing 的关键路径，React 内部 store 也应该继续统一消费这个 snapshot/topic facade。

## 改造目标

改成永远优先 runtimeStore：

```ts
readSnapshot: () => {
  const state = runtimeStore.getModuleState(moduleInstanceKey) as S | undefined
  const current =
    state !== undefined
      ? state
      : runtime.runSync(moduleRuntime.getState as Effect.Effect<S, never, any>)

  return selectorReadQuery.select(current)
}
```

保留 drain fiber：

```ts
Stream.runDrain(moduleRuntime.changesReadQueryWithMeta(selectorReadQuery))
```

它仍然负责 readQuery topic 激活 / selector graph 注册 / dirty topic publish。只是 snapshot read 不要因为 active listener 绕过 runtimeStore。

## 测试

```text
packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx
packages/logix-react/test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx
```

断言：

```ts
expect(activeListenerRunSyncFallbackCount).toBe(0)
expect(snapshotVersion).toBe(topicVersion)
```

---

# 10. 推荐 PR 顺序

我建议按下面顺序做，都是“内核逻辑优先”，不是 LOC 优先。

## PR-1：DirtyPlanSnapshot

**目的：** 建立统一 dirty 权威。

改：

```text
StateTransaction.dirty.ts
StateTransaction.ts
ModuleRuntime.transaction.ts
converge.types.ts
SelectorGraph.ts
```

验收：

```text
stable root hash
prefix-free roots
dirty authority reason
converge / validate / source 都能消费 dirtyPlan
```

---

## PR-2：Source sync dirty gating

**目的：** unrelated txn 不再 source 全量 key eval。

改：

```text
field-kernel/build.ts
field-kernel/model.ts
field-kernel/source.impl.ts
ModuleRuntime.transaction.ts
```

验收：

```text
unrelated source key eval = 0
list source one row dirty = one row key eval
unknown/list root touched = full fallback
```

这是最稳、收益最明显的一步。

---

## PR-3：ValidateStaticIr + list incremental rule protocol

**目的：** onChange/onBlur 校验不再 runtime 重建 graph；内置 list rule 用 changedIndices。

改：

```text
field-kernel/build.ts
field-kernel/model.ts
field-kernel/validate.impl.ts
logix-form/internal/rules.*
```

验收：

```text
validate txn 内 buildDependencyGraph = 0
changedIndices 存在时内置 rule validateChanged
自定义 rule fallback full 有诊断
```

---

## PR-4：Row-scoped computed / companion incremental

**目的：** 改一行只跑一行 companion / row computed。

改：

```text
field-kernel/converge-step.ts
field-kernel/converge-exec-ir.ts
field-kernel/build.ts
ModuleRuntime.transaction.ts
logix-form/internal/form/install.ts
```

验收：

```text
derive calls == changed row count
insert/remove/reorder fallback full
no stale companion row
```

---

## PR-5：Converge planner 单一化

**目的：** decision/execution 不再双推理，plan reason 唯一。

改：

```text
field-kernel/converge-planner.ts
field-kernel/converge-in-transaction.impl.ts
field-kernel/bitset.ts
field-kernel/converge-exec-ir.ts
```

验收：

```text
dirty sparse 不误判 full
near-full reason 明确
planner compute once
diagnostics off no extra allocations
```

---

## PR-6：ExternalStore coalesce + RuntimeExternalStore snapshot 统一

**目的：** 降低 externalStore burst 和 runtimeStore.noTearing tail。

改：

```text
field-kernel/external-store.ts
logix-react/internal/store/RuntimeExternalStore.ts
```

验收：

```text
same-tick burst commit count <= 1
coalesceWindowMs 生效
readQuery snapshot 优先 runtimeStore
```

---

# 11. 关键性能指标

建议把这些指标加入 perf evidence：

| 指标                                                      |                   目标 |
| ------------------------------------------------------- | -------------------: |
| `dirtyPlan.rootKeyHash.stable`                          | 同 dirty set 不受写入顺序影响 |
| `source.syncIdle.keyEval.unrelatedTxn`                  |                    0 |
| `source.syncIdle.listRowKeyEval.changedOneRow`          |                    1 |
| `validate.graphBuildPerTxn`                             |                    0 |
| `validate.listScope.changedOneRow.scannedRows`          |      接近 changed rows |
| `rowScopedComputed.deriveCalls.changedOneRow`           |                    1 |
| `converge.planner.computeCountPerTxn`                   |                    1 |
| `converge.planCache.hitRate.stablePattern`              |                > 80% |
| `externalStore.ingest.sameTickCommitCount`              |              1 或接近 1 |
| `runtimeStore.readQuery.runSyncFallback.activeListener` |                    0 |
| `diagnostics.off.debugEventAllocCount`                  |                    0 |

这些指标对齐已有风险点：`negativeBoundaries.dirtyPattern`、`converge.txnCommit`、`form.listScopeCheck`、`runtimeStore.noTearing.tickNotify`、`externalStore.ingest.tickNotify`。之前的评估也已经把这些列为优先排查链路。

---

# 12. 最终建议

现在不要先做大规模 LOC 拆分，也不要急着加新 Field-kernel API。正确路线是：

```text
DirtyPlanSnapshot
  → Source dirty gating
  → ValidateStaticIr + incremental list rule
  → Row-scoped computed incremental
  → Single converge planner
  → ExternalStore coalesce + RuntimeStore snapshot unification
```

这条路线的本质是：

> **把 Field-kernel 从“多个 runtime 子系统各自判断 dirty 和 scope”改成“一个事务级 dirty plan 驱动所有热路径”。**

这样做会直接降低返工概率，因为它不改用户心智、不改 public spine、不引入第二 truth；同时它会把性能收益落到最真实的链路上：source key eval、list row derive、validate graph、converge plan、selector overlap、React notify。
