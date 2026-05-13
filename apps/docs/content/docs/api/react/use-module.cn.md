---
title: useModule
description: 在 React 中解析共享实例或局部实例。
---

`useModule` 用于在 React 中解析模块句柄。

当前 canonical 路线有两条：

- `useModule(ModuleTag)`，用于当前 runtime scope 中已托管的共享实例
- `useModule(Program, options?)`，用于局部实例或 keyed 实例

## 共享实例

```tsx
const counter = useModule(Counter.tag)
```

这条写法会从当前 runtime scope 中解析一个已经存在的共享实例。

## 局部实例或 keyed 实例

```tsx
const editor = useModule(EditorProgram, { key: "editor:42" })
```

这条写法会在当前 runtime scope 内创建或复用一个局部实例。

不传 `key` 时，实例身份绑定当前组件调用：

```tsx
const editor = useModule(EditorProgram)
```

这种写法适合同屏多个互不影响的副本。

传入相同 `key` 时，只在同一个 provider runtime scope 与同一个 `Program` 下复用：

```tsx
const editor = useModule(EditorProgram, { key: `editor:${id}` })
```

不同 provider runtime scope、不同 subtree layer scope 或不同 `Program`，即使 key 字符串相同，也不会复用同一个实例。

如果实例需要在最后一个 holder 卸载后短时间保留，设置 `gcTime`：

```tsx
const editor = useModule(EditorProgram, {
  key: `editor:${id}`,
  gcTime: 60_000,
})
```

窗口内重新挂载会复用原实例；窗口过后重新创建。

## 状态读取

状态读取继续留在 `useSelector(...)`：

```tsx
const counter = useModule(Counter.tag)
const count = useSelector(counter, (s) => s.count)
```

`useModule` 自身不负责订阅。

## Options

当第一个参数是 `Program` 时，`useModule` 接受：

- `key`
- `gcTime`
- `deps`
- `suspend`
- `initTimeoutMs`

这些选项都属于局部实例的创建与复用协议。
`key` 决定显式复用身份，`gcTime` 决定最后一个 holder 卸载后的保活窗口。

## 现有句柄

`useModule(ref)` 和 `useModule(runtime)` 用于接入一个已经存在的实例。
它们不会创建新的 `ModuleRuntime`。

## 说明

- `useLocalModule(...)`、`useLayerModule(...)`、`ModuleScope.make(...)` 都属于高级路线。
- `useModule(Module)` 已退出当前 canonical public route。

## 相关页面

- [RuntimeProvider](./provider)
- [useSelector](./use-selector)
- [useImportedModule](./use-imported-module)
- [ModuleScope](./module-scope)
