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

## 3. Suspense Integration (未来规划)

支持 `useSuspenseSelector`，允许组件在 Logix 数据尚未就绪（如异步加载中）时挂起。

```typescript
// 这是一个 Effect，可能会挂起
const data = useSuspenseSelector(store, async (state) => {
  if (!state.data) throw Promise.resolve(); // 简化的挂起逻辑
  return state.data;
});
```

这需要 Logix 支持 **"Promise-based State Access"**，目前暂列为 Phase 2 特性。
