---
title: useLocalModule
description: API Reference for useLocalModule hook
---

# useLocalModule

`useLocalModule` 是 `useModule` 的一个变体，专门用于强制创建组件局部的 Module 实例。

## Usage

```tsx
import { useLocalModule } from '@logix/react'
import { FormImpl } from './modules/form'

function FormComponent() {
  // 每次渲染 FormComponent 都会创建一个独立的 Form 模块实例
  const form = useLocalModule(FormImpl)

  // ...
}
```

## API

### `useLocalModule(impl, options?)`

- **`impl`**: `ModuleImpl` - 模块实现。
- **`options`**: `UseModuleOptions` (可选)
  - **`key`**: `string` - (可选) 在同一组件内区分多个实例。

## Differences from `useModule`

- **Scope**: `useLocalModule` 总是创建一个新的 Scope，绑定到当前组件的生命周期。
- **Isolation**: 即使多个组件使用同一个 `ModuleImpl`，`useLocalModule` 也会保证它们拥有独立的 State 和 Logic 实例。
