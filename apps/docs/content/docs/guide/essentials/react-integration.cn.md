---
title: React 集成
description: 挂载 runtime，获取实例，精确读取，并通过 dispatch 或领域 handle 写入。
---

React integration 使用一条 host route：

- `RuntimeProvider` 投影 runtime scope。
- `useModule(...)` 获取实例。
- `useSelector(...)` 用显式 selector 或 descriptor 读取。
- `useDispatch(...)` 派发 actions。
- Form handle 等领域 handle 暴露领域写入。

## Runtime provider

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

## Shared hosted instance

```tsx
const counter = useModule(Counter.tag)
```

## Local/keyed Program instance

```tsx
const editor = useModule(EditorProgram, { key: `editor:${id}` })
```

这替代了已移除的 local-module hook routes。

## Reads and writes

```tsx
const value = useSelector(counter, (state) => state.value)
const dispatch = useDispatch(counter)
```

不要使用无参数 `useSelector(handle)`。传入 exact selector。

## See also

- [RuntimeProvider](/cn/docs/api/react/provider)
- [useModule](/cn/docs/api/react/use-module)
- [useSelector](/cn/docs/api/react/use-selector)
