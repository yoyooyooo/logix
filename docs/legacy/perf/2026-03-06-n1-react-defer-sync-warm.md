# 2026-03-06 · N-1：`defer` 的 sync-warm first（去 provider preload gating fallback）

本刀是 M-1 的继续：既然 `suspend` 路径已经支持“同步可解时直接返回”，那么 `defer` 也不应该再强制先走一轮 provider preload gating fallback。

此前 `RuntimeProvider(policy.mode='defer')` 的行为是：

- 不管 preload handle 能不能同步构造；
- 都先把 `deferReady=false`，渲染 provider gating fallback；
- 然后在 `useEffect` 里异步 preload，完成后再放 children 进来。

对同步模块来说，这一层 gating fallback 本身就是主要成本。`react.deferPreload` 的旧 targeted 证据已经说明：

- `preloadEnabled=true` 也要 `~60ms`
- `preloadEnabled=false` 更是要 `~345ms`

这里的大头不是业务逻辑，而是“先挡一帧再说”的框架路径。

## 结论（已完成）

- `defer` 路径现在支持 **sync-warm first**：
  - 在首次 render 前，先用 `ModuleCache.warmSync(...)` 尝试把 preload handle 同步烫进缓存；
  - 如果所有需要的 preload handle 都同步可解，就直接跳过 `provider.gating(preload)` fallback；
  - 只有真 async / sync warm 失败时，才回到原来的 effect-driven preload gating。
- 结果：
  - `react.deferPreload` 的 `preloadEnabled=false` 从 `~345ms p95` 直接降到 `~60ms p95`
  - `react.defer.gatingFallbackRenders` 从 `1 -> 0`

## 改了什么

### 1) `ModuleCache` 新增 `warmSync(...)`

文件：`packages/logix-react/src/internal/store/ModuleCache.ts`

- `warmSync(...)` 只做一件事：
  - 尝试同步构造并把 success entry 写进 cache；
  - 若失败，只返回 `undefined`，**不缓存 error/pending**。
- 这是给 render-phase 的“同步预热探测”用的，不是正式 read/preload 生命周期入口。

### 2) `RuntimeProvider` 在 `defer` 首次 render 前先做 sync warm

文件：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`

- 新增 `preloadCache` 与 `syncWarmPreloadReady`
- 对 `resolvedPolicy.preload.handles`：
  - `ModuleImpl` 走 `warmSync(key, factory, ...)`
  - `ModuleTag` 也走 `warmSync(key, factory, ...)`
- `isReady` 现在允许：
  - `deferReady || syncWarmPreloadReady`
- `useEffect` 里的 async preload 如果发现 `syncWarmPreloadReady=true`，会直接跳过原来的 preload gating 路径。

### 3) 语义变化

在零存量用户 / forward-only 模式下，接受以下新默认：

- `policy.mode='defer'` 不再等于“必定先 provider fallback 再放 children”。
- 对同步可解的 handle：
  - `defer` 现在等价于“先同步预热，再直接渲染 children”；
  - 只有真 async 的 preload 才会保留 provider gating fallback。

## 证据

### before

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw109.react-defer-preload-optimistic-sync.targeted.json`

### after

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw110.react-defer-preload-sync-warm.targeted.json`

### diff

- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw109-to-ulw110.n1-react-defer-preload-sync-warm.targeted.json`

## 关键结果

### 1) `preloadEnabled=false` 直接打穿

- `e2e.bootToReadyMs`: `344.8ms -> 60.1ms` (`p95`)
- 这说明此前最大的成本不是“没有 preload”，而是 provider 自己先挡一帧 gating fallback。

### 2) gating fallback 被移除

- `react.defer.gatingFallbackRenders(points)`: `1 -> 0`
- 这是本刀最核心的证据：同步可解的 `defer` 不再需要 provider preload gating。

### 3) `preloadEnabled=true` 基本持平

- `60.5ms -> 61.8ms`，属于噪声级别回摆。
- 这也反过来说明：在同步模块场景下，“preloadEnabled=true” 的优势以前主要只是帮你绕过那层 gating fallback；现在 fallback 已经没了，所以两边自然靠拢。

## 回归验证

- `pnpm -C packages/logix-react typecheck:test`
- `pnpm -C packages/logix-react exec vitest run test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/react-defer-preload.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw110.react-defer-preload-sync-warm.targeted.json`
- `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw109.react-defer-preload-optimistic-sync.targeted.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw110.react-defer-preload-sync-warm.targeted.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw109-to-ulw110.n1-react-defer-preload-sync-warm.targeted.json`

新增回归：

- `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
  - 新增 `defer+preload` 场景：同步可解的 handles 不应再进入 provider fallback。

## 裁决

- 这刀值得保留。
- 它把 `defer` 从“先挡一帧再说”的保守模式，推进成“同步可解就直接放行”的前向语义。
- 后续如果继续沿 React 冷启动这条线压榨，下一刀应该考虑：
  - 把 `defer` / `suspend` / `sync` 三个模式进一步合并成“统一 resolve policy + fast-path/hard-fallback surface”，减少策略分叉。
