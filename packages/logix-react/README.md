# @logixjs/react

> Logix Runtime 的 React 适配层（Alpha 阶段：仓库内 API 已稳定，正式发版前仍可能微调）。

## 功能亮点

- **RuntimeProvider**：
  - `runtime={Logix.Runtime.make(root, { layer })}` 启动完整应用 Runtime，并自动注入 `ReactPlatformLayer`（推荐用法；`root` 可为 program module 或其 `.impl`）；
  - `layer={Layer}` 在父 Runtime 上叠加局部服务（页面/组件级 DI）；
  - `runtime` / `value` 直接复用已有 `ManagedRuntime`，常用于测试或集成场景。
- **并发安全的 Hooks**：`useModule` 返回稳定的 `ModuleRuntime`；`useModule(handle, selector)` / `useSelector(handle | runtime, selector, equalityFn?)` 基于 `useSyncExternalStore` 实现，默认 `Object.is` 比较，可自定义 `equalityFn`，避免并发渲染撕裂。
- **稳定派发器**：`useDispatch(handle | runtime)` 复用当前 Runtime Scope，保证回调引用稳定。
- **局部模块（实验特性）**：`useLocalModule` 让 Module Scope 绑定到组件生命周期，适合表单/页面级状态。

## 快速上手

```tsx
import { RuntimeProvider, ReactPlatformLayer } from "@logixjs/react"
import * as Logix from "@logixjs/core"
import { Layer } from "effect"

const RootDef = Logix.Module.make("Root", { state: RootState, actions: RootActions })
const RootModule = RootDef.implement({
  initial: { /* ... */ },
  imports: [/* ModuleImpls / Service Layers */],
  processes: [/* Coordinators / Links */]
})

const appRuntime = Logix.Runtime.make(RootModule, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer)
})

export function App() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <Router />
    </RuntimeProvider>
  )
}
```

在组件中使用 Hooks：

```tsx
import { useModule, useSelector, useDispatch } from "@logixjs/react"

function Counter() {
  const runtime = useModule(CounterModule)
  const count = useModule(CounterModule, (s) => s.count)
  const dispatch = useDispatch(runtime)

  return <button onClick={() => dispatch({ _tag: "inc" })}>{count}</button>
}
```

## 文档与规划

详细规范见 `.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.md`，关键目标包括：

1. React 组件只负责意图事件，所有状态/流程逻辑收敛到 Logix 模块；
2. Hooks 必须兼容 Concurrent Mode（`useSyncExternalStore`）并提供稳定 Runtime 引用；
3. RuntimeProvider 的 `runtime + layer` 组合与 Effect `Layer` 语义一致，方便 LLM / 工具链自动推断依赖注入。

更多迁移策略、生命周期说明以及 ReactPlatform 细节，请参阅上述规范文档。
