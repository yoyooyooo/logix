# 2026-03-17 · P1-5 第六刀：cached selector entry cap + value reset

## 结果分类

- `accepted_with_evidence`

## 目标

在第五刀 `readQuery store idle GC` 收掉 facade 空转常驻后，10k unique selector 完整 subscribe/unsubscribe 的 corrected retained heap probe 仍有一段明显常驻：

- 第五刀后：`retainedAfterRelease ≈ 26.2MB`

这时再看 core retain/release 本身，切口就收窄到 `SelectorGraph.cachedEntriesById`：

- cached entry 没有上界
- release 后保留了 `cachedValue`
- long-gap reuse 虽然快，但会把历史 selector 壳和 value 一直留住

## RED

先加两条 core 单测：

```bash
pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts
```

失败点：

- `evicts old cached entries once selector cache exceeds the cap`
- `drops cached selector value while keeping entry identity reusable`

## 实现

文件：

- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`

改动：

- 给 `cachedEntriesById` 增加固定 cap：`256`
- entry 进入 cached map 前清空：
  - `hasValue`
  - `cachedValue`
  - `cachedAtTxnSeq`
  - `lastScheduledTxnSeq`
- 仍保留 entry / hub identity 复用
- 不改 React 侧，不加 runtime-level explicit eviction

## 验证

```bash
pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts
pnpm -C packages/logix-react exec vitest run test/internal/RuntimeExternalStore.idleTeardown.test.ts test/Hooks/useSelector.sharedSubscription.test.tsx test/Hooks/useSelector.readQueryRetainScope.test.tsx test/internal/RuntimeExternalStore.lowPriority.test.ts
pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/external-store-ingest.test.tsx --project browser
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-react typecheck:test
```

结果：

- core `SelectorGraph` 单测通过
- React 侧 idle teardown / shared activation / retain scope / lowPriority 回归继续通过
- browser `external-store-ingest` 继续通过
- 双包 `typecheck:test` 通过

## 证据

### corrected retained heap probe

同口径 10k unique selector，完整 subscribe/unsubscribe，且显式释放 `stores / readQueries / unsubs` 引用后再 GC：

- 第五刀后：
  - `retainedAfterRelease ≈ 26.16MB`
- 第六刀后：
  - `retainedAfterRelease ≈ 1.32MB`

读法：

- 这次是 corrected 口径，不再被 `unsubs` 数组人为吊住
- `cachedEntriesById` 的常驻从主导项降到接近噪声级别

### lifecycle micro-bench 复验

```bash
pnpm exec tsx packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.entryReuse.microbench.ts
```

结果：

- `current.meanMs = 4.744ms`
- `baseline.meanMs = 26.198ms`

读法：

- bounded cached entry + value reset 没有抹掉第四刀的 entry reuse 收益
- 2 万轮 direct ensure/release cycle 仍然显著优于 delete + recreate baseline

### pure core retain/release corrected probe

同口径 10k unique selector，只走 core retain/release，不经过 React store facade：

- 第六刀后：
  - `retainedAfterRelease ≈ 1.15MB`

读法：

- `cachedEntriesById` 主导常驻已经被收得很低
- 第六刀之后，`explicit eviction` 的潜在增量空间已经明显变小

## 结论

这刀成立：

- retained heap 的主导项已经从 `cachedEntriesById` 收掉
- long-gap reuse 语义仍保留
- 之后若继续推进内存线，只剩 `explicit eviction` 是否还值得继续做这一条待定，而且优先级已经明显下降
