---
title: React integration recipe
description: 挂载 runtime、解析模块实例，并把读取与写入保持在 canonical host route。
---

当前 canonical React 配方是：

1. 构造 runtime
2. 用 `RuntimeProvider` 挂载
3. 用 `useModule(...)` 解析实例
4. 用 `useSelector(...)` 读取
5. 用 `useDispatch(...)` 或句柄写入

## Runtime

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})

const runtime = Logix.Runtime.make(CounterProgram)
```

开发期 HMR 下，通过能持有 lifecycle replacement 的应用边界创建这个 runtime。该边界统一使用当前第一波 decision：有 successor runtime 时 `reset`，没有 successor 时 `dispose`。

在开发工具层单点开启 host carrier：

```ts
// vite.config.ts
import { logixReactDevLifecycle } from "@logixjs/react/dev/vite"

export default defineConfig({
  plugins: [logixReactDevLifecycle(), react()],
})
```

## Provider

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

`RuntimeProvider` 只投影 runtime。它不选择 program，也不持有热更新 lifecycle truth。

## 共享实例

```tsx
const counter = useModule(Counter.tag)
```

## Keyed 实例

```tsx
const form = useModule(FormProgram, { key: "form:checkout" })
```

## 读取

```tsx
const count = useSelector(counter, (s) => s.count)
```

## 写入

```tsx
const dispatch = useDispatch(counter)
dispatch({ _tag: "increment", payload: undefined })
```

## Imported children

```tsx
const host = useModule(HostProgram, { key: "session-a" })
const child = host.imports.get(ChildModule.tag)
```

## 高级路线

高级路线仍然可用：

- `useLocalModule(...)`
- `useImportedModule(...)`
- `ModuleScope`

但它们不替代 canonical host route。

## 开发期 HMR

- owner 收敛在 runtime 创建边界。
- host dev lifecycle carrier 只开启一次；普通模块和组件不应导入它。
- 不在组件或 demo 内散落 HMR cleanup。
- 状态保活不进入当前波次；当前可恢复路径是 reset-first。
- 热更新生命周期诊断使用既有 evidence event：`runtime.hot-lifecycle`。

## 相关页面

- [RuntimeProvider](../../api/react/provider)
- [useModule](../../api/react/use-module)
- [useSelector](../../api/react/use-selector)
