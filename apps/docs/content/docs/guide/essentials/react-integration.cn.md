---
title: React integration
description: 挂载 runtime、解析模块实例，并在共享实例与局部实例路线之间做选择。
---

React 集成建立在一条 host route 上：

- 通过 `RuntimeProvider` 挂载 runtime
- 通过 `useModule(...)` 解析实例
- 通过 `useSelector(...)` 读取
- 通过 `useDispatch(...)` 或句柄本身写入

## RuntimeProvider

把 `RuntimeProvider` 放在子树边界：

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

`@logixjs/react` 的 hooks 都必须运行在这个子树内。

`RuntimeProvider` 投影一个已有 runtime。创建 runtime 的边界持有生命周期。开发期 HMR 下，该 owner 在替换时执行 `reset`，无 successor 时执行 `dispose`。

开发期 HMR 在组件代码外开启。dev lifecycle carrier 只需要在宿主边界配置一次，例如 Vite 中的 `logixReactDevLifecycle()`，或测试 setup 里的 `installLogixDevLifecycleForVitest()`。普通 React 代码继续使用 `RuntimeProvider`。

热更新生命周期诊断使用既有 `runtime.hot-lifecycle` evidence event。

## 共享实例

在 runtime 已经托管共享实例时，使用：

```tsx
const module = useModule(ModuleTag)
```

## 局部实例或 keyed 实例

当某个子树需要自己的实例或 keyed session instance 时，使用：

```tsx
const module = useModule(Program, { key: "session-a" })
```

## 读取与写入

读取继续留在：

- `useSelector(...)`

写入继续留在：

- `useDispatch(...)`
- `handle.dispatch(...)`

## 启动策略

`RuntimeProvider` 可以通过这些 props 控制启动行为：

- `fallback`
- `policy`
- `layer`

这些 props 影响启动与局部环境 wiring。
它们不定义第二条 host law。

它们也不会让 `RuntimeProvider` 成为热更新 lifecycle owner。host cleanup 可以进入诊断摘要，但 owner decision 仍由 runtime 创建边界负责。

## 高级路线

高级路线包括：

- `useLocalModule(...)`
- `useImportedModule(...)`
- `ModuleScope`

它们仍然有效，但不属于最小的默认路径。

## 相关页面

- [RuntimeProvider](../../api/react/provider)
- [useModule](../../api/react/use-module)
- [useSelector](../../api/react/use-selector)
