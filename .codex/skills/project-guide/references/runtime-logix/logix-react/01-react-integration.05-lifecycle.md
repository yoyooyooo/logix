# 5. 生命周期绑定 (Lifecycle Binding)

在 React 适配层，`useModule` 与 `useLocalModule` 体现了两种不同的“归属关系”：

## 5.1 全局 Module (Global Module)

在应用级 Runtime 中注册的 Module（例如通过 Root Module 的 `imports` 或 AppRuntime 提供的 Layer 挂载）是全局的：

```ts
// app-runtime.ts
const GlobalDef = Logix.Module.make("Global", { state: GlobalState, actions: GlobalActions });
const GlobalModule = GlobalDef.implement({ initial: { /* ... */ }, logics: [GlobalLogic] });

const RootModule = RootDef.implement({
  initial: { /* ... */ },
  imports: [GlobalModule],
  processes: [/* Coordinators / 长生命周期进程 */],
});

const appRuntime = Logix.Runtime.make(RootModule, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer),
});
```

子组件通过 `useModule(GlobalDef)` 消费，不需要管理其生命周期；Global Module 的 Scope 绑定到应用级 Runtime，由最外层的 `RuntimeProvider runtime={appRuntime}` 管理。

## 5.2 局部 Module (Local Module)

对于页面级或组件级状态，使用 `useLocalModule` 在当前组件下创建并持有 Module：

```ts
import { useLocalModule } from '@logixjs/react';

function UserForm({ userId }: { userId: string }) {
  // factory 需返回 Effect<ModuleRuntime>；deps 控制复用/重建
  const moduleRuntime = useLocalModule(() => makeUserFormModule(userId), [userId]);
  const values = useSelector(moduleRuntime, s => s.values);
  const dispatch = useDispatch(moduleRuntime);

  // ...
}
```

`useLocalModule` 也支持直接传入 `ModuleDef`（或显式的 `ModuleTag`）+ 配置：

```ts
const editor = useLocalModule(EditorModule, {
  initial: { content: "" },
  logics: [EditorLogic],
  deps: [docId]
});
```

> `deps` 决定何时重新创建局部 Module（类似 React `useMemo` 语义）；默认不会因为 `initial` 或 `logics` 引用变化自动重建，需要调用方显式传入。

这里 `UserForm` 组件是这棵 Module 的“宿主”，Module 的 Scope 与组件生命周期绑定：
组件卸载时，对应 Module Scope 会被关闭，所有挂在其上的 `forkScoped` 长逻辑会被安全中断。

> 约定：
>
> - 组件内读取 State 与派发 Action 推荐统一通过 `useModule(Impl)` 获取 Runtime 后再操作；
> - `useLocalModule` 作为底层 API 仍被保留，用于需要自定义 factory 的高级场景。
> - 组件外的业务逻辑 / Pattern 可以直接使用 `module.dispatch` / `module.getState`。

## 5.3 ModuleImpl 的双模式：同步 vs Suspense

在 React 集成层中，`ModuleImpl` 的消费主要通过 `useModule(Impl)` 完成。考虑到真实业务中既存在**纯同步模块**（只依赖内存状态）也存在**异步模块**（依赖 IndexedDB / 远程配置等），React 适配层对 ModuleImpl 提供了两种模式：

1. **默认：同步构建（基线模式）**

- 调用形态：
  - `const runtime = useModule(MyImpl)`
  - `const runtime = useModule(MyImpl, { deps })`
- 特性：
  - 使用 `Resource Cache` + `readSync` 在渲染阶段同步构建 `ModuleRuntime`；
  - 每个组件实例默认持有一份私有的 `ModuleRuntime`，通过内部的 `instanceKey` 保证在 StrictMode 下 key 不抖动；
  - 生命周期通过 `retain/release + 延迟 GC` 与组件绑定，卸载后相关 Scope 和 watcher 会被安全关闭；
  - 仅适用于“构建过程本身是同步的” ModuleImpl（即 `.layer` 不依赖异步初始化）。

2. **可选：Suspense 异步构建（高级模式）**

- 调用形态：

  ```ts
  const id = useId()

  const runtime = useModule(MyImpl, {
    suspend: true,
    key: `Local:${id}`,  // 显式提供稳定 Key
    deps: [userId],
  })
  ```

- 特性：
  - 使用 `Resource Cache` + `read` 在渲染阶段启动异步构建，并通过抛出 Promise 驱动 React Suspense；
  - 允许 ModuleImpl 的 `layer` 内部包含真正的异步初始化逻辑（如 IndexedDB、远程配置加载等）；
  - 构建完成后仍然通过 `retain/release + 延迟 GC` 管理 Scope 生命周期；
  - **必须显式提供稳定的 `key`**，用于标识该 ModuleImpl 实例的资源——这是运行时契约的一部分，而不是可选优化。

> 为什么异步模式必须显式 `key`？
>
> - React 的 `useId` 只承诺“最终提交到 DOM / Hydration 的 ID 在拓扑意义上稳定”，**不承诺在 Suspense 重试 / 并发中断 / 未提交分支中的中间值稳定**；
> - `ModuleCache` 需要一个“外部可控、跨渲染尝试稳定”的 Key，来判断“当前这次渲染是否在使用同一份局部 ModuleRuntime”，否则会出现“每次重试都创建新资源、永远命中不到已完成构建”的情况（表现为 Suspense fallback 一直 pending）；
> - 因此，在 `suspend: true` 模式下，Logix 规范要求调用方显式传入 `key`，通常建议：
>   - 在 **Suspense 边界外层** 调用 `useId()`，并通过 props 传给内部组件，作为组件级前缀；
>   - 再结合业务 ID（如 `userId` / `formId` / layout slot id）和 `deps`，构造出能在重渲染与重试之间保持稳定的 Key。
>
> 实现说明（当前 @logixjs/react 状态）：
>
> - 自 L9 重构后，`useModule(Impl, { suspend: true })` 在 **开发/测试环境中若省略 `key` 会立即抛出运行时错误**，提示调用方必须显式提供 `options.key`；
> - 这一行为旨在防止异步局部 Module 在 StrictMode + Suspense 下因为资源 key 抖动而出现“无限重建资源、永远 pending”的隐蔽问题；
> - 生产环境建议同样遵循该约束：所有使用 `suspend: true` 的调用都应按上文模式显式构造稳定 Key，使“资源身份”成为公共 API 的一部分，而不是依赖内部实现细节。

推荐最佳实践（局部异步 ModuleImpl）：

```ts
function AsyncLocalWidget({ userId }: { userId: string }) {
  const id = useId()

  const runtime = useModule(AsyncImpl, {
    suspend: true,
    key: `AsyncLocalWidget:${id}`,  // 组件级稳定 Key
    deps: [userId],                 // 业务依赖参与重建
  })

  const state = useSelector(runtime, s => s.state)
  const dispatch = useDispatch(runtime)

  // ...
}
```

> 约定：
>
> - **默认优先使用同步模式**：只要 ModuleImpl 构建不依赖异步步骤，优先保持 `useModule(Impl)` 的同步语义，获得更简单的调试体验；
> - **明确异步意图**：当确实需要异步 Layer 时，通过 `suspend: true + key` 明确声明，调用方需要负责组织好稳定 Key；
> - `useLocalModule` 仍然保留为底层 API，针对“模块级 Resource Cache”场景使用，`useModule(Impl)` 则是推荐的 UI 层入口。
