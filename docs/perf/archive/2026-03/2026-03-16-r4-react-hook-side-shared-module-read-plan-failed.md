# 2026-03-16 · R4 React hook-side shared module read plan failed

## 目标

尝试把 React hooks 侧重复的 module read 路径收成共享 plan：

- `useModule(ModuleImpl)` 侧统一 `key`、`ownerId`、`gcTime`
- `useModule(ModuleImpl)` 与 `useModuleRuntime(ModuleTag)` 统一 `factory`
- 统一 `cache.read` / `cache.readSync` 分流

这刀明确不触碰：

- `RuntimeProvider.tsx`
- `preloadPlan.ts`
- `ModuleCache.ts`

## 证据

最小相关回归在试探实现上是通过的：

- `packages/logix-react/test/Hooks/useModule.impl-keyed.test.tsx`
- `packages/logix-react/test/Hooks/useModuleSuspend.test.tsx`
- `packages/logix-react/test/Hooks/useModule.impl-vs-tag.test.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- `packages/logix-react/test/internal/integration/runtimeProviderDeferPreloadPlan.test.tsx`
- `packages/logix-react/test/internal/importedModuleContext.cleanup.test.tsx`

贴边 micro-bench 采用临时 `happy-dom` 脚本，覆盖：

- `sync` / `suspend`
- `useModule(Impl)` / `useModuleRuntime(Tag)`
- `trace:react.moduleImpl.resolve`
- `trace:react.moduleTag.resolve`

核心结果：

- resolve 次数 before / after 都保持 `1/run`
- `suspend` 路径基本持平
- `sync` 路径没有稳定正收益，`moduleImpl.resolve` 中位数略慢

本轮记录的关键中位数：

- `sync`
  - `moduleImpl.resolve`: `0.885ms -> 1.015ms`
  - `moduleTag.resolve`: `0.03ms -> 0.03ms`
  - `bootToImplReady`: `3.991ms -> 4.282ms`
  - `bootToTagReady`: `3.997ms -> 4.289ms`
- `suspend`
  - `moduleImpl.resolve`: `0.65ms -> 0.65ms`
  - `moduleTag.resolve`: `0.03ms -> 0.03ms`
  - `bootToImplReady`: `2.097ms -> 2.08ms`
  - `bootToTagReady`: `2.102ms -> 2.084ms`

## 为什么判失败

当前母线门槛要求这条线必须拿到明确且稳定的正收益。

这次结果不满足：

1. 整体只有“基本持平”的结果，没有可宣称的稳定收益
2. `sync` 路径还出现了轻微回退
3. resolve 次数保持不变，说明这刀更多是代码去重，当前没有换来可证明的热路径收益

因此本轮裁决：

- 代码改动全部回退
- 保留证据 note
- 状态记为 `pending/failed because no clear perf win`

## 收口状态

本次 worktree 应只保留这份 docs/evidence-only note，hooks 代码恢复到原状。

## 后续建议

若未来重开，优先只挑能直接减少 `sync` 热路径工作量的切口，例如：

1. 直接减少 render 期对象构造或 memo 依赖计算
2. 把共享 plan 下沉到能顺带减少 trace / route 分支开销的位置
3. 先拿更贴近 `sync` 热路径的单项 RED，再决定是否重做 plan 抽象
