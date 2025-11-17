---
title: useLocalModule
description: API Reference for useLocalModule hook
---

# useLocalModule

`useLocalModule` 用于在组件内创建一个“局部模块实例”（每个组件实例独立），典型用来承载只在该组件/页面内使用的 UI 状态（替代 `useState` / `useReducer`）。

特性：

- **同步创建**：不会触发 React Suspense，也不受 `RuntimeProvider` 的 `policy.mode` 控制。
- **生命周期绑定组件**：mount 创建，unmount 自动释放（Scope/资源一起关闭）。
- **不跨组件共享**：即使传入相同 `key`，也不会让不同组件复用同一个实例。

## Usage（推荐：ModuleTag 形式）

```tsx
import * as Logix from '@logix/core'
import { useDispatch, useLocalModule, useSelector } from '@logix/react'
import { Schema } from 'effect'

const LocalForm = Logix.Module.make('LocalForm', {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
  reducers: {
    change: (state, action) => ({ ...state, text: action.payload }),
  },
})

export function LocalFormComponent() {
  const form = useLocalModule(LocalForm, { initial: { text: '' } })
  const text = useSelector(form, (s) => s.text)
  const dispatch = useDispatch(form)

  return <input value={text} onChange={(e) => dispatch({ _tag: 'change', payload: e.target.value })} />
}
```

## API

### `useLocalModule(module, options)`

- `module`：`Logix.Module.make(...)` 的返回值（或其 `.tag`）
- `options.initial`（必填）：初始状态
- `options.logics`（可选）：额外安装的 `ModuleLogic` 列表
- `options.deps`（可选）：用于“失效并重建实例”的依赖数组（推荐只放原始值）
- `options.key`（可选）：在同一组件内区分多个局部实例/便于诊断；不会跨组件共享

### `useLocalModule(factory, deps?)`

- `factory`：`() => Effect<ModuleRuntime, ...>`（必须能同步构建；不要在这里做 I/O）
- `deps`：同 `options.deps`

## 何时不要用 useLocalModule

- **需要异步初始化 / 想用 defer+preload**：用 `useModule(Impl)` 或 `useModuleRuntime(Tag)`，交给 `RuntimeProvider` 的策略控制（并配置 `logix.react.init_timeout_ms` 兜底）。
- **需要跨组件共享同一实例**：用 `useModule(Impl, { key })`（或上移到路由/根组件创建并向下传递句柄）。
