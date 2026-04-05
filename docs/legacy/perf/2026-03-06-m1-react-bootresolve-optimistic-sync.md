# 2026-03-06 · M-1：`suspend` 路径的 optimistic sync fast-path（ModuleImpl/Tag 冷启动直降）

本刀目标：直接打掉 `react.bootResolve` 里最贵的一层固定成本。

此前 `ModuleCache.read(...)` 在 `policy.mode='suspend'` 下有一个非常保守的行为：

- 不管模块构造是否其实是纯同步；
- 也不管 Layer/Tag 能不能在当前 render 里立刻拿到；
- 一律先 `fork + throw Promise`，把调用方送进 Suspense。

这条策略对真正 async 的模块是对的，但对“纯同步、无 async layer”的冷启动来说是纯额外成本。`react.bootResolve` 的旧数据已经说明了这一点：`suspend` 模式下 `bootToModuleImplReady/TagReady` 的 p95 在 `317~329ms`，而模块本身其实没有任何 async 初始化逻辑。

## 结论（已完成）

- `suspend` 路径现在支持 **optimistic sync fast-path**：
  - 当 `policy.mode='suspend'` 且有正的 `syncBudgetMs` 时；
  - 先尝试 `runtime.runSync(factory(scope))`；
  - 如果构造本身就是纯同步，直接返回 value，不再先 `throw Promise` 进 Suspense；
  - 只有 sync 尝试失败时，才回落到原来的 async Suspense 路径。
- 这条刀把 `react.bootResolve` 的 `suspend` 冷启动从 `~320ms` 级直接打到 `~17-19ms` 级。

## 改了什么

### 1) `ModuleCache.read(...)` 增加 optimistic sync fast-path

文件：`packages/logix-react/src/internal/store/ModuleCache.ts`

- `ModuleCacheLoadOptions` 新增：
  - `optimisticSyncBudgetMs?: number`
- `read(...)` 在 `policyMode === 'suspend' && optimisticSyncBudgetMs > 0` 时：
  - 先同步尝试 `this.runtime.runSync(factory(scope))`
  - 成功：直接创建 success entry 并返回 value
  - 失败：无缝回落到既有 async `throw promise` 路径
- 该 fast-path 的 trace 事件会额外标记：
  - `fastPath: 'sync'`

### 2) `useModule` / `useModuleRuntime` 把 policy 的 `syncBudgetMs` 下传给 suspend cache.read

文件：

- `packages/logix-react/src/internal/hooks/useModule.ts`
- `packages/logix-react/src/internal/hooks/useModuleRuntime.ts`

这样 `RuntimeProvider.policy.syncBudgetMs` 不再只给 sync 模式看，而是也能驱动 `suspend` 路径的“先试同步再降级”策略。

## 证据

### before（旧 broad matrix，仅作 triage 对照）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw90.i1-state-writeback-batched.full-matrix.json`

### after（targeted）

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw107.react-bootresolve-optimistic-sync.targeted.json`

### triage diff

- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw90-to-ulw107.m1-react-bootresolve-optimistic-sync.targeted.json`

说明：diff 是 triage 口径，因为中间穿过了后续 matrix hash 变化；但 `react.bootResolve` 自身的 suite 结构未变，结论依然清晰可信。

## 关键结果

`react.bootResolve` 的 `policyMode='suspend'` 下，`mountCycles=1` 的冷启动 p95：

- `ModuleImplReady`
  - `explicit + microtask`: `329.2ms -> 17.5ms`
  - `auto + microtask`: `317.2ms -> 16.8ms`
  - `explicit + none`: `325.8ms -> 19.2ms`
  - `auto + none`: `327.6ms -> 19.0ms`
- `ModuleTagReady`
  - 与 `ModuleImplReady` 同量级一起降到 `16.8~19.2ms`

这说明此前最大的成本根本不是模块本身初始化，而是“明明同步也先 Suspense 一次”的框架路径开销。

## 语义变化（明确接受）

在零存量用户 / forward-only 模式下，接受以下变化：

- `policy.mode='suspend'` 不再等于“必定进入 Suspense fallback”。
- 对于纯同步模块，`suspend` 现在会优先走同步直返；只有真 async 或 sync 尝试失败时才进入 Suspense。

这不是兼容层，而是新的默认语义：

- `suspend` 表示“允许挂起，但不强制挂起”。

## 回归验证

- `pnpm -C packages/logix-react typecheck:test`
- `pnpm -C packages/logix-react exec vitest run test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/react-boot-resolve.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw107.react-bootresolve-optimistic-sync.targeted.json`

新增回归：

- `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
  - 锁定：`policy.mode='suspend'` 下，纯同步的 `ModuleImpl + ModuleTag` 不应再进入 Suspense fallback。

## 裁决

- 这是目前最值钱的一刀之一，收益远大于继续抠 `txnLanes` 的亚毫秒尾巴。
- 后续如果还要继续压 React 冷启动，下一刀应该围绕：
  - 更系统地把 `suspend` 的 optimistic sync fast-path 扩展到 `defer` / preload 场景；
  - 或者继续削减 `ModuleCache` / `useModuleRuntime` 的 render-phase 样板成本。
