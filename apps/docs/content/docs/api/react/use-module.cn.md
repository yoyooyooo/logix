---
title: useModule
description: 在 React 中解析已托管实例，或创建 local/keyed Program 实例。
---

`useModule(...)` 是 React 的实例获取 hook。

## 共享托管实例

当前 runtime 已经托管该实例时，使用 Module tag：

```tsx
const counter = useModule(Counter.tag)
```

这会从当前 `RuntimeProvider` scope 读取实例。

## Local 或 keyed Program 实例

当组件或路由需要自己的实例时，使用 Program：

```tsx
const editor = useModule(EditorProgram)
```

如果多个组件要在同一 runtime scope 内共享同一个局部实例，添加 key：

```tsx
const editor = useModule(EditorProgram, {
  key: `editor:${id}`,
  gcTime: 60_000,
})
```

`gcTime` 会在最后一个 holder 卸载后继续保留实例一段时间；窗口期内 remount 会复用它。

## Suspense mode

显式使用 suspense 时，提供稳定 key：

```tsx
const editor = useModule(EditorProgram, {
  key: `editor:${id}`,
  suspend: true,
  initTimeoutMs: 5_000,
})
```

## Reads and writes

`useModule(...)` 本身不读取 state。

```tsx
const counter = useModule(Counter.tag)
const value = useSelector(counter, (state) => state.value)
const dispatch = useDispatch(counter)
```

## 已移除路线

不要对裸 module object 使用 `useModule(Module)`。不要使用已移除的 `useLocalModule`、`useModuleList` 或 `ModuleScope` 路线。使用 `useModule(Program, options)` 和普通组件组合。

## See also

- [RuntimeProvider](./provider)
- [useSelector](./use-selector)
- [useDispatch](./use-dispatch)
- [useImportedModule](./use-imported-module)
