---
title: React 集成（启动策略与冷启动优化）
---

在 React 中使用 Logix 时，请先把 `RuntimeProvider` 放到组件树的边界（通常是 App 根或路由 Layout）。所有 `@logix/react` 的 hooks 都必须在 Provider 子树内调用。

## 统一入口：只用一个 `fallback`

推荐始终提供 `fallback`，它会同时覆盖：

- Provider 需要等待配置/依赖就绪
- `suspend`/`defer` 策略下的挂起与延后

```tsx
<RuntimeProvider runtime={runtime} fallback={<Loading />}>
  <App />
</RuntimeProvider>
```

开发/测试环境下，如果你未提供 `fallback`，`RuntimeProvider` 会渲染一个默认 fallback（带计时与提示）。同时：等待明显偏长时会输出可行动的控制台告警；如果 Suspense fallback 很短但造成闪烁，也会输出提示帮助你决定是否切到 `sync`。生产环境中默认 fallback 仍为 `null`。

## Fallback 文案对应的阶段

默认 fallback（或你自定义的 fallback）通常会遇到两类等待，它们代表不同的“卡住点”：

- `Logix 运行时准备中…`：Provider 仍在等待运行时就绪（Layer / Config / `defer` 模式下的 `preload`）。这时子树尚未 mount。
- `Logix 模块解析中…`：子树已开始渲染，但某个模块在 `suspend` 路径下触发了 React Suspense（模块解析/初始化）。这时子树会被 `<Suspense>` 挂起，直到模块就绪。

排查建议（优先级从高到低）：

- 先确认浏览器连的是“当前正在跑”的 dev server（避免同时起多个 Vite/preview 导致命中旧 bundle）。
- `运行时准备中…` 偏长：优先缩减 Layer/Config 初始化成本，或用 `defer + preload` 把关键模块提前准备好。
- `模块解析中…` 一直不结束：把模块加入 `preload`，或配置 `logix.react.init_timeout_ms` 让超时变成显式错误，便于定位。

## 启动策略：`policy.mode`

`RuntimeProvider` 支持三种模式：

- `suspend`（默认）：优先避免渲染期同步阻塞；适合大多数业务页面
- `sync`：确定性优先；适合测试/诊断或明确知道“不会卡”的场景
- `defer`：延后冷启动；通过 Provider gating + 可选 `preload` 把关键初始化移到 commit 后

```tsx
// 确定性优先：同步解析（适合测试/诊断）
<RuntimeProvider runtime={runtime} policy={{ mode: 'sync' }} fallback={<Loading />}>
  <App />
</RuntimeProvider>

// 延后冷启动：先显示 fallback，commit 后 preload，ready 后再 mount 子树
<RuntimeProvider runtime={runtime} policy={{ mode: 'defer', preload: [CounterImpl] }} fallback={<Loading />}>
  <App />
</RuntimeProvider>
```

## `defer + preload` 的保证边界

`defer` 只保证 `preload` 列表里的模块在子树 mount 时就绪。未预加载的模块仍可能在首次 `useModule` 时触发挂起（表现为二次 fallback），属于预期。

排查建议：

- 把卡顿/闪烁对应的模块加入 `preload`
- 或切回默认 `suspend`（让挂起更早发生，避免同步阻塞）

## Key 策略：何时需要显式 `key`

默认情况下，`useModule(Impl)` 会在 Provider 的默认策略下自动选择合适的解析路径，并使用组件级稳定 key（避免你到处手写样板）。

仅在需要“跨组件共享同一实例 / 明确分片语义”时，再显式传 `key`：

```tsx
const sessionA = useModule(SessionImpl, { key: 'SessionA' })
const sessionB = useModule(SessionImpl, { key: 'SessionB' })
```

## 局部状态：useLocalModule（同步）

当你只是想把组件内的 `useState/useReducer` 收敛到 Logix（例如编辑器 UI 状态、表单草稿、临时开关），推荐用 `useLocalModule`：

- **总是同步创建**：不会触发 Suspense，也不受 `policy.mode` 控制。
- **不要在构造阶段做 I/O**：需要异步初始化（读存储/请求数据等）时，把异步放进模块 Logic（Effect）里，或提升为 `useModule(Impl)` 配合 `suspend/defer+preload`。

延伸阅读：

- [API: useLocalModule](../../api/react/use-local-module)
- [配方：React 集成](../recipes/react-integration)

## 全局默认配置：ConfigProvider（`logix.react.*`）

`@logix/react` 会从 Effect 的 `ConfigProvider` 读取一组全局默认配置（作用域是当前 `ManagedRuntime`）。你可以在创建 Runtime 时一次性注入：

```tsx
import { ConfigProvider, Layer, ManagedRuntime } from 'effect'
import { RuntimeProvider } from '@logix/react'

const ReactConfigLayer = Layer.setConfigProvider(
  ConfigProvider.fromMap(
    new Map<string, string>([
      ['logix.react.gc_time', String(5 * 60_000)],
      ['logix.react.init_timeout_ms', '30000'],
    ]),
  ),
)

const runtime = ManagedRuntime.make(Layer.mergeAll(ReactConfigLayer, AppLayer) as Layer.Layer<any, never, never>)

export function Root() {
  return (
    <RuntimeProvider runtime={runtime} fallback={<Loading />}>
      <App />
    </RuntimeProvider>
  )
}
```

常用键：

- `logix.react.gc_time`：默认模块实例的保活窗口（毫秒）；调大可减少路由切换后的冷启动与 fallback 闪烁。
- `logix.react.init_timeout_ms`：`suspend` 模式下初始化的超时上限（毫秒）。

## 常见告警：渲染期同步阻塞

当检测到渲染阶段发生明显的同步初始化阻塞时，开发/测试环境会输出可行动的告警。通常的修复路径：

- 优先使用默认 `suspend`（并提供 `fallback`）
- 在 `defer` 下补齐 `preload`
- 必要时切换到 `sync` 以定位阻塞来源（再回到 `suspend/defer` 做治理）

## 事务车道（Txn Lanes）：交互 p95 治理入口

当你遇到“输入/点击频繁时明显卡顿”，且卡顿主要来自**事务之后的补算/派生/通知**拖尾（backlog），可以启用 Txn Lanes 让关键交互优先完成、后台补算可延后但有上界。

- 详细说明与启用/回退/验证：见 [事务车道（Txn Lanes）](../advanced/txn-lanes)
- 注意：Txn Lanes 延后的是 Logix 内部 follow-up work，不等同于 React 的 `startTransition`（它延后的是渲染调度）；两者可组合但不能互相替代。
