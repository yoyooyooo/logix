# 2026-03-17 · P1-5 第七刀候选：explicit cached entry eviction 暂缓

## 结果分类

- `discarded_or_pending`

## 目标

第六刀已经把 `cachedEntriesById` 的 retained heap 主导项收掉：

- `cap + cachedValue reset` 已升级为 accepted

此处只剩更激进的一条候选：

- 在 `RuntimeExternalStore` 的 final teardown 上显式 evict cached selector entry

## RED

先加了 core 单测：

```bash
pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts
```

失败点：

- `evictEntry drops cached selector entry after final teardown`
- 旧实现报错：`graph.evictEntry is not a function`

## 实现后验证

其中 explicit eviction 版曾通过以下验证：

```bash
pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.sharedSubscription.test.tsx test/Hooks/useSelector.readQueryRetainScope.test.tsx test/internal/RuntimeExternalStore.lowPriority.test.ts
pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/external-store-ingest.test.tsx --project browser
```

这些验证只说明语义没坏，不说明这刀值得保留。

## 证据

同口径 retained heap probe：

```bash
NODE_OPTIONS=--expose-gc pnpm exec tsx <<'TS'
// 10k unique selector churn probe
TS
```

早期的未校正 retained heap probe 一度显示：

- 第四刀后：`delta ≈ 50.6MB`
- 第五刀实现版：`delta ≈ 50.0MB`

读法：

- retained heap delta 只下降了约 `1.2%`
- 这个改善太弱，撑不起新增的 explicit eviction 复杂度
- corrected retained heap 口径下，真正值得保留的是第六刀 `cap + cachedValue reset`，不是 explicit eviction

## 结论

这条线当前只保留结论，不保留代码：

- `explicit cached entry eviction` 方向有逻辑合理性
- 但当前证据仍不足以把它升级成 `accepted_with_evidence`
- 第六刀后的 pure core retain/release corrected probe 只剩约 `1.15MB`，继续压榨的空间已经很小
- 若后续继续，先重做更可信的 retained heap 口径，再决定是否值得实现 runtime-level eviction
