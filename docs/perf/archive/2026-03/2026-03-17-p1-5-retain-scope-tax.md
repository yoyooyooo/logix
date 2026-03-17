# 2026-03-17 · P1-5 第三刀：去掉 retain 冷路径的无效 Scope 税

## 结果分类

- `accepted_with_evidence`

## 目标

第二刀已经把 selector activation ownership 下沉到 core retain/release，但 retain 冷路径里还保留了一层无效 `Scope.make()`：

- `SelectorGraph.ensureEntry(...)` 本身不消费外部 scope
- retain helper 仍为每次冷激活创建一次 scope
- release 还会异步 close 一个没有承载资源的 scope

这层 scope 只会增加冷激活固定税，不提供真实资源管理收益。

## 变更范围

- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-react/test/Hooks/useSelector.readQueryRetainScope.test.tsx`
- `packages/logix-core/test/ReadQuery/ReadQuery.activationRetainScope.microbench.ts`
- `specs/073-logix-external-store-tick/plan.md`

## RED

先加失败测试，再验证：

```bash
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.readQueryRetainScope.test.tsx
```

失败点：

- 断言：`expected 1 to be 0`
- 失败原因：静态 selector 首次 retain 仍触发了一次 `Scope.make()`

## 实现

- `SelectorGraph.ensureEntry(...)`
  - 去掉外部 `Scope.Scope` 依赖
- `ModuleRuntime.impl.ts`
  - `retainStaticReadQueryActivation(...)` 不再创建/关闭临时 scope
  - stream finalizer 与 retain release 回到纯同步 release

## 验证

```bash
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.readQueryRetainScope.test.tsx
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.sharedSubscription.test.tsx
pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts
pnpm -C packages/logix-react typecheck:test
pnpm -C packages/logix-core typecheck:test
```

结果：

- `useSelector.readQueryRetainScope.test.tsx` 通过
- `useSelector.sharedSubscription.test.tsx` 通过
- `SelectorGraph.test.ts` 通过
- `packages/logix-react typecheck:test` 通过
- `packages/logix-core typecheck:test` 通过

## 证据

直接命中 retain/release 冷路径的 micro-bench：

```bash
pnpm exec tsx packages/logix-core/test/ReadQuery/ReadQuery.activationRetainScope.microbench.ts
```

同代码 A/B：

- `current`
  - `meanMs = 46.522`
  - `minMs = 41.243`
  - `maxMs = 61.129`
- `baseline`
  - `meanMs = 59.826`
  - `minMs = 56.685`
  - `maxMs = 67.230`

读法：

- 2 万轮 retain/release 冷激活，去掉无效 scope 后平均总耗时下降约 `22.2%`
- 这份证据只测 retain/release 冷路径，不混入 React render、topic notify 或 selector restart 语义

## 结论

第三刀成立：

- static selector retain/release 冷路径已经去掉无效 `Scope.make()` 固定税
- 这层优化不改变第二刀的 ownership 语义
- `P1-5` 继续向下时，默认只看更深的 selector entry / hub 生命周期，不回到 React 侧补丁

后续：

- 第四刀已落在 `docs/perf/archive/2026-03/2026-03-17-p1-5-selector-entry-reuse.md`
- 当前统一收口见 `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
