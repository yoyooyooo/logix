# 1. 核心 API: Store Hooks

React 适配层围绕三类 Hooks 暴露能力：

- `RuntimeProvider`：React 集成的 **唯一入口**（运行时 + 策略 + 统一 fallback）；所有 hooks 必须在其子树内调用；
- `useModule(handle)`：获取对应 Module 的 `ModuleRef`（包含 `runtime/dispatch/actions/dispatchers`；`runtime` 引用稳定，且该重载不订阅状态更新）；
  - 支持 `ModuleDef`（定义对象）、`Module`（wrap，含 `.impl`）、`ModuleImpl`（局部实现）、`ModuleTag`（全局实例）、`ModuleRuntime`（直接复用）或 `ModuleRef`（直接复用）。
- `useModule(handle, selector, equalityFn?)`：**[推荐]** 直接订阅状态，内部基于 `useSyncExternalStore`，可传入自定义 `equalityFn`；
- `useSelector(handle | runtime, selector, equalityFn?)`：在已有 Runtime 或 Module Tag 上做细粒度订阅；
- `useDispatch(handle | runtime)`：获取稳定的 `dispatch` 函数，自动复用当前 React Runtime。
- `useImportedModule(parent, childModule)`：**[分形模块]** 从“父模块实例的 imports scope”解析子模块实例（避免多实例场景串用全局 registry）。

这三者构成连接 React 与 Logix 领域模块的基础桥梁。

## 1.0 RuntimeProvider：启动/解析策略与统一 fallback

`RuntimeProvider` 的目标是把 React 集成的“冷启动/解析策略”收敛到一个入口：业务只需要记住 **一个** `fallback`，并通过 `policy` 明确选择语义。

推荐用法（默认策略：`suspend`，并提供统一 `fallback`）：

```tsx
<RuntimeProvider runtime={runtime} fallback={<Loading />}>
  <App />
</RuntimeProvider>
```

### 1.0.1 `policy.mode`（三态）

- `mode: "suspend"`（默认）：ModuleImpl init / ModuleTag resolve 默认走 Suspense 友好的路径；可配合 `yield` 避免 render-phase 同步阻塞。
- `mode: "sync"`：确定性优先；模块解析默认走同步路径（不依赖 Suspense）。适合测试/诊断；可配合 `syncBudgetMs` 控制 Provider 的同步读取尝试。
- `mode: "defer"`：延后冷启动；通过 Provider gating + 可选 `preload` 把关键模块初始化搬到 commit 后，ready 后再 mount 子树。

### 1.0.2 `fallback`（只用一个）

当满足任一条件时，Provider 会显示同一个 `fallback`：

- `layer` 尚未就绪；
- Provider 配置快照尚未就绪；
- `policy.mode !== "sync"` 且子树 Suspense 挂起；
- `policy.mode === "defer"` 且 preload 尚未完成（gating）。

### 1.0.3 `defer + preload` 的保证边界

`defer` 只保证 `preload` 列表内模块在子树 mount 时就绪；未 preload 的模块仍可能在子组件首次 `useModule` 时触发 Suspense（表现为二次 fallback），属于预期。

示例：

```tsx
<RuntimeProvider
  runtime={runtime}
  policy={{ mode: 'defer', preload: [CounterImpl] }}
  fallback={<Loading />}
>
  <App />
</RuntimeProvider>
```

### 1.0.4 `yield`（cooperative yield）与“首次”记忆

在 `suspend/defer` 场景下，Provider 会把 `policy.yield` 下发给 `useModule`/`useModuleRuntime` 的默认路径：

- `yield.strategy`: `"microtask" | "macrotask" | "none"`（默认 `microtask`）；
- `yield.onlyWhenOverBudgetMs`: 仅当历史初始化耗时超过阈值时才启用 yield；但 **首次运行仍会强制 yield**，且“首次”语义以 runtime/session 维度记忆（对 remount/HMR 更鲁棒）。

> **022 Module 语义补充（局部 vs 全局）**
>
> - `useModule(module)`：默认等价于 `useModule(module.impl)`（局部/会话级创建与缓存）。
> - `useModule(module.tag)`：从 `RuntimeProvider` 解析全局实例（用于显式单例语义）。
> - `useModule(moduleDef)`（无 `.impl` 的定义对象）：等价于 `useModule(moduleDef.tag)`（全局实例语义）。

## 1.1 Module（定义对象）+ ModuleImpl：推荐的模块实现单元

为了简化 React 侧的模块消费，当前主线引入了 `ModuleImpl` 概念：将模块蓝图、初始状态、Logic 列表和依赖环境打包为一个“实现单元”。

**定义 ModuleImpl**:

```typescript
// 1. 定义 Module (Shape + Logic Factory)
export const RegionDef = Logix.Module.make("RegionModule", { state, actions })
export const RegionLogic = RegionDef.logic<RegionService>(/* ... */)

// 2. 构造 Impl (绑定 Initial + Logic)
export const RegionModule = RegionDef.implement({
  initial: { province: null, city: null, isLoading: false },
  logics: [RegionLogic]
})
```

**在 React 中消费**:

```tsx
function RegionPage() {
  // 自动处理 Scope、Layer 构建和依赖注入
  const region = useModule(RegionModule) // 等价：useModule(RegionModule.impl)

  const province = useSelector(region, s => s.province)
  // ...
}
```

相比旧的 `useLocalModule(factory)`，`ModuleImpl` 模式让 UI 代码更干净，且类型推导更完整。

```tsx
import { useModule, shallow } from "@logix/react"
import { MyDef } from "./module"

function MyComponent() {
  const count = useModule(MyDef, (s) => s.count)

  const { name, age } = useModule(
    MyDef,
    (s) => ({ name: s.user.name, age: s.user.age }),
    shallow,
  )

  const runtime = useModule(MyDef)

  return (
    <button onClick={() => runtime.dispatch({ _tag: "increment" })}>
      Count: {count}
    </button>
  )
}
```

> 关于在 Logic 内部挂 watcher（`Effect.all + run` / `Effect.forkScoped` / `runFork`）以及它们与 Scope / 生命周期的关系，可以在产品文档中参阅《Watcher 模式与生命周期》一节；React 场景下的行为与核心引擎保持一致。

## 1.2 分形模块（imports）：在父实例 scope 下读取/派发子模块

当一个子模块（例如 `Query`）通过 `imports: [Child.impl]` 被挂载到多个不同的父模块实例上时：

- **父模块实例 ≈ 子模块实例的作用域锚点**；
- 组件侧如果直接 `useModule(Child.tag)`，拿到的是“当前运行环境（RuntimeProvider 链）”下的 ModuleTag 单例语义，无法表达“属于哪个父实例”的绑定；
- 推荐使用 `useImportedModule(parent, Child.tag)` 以显式绑定到父实例 scope。

```ts
import { useModule, useImportedModule, useSelector } from "@logix/react"

const host = useModule(HostModule, { key: "SessionA" })
const child = useImportedModule(host, Child.tag)

const status = useSelector(child, (s) => s.status)
```

也可以使用链式语法糖（推荐）：

```ts
import { useModule, useSelector } from "@logix/react"

const host = useModule(HostModule, { key: "SessionA" })
const child = host.imports.get(Child.tag)

const status = useSelector(child, (s) => s.status)
```

如果 `host` 需要跨多层组件使用（例如“路由 Host + 多个弹框”），推荐用 `ModuleScope` 把 “创建 host 实例 + Context Provider + useHost()” 打包成可复用的 Scope，避免 props 透传：

```ts
import { ModuleScope } from "@logix/react"

export const HostScope = ModuleScope.make(HostModule.impl, { gcTime: 0 })
```

- 边界处挂：`<HostScope.Provider options={{ scopeId: "SessionA" }}>...`
- 子组件拿 host：`const host = HostScope.use()`
- 子组件直接拿 imports 子模块：`const child = HostScope.useImported(Child.tag)`

注意：

- “父实例 scope” 通常来自 `useModule(HostModule, { key })` / `useModule(HostModule)` / `useLocalModule(HostDef, { initial, ... })`；避免用 `useModule(HostDef)` / `useModule(HostDef.tag)`（全局单例语义）作为 parent 再去解析 imports；
- `useImportedModule` / `host.imports.get(...)` 是 strict-only：只能从 `parent` 的 imports scope 解析；缺失即抛错（dev/test 下给出可读提示），避免“悄悄读到另一个实例”；
- `host.imports.get(Child.tag)` 返回稳定的 `ModuleRef`，可直接写在组件 render 内（无需 `useMemo`）；如偏好显式 memo，可使用 `useImportedModule(host, Child.tag)`；
- 编排/转发建议：父模块 Logic 内优先使用 `$.use(Child)`（同一实例 scope 的 DI 语义）进行编排，UI 仍只依赖父模块；仅当 UI 需要直连子模块 state/dispatch 时使用 `host.imports.get(...)`；
- 深层 imports（3 层+）避免在组件里到处“爬树”：优先在边界 resolve 一次把 `ModuleRef` 往下传，或把常用模块提升为 Host 的直接 imports；必要时将子模块的最小 view 投影到父模块 state 再由 UI 消费。
- 若你刻意使用 root/global 单例语义：使用 `useModule(Child.tag)`（受 RuntimeProvider.layer 影响，最近 wins）；或在 Effect 边界使用 `Logix.Root.resolve(Child.tag)`（固定 root provider，忽略局部 override）；在 Logic 内则使用 `yield* $.root.resolve(Child.tag)` 明确表达“我要 root 单例”。
