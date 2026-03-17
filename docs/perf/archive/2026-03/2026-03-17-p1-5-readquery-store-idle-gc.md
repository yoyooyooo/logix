# 2026-03-17 · P1-5 第五刀：readQuery store idle GC

## 结果分类

- `accepted_with_evidence`

## 目标

定位结果显示，第四刀后的 retained heap 大头里有一段非常明确的固定税：

- 只调用 `getRuntimeReadQueryExternalStore(...)`
- 之后从未订阅
- store 仍会立刻进入 runtime 级 cache map
- 若调用方丢掉引用，这批 store 仍会常驻，直到 runtime 销毁

这条链路不涉及 selector activation，不涉及 `SelectorGraph`，纯粹是 readQuery store facade 的空转常驻。

## RED

先加失败测试：

```bash
pnpm -C packages/logix-react exec vitest run test/internal/RuntimeExternalStore.idleTeardown.test.ts
```

失败点：

- 用例：`evicts an unsubscribed readQuery store after the grace window`
- 失败断言：`expected second not to be first`
- 失败原因：unsubscribed readQuery store 在 grace 窗口后仍留在 runtime cache

## 实现

文件：

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

改动：

- `makeTopicExternalStore(...)` 新增 `teardownWhenIdleOnCreate`
- 仅对 readQuery store 开启该开关
- 创建后若始终没有 listener，会按同一条 grace teardown 路径自动 `removeStore(...)`
- 一旦真正订阅，`subscribe()` 会取消这次 idle teardown，不影响已接受的共享 activation 语义

## 验证

```bash
pnpm -C packages/logix-react exec vitest run test/internal/RuntimeExternalStore.idleTeardown.test.ts
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.sharedSubscription.test.tsx test/Hooks/useSelector.readQueryRetainScope.test.tsx test/internal/RuntimeExternalStore.lowPriority.test.ts
pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/external-store-ingest.test.tsx --project browser
pnpm -C packages/logix-react typecheck:test
```

结果：

- idle teardown 新单测通过
- 共享 activation / retain scope / lowPriority scheduling 相关回归继续通过
- browser `external-store-ingest` 继续通过
- `packages/logix-react typecheck:test` 通过

## 证据

### 1. store-only retained heap probe

同口径 10k unique selector，只创建 store，不订阅：

- 变更前：
  - `deltaStores ≈ 54.2MB`
  - `retainedAfterDrop ≈ 54.4MB`
- 变更后：
  - `deltaStores ≈ 54.2MB`
  - `retainedAfterDrop ≈ 0.12MB`

读法：

- store 创建成本本身还在
- 但“调用方已经丢掉引用后仍常驻”的部分几乎被清空
- 这说明 idle GC 直接命中了 readQuery facade cache 的真实泄漏面

### 2. full subscribe/unsubscribe retained heap probe

同口径 10k unique selector，完整订阅后再释放：

- 变更后：`retainedAfterRelease ≈ 73.1MB`

读法：

- 这刀没有解决 selector activation / cached entry 的 retained heap
- 它只收掉“未订阅 store 常驻”这条独立税项

## 结论

这刀成立：

- `getRuntimeReadQueryExternalStore(...)` 的空转 cache 泄漏已收掉
- 不影响前四刀已接受的 activation 共享语义
- 后续若继续推进内存线，目标应回到 activation / `SelectorGraph` retained heap，而不是 readQuery store facade 本身

后续：

- 当前统一收口见 `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
