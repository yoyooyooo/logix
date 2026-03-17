# 2026-03-17 · P1-5 第二刀：selector activation ownership 下沉到 core retain/release

## 结果分类

- `accepted_with_evidence`

## 目标

把 static selector activation 的 ownership 从 React store 侧再往下压一层：

- `RuntimeExternalStore` 不再自行启动 `changesReadQueryWithMeta(...)`
- `RuntimeExternalStore` 不再自行 `Stream.runDrain(...)` / `Fiber.interrupt(...)`
- selector activation lease 改由 core 内部 retain/release 持有

这刀仍然只切 selector topic 激活链路，不重做 `TickScheduler`、`RuntimeStore`、`SelectorGraph` 的整体结构。

## 变更范围

- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/InternalContracts.ts`
- `packages/logix-core/src/internal/runtime/core/ReadQueryActivationRetention.ts`
- `packages/logix-react/test/Hooks/useSelector.sharedSubscription.test.tsx`
- `specs/073-logix-external-store-tick/plan.md`

## 设计落点

新增一个 core 内部 readQuery activation retain symbol：

- `ModuleRuntime.impl.ts`
  - 为 static readQuery 提供内部 retain helper
  - retain 时显式创建 scope，ensure selector entry，填充首个 cached value
  - release 时回收 selector entry，并关闭对应 scope
- `InternalContracts.ts`
  - 暴露 in-repo 读取入口，供 React adapter 调用
- `RuntimeExternalStore.ts`
  - 首个 listener 只调用 core retain
  - 最后一个 listener 只调用 core release
  - React 侧不再拥有 readQuery drain fiber

## RED

先改测试，再验证失败：

```bash
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.sharedSubscription.test.tsx
```

当前 HEAD 下失败点：

- 用例：`retains static selector activation in core across a short listener gap`
- 失败断言：`expected 1 to be 0`
- 失败原因：首次 mount 仍会启动一次 `changesReadQueryWithMeta(...)`，说明 activation ownership 还在 React store 侧

## GREEN

实现后再次运行：

```bash
pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.sharedSubscription.test.tsx
pnpm -C packages/logix-react exec vitest run test/internal/RuntimeExternalStore.lowPriority.test.ts
pnpm -C packages/logix-react typecheck:test
```

结果：

- `useSelector.sharedSubscription.test.tsx` 通过
- `RuntimeExternalStore.lowPriority.test.ts` 通过
- `typecheck:test` 通过

## 证据

直接命中 selector activation/restart 成本的 micro-bench：

```bash
pnpm exec tsx packages/logix-react/test/Hooks/useSelector.sharedActivation.microbench.ts
```

同代码 A/B 结果：

- `current`
  - `meanMs = 1.647`
  - `warmupActivationStarts = [0, 0, 0, 0, 0]`
  - `measuredActivationStarts = [0, 0, 0, 0, 0]`
- `baseline`
  - `meanMs = 38.093`
  - `warmupActivationStarts = [200, 200, 200, 200, 200]`
  - `measuredActivationStarts = [2000, 2000, 2000, 2000, 2000]`

读法：

- React store 侧重复启停已经完全消失
- 2000 轮短 gap 重挂期间，当前实现没有一次 activation restart
- 平均总耗时从 `38.093ms` 降到 `1.647ms`
- 同口径下约为 `23.1x` 改善

## 结论

这刀证明第二层 ownership 下沉成立：

- 第一刀的 `16ms grace hold` 还在吸收短 gap
- 真正的 activation lease 已下沉到 core retain/release
- `RuntimeExternalStore` 只保留 topic facade 与 teardown 时序，不再自己持有 selector drain fiber

下一步若继续挖 `P1-5`，优先方向应是：

- 继续评估 selector topic retain/release 与 `SelectorGraph` entry 生命周期是否还能再去掉多余 scope/churn
- 不回到 React 侧追加更多 activation 补丁

后续：

- 第三刀已落在 `docs/perf/archive/2026-03/2026-03-17-p1-5-retain-scope-tax.md`
- 当前统一收口见 `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`
