# 2026-03-17 · P1-5 第四刀：selector entry / hub long-gap 复用

## 结果分类

- `accepted_with_evidence`

## 目标

前三刀已经做到：

- React store 不再自持 selector drain fiber
- retain 冷路径不再创建无效 scope

剩下的固定税在于 long-gap cold activation 仍会重复创建：

- `SelectorGraph` entry
- `PubSub.unbounded(...)`
- reads / root 索引壳对象

这刀只切 entry 生命周期：

- 最后一个订阅者 release 后，active 集合归零
- 但 entry / hub 进入 cached 态
- 下次 `ensureEntry(...)` 复用同一个 entry / hub

## 变更范围

- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.entryReuse.microbench.ts`
- `specs/073-logix-external-store-tick/plan.md`

## RED

先把 core 单测升级成 identity 断言：

```bash
pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts
```

失败点：

- `expected secondEntry to be firstEntry`
- 失败原因：旧实现在 `releaseEntry(...)` 后直接 delete，后续 ensure 会重新创建 entry / hub

## 实现

- `SelectorGraph`
  - active map 与 cached map 分离
  - `hasAnyEntries()` 只看 active entries
  - `releaseEntry(...)` 在 subscriberCount 归零后转入 cached map
  - `ensureEntry(...)` 优先复用 cached entry，再回到 active map
  - candidate index / `selectorsWithoutReads` 只跟 active entry 绑定

## 验证

```bash
pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.sharedSubscription.test.tsx test/Hooks/useSelector.readQueryRetainScope.test.tsx
pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/external-store-ingest.test.tsx --project browser
pnpm -C packages/logix-core typecheck:test
```

结果：

- `SelectorGraph.test.ts` 通过
- React 侧相关 hook 测试继续通过
- `external-store-ingest` browser gate 继续通过；heap gate 的 teardown 断言已对齐到 `grace hold` 之后再检查 store 重建
- `packages/logix-core typecheck:test` 通过

## 证据

direct selector-entry lifecycle micro-bench：

```bash
pnpm exec tsx packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.entryReuse.microbench.ts
```

同代码 A/B：

- `current`
  - `meanMs = 4.152`
  - `minMs = 2.891`
  - `maxMs = 6.840`
- `baseline`
  - `meanMs = 23.505`
  - `minMs = 20.059`
  - `maxMs = 32.519`

读法：

- 2 万轮 direct ensure/release cycle 下，entry / hub 复用后平均总耗时下降约 `82.3%`
- 这份证据只测 selector entry 生命周期，不混入 React render、runtime store topic、selector eval 或 commit 路径

## 结论

第四刀成立：

- long-gap cold activation 的 entry / hub 分配税已经显著收回
- active 集合归零时 `hasAnyEntries()` 仍然是 `false`，不会把 commit 观察面重新带回热路径
- 若继续推进 `P1-5`，下一步应只看 cached entry 的回收策略与 retained heap，避免把当前正收益回退成常驻增长问题

后续：

- 第六刀已落在 `docs/perf/archive/2026-03/2026-03-17-p1-5-cached-entry-cap-reset.md`
- 当前统一收口见 `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
