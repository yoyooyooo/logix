# 并发渲染支持 (Concurrent Rendering)

> **Status**: Draft
> **Layer**: React Adapter

React 18+ 引入了并发渲染特性 (Concurrent Features)，这对外部状态库提出了新的挑战。本层必须确保 Logix 与 React 的并发机制和谐共存。

## 1. Tearing Prevention (防止撕裂)

在并发渲染中，React 可能会在一次渲染过程中多次暂停和恢复。如果外部 Store 的状态在此期间发生了变化，可能会导致组件树的不同部分渲染出不一致的数据（Tearing）。

**解决方案**: 严格使用 `useSyncExternalStore`。

*   它会在渲染期间强制 React 同步读取外部 Store。
*   如果在渲染过程中 Store 发生变化，React 会丢弃当前的渲染树并重新开始，确保一致性。

## 2. Transition Support (过渡支持)

有时我们希望 Logix 的状态更新被视为“低优先级”的（例如：搜索框输入导致的大列表过滤），以免阻塞用户输入。

**API**: `useTransitionDispatch`

```typescript
const [isPending, startTransition] = useTransition();
const dispatch = useDispatch(store);

const handleSearch = (e) => {
  // 将 Logix 的更新标记为 Transition
  startTransition(() => {
    dispatch({ type: 'SEARCH', query: e.target.value });
  });
};
```

**注意**: 这需要 Logix 的 `set` 操作能够配合 React 的批处理机制。目前的 Logix 实现是同步通知的，这通常兼容 React 的自动批处理。但在 `startTransition` 中，我们需要确保 Logix 的通知回调是在 React 的上下文中执行的。

## 3. Suspense Integration (Implemented)

Logix v3 已通过 **Module Resource Cache** 模式实现了对 Suspense 的支持，主要针对 **Module Runtime 的异步构建** 场景。

> **Strategy**: **Resource Cache (Render-as-you-fetch style)**

通过 `useModule(Impl, { suspend: true, key })`：

1.  **Acquire**: 在 Render 阶段读取 Cache，若未命中则立即启动异步构建（Layer.build），并抛出 Promise；
2.  **Retain**: 组件 Commit 后增加引用计数，锁定资源；
3.  **Release**: 组件卸载或依赖变更时释放引用，触发延迟 GC。

```typescript
// 异步模块定义 (Layer 包含异步初始化)
const AsyncImpl = MyModule.implement({ ... });

function MyComponent() {
  // 显式启用 suspend 模式，并提供稳定 Key
  const runtime = useModule(AsyncImpl, {
    suspend: true,
    key: "unique-id",
    deps: []
  });

  // runtime 在此处已就绪
  const data = useSelector(runtime, s => s.data);
  return <div>{data}</div>;
}
```

注意：目前 Suspense 主要用于 **Module 加载阶段**。对于 **数据加载（Data Fetching）**，推荐在 Logic 内部处理状态（Loading/Error/Data），UI 层通过 Selector 消费状态，而不是让 Selector 抛出 Promise（虽然技术上可行，但会导致 Waterfall 问题）。
