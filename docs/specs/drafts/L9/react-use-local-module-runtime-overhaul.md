---
title: React useLocalModule 重构草案（Scope 与并发安全）
status: draft
version: 2025-12-03
value: core
priority: next
---

## 背景与动机

`@logix/react` 当前提供的 `useLocalModule` 实现，采用的是：

- 在 `useMemo` 中通过 `runtime.runSync(Scope.make)` + `runtime.runSync(buildEffect)` 同步构建本地 `ModuleRuntime`；
- 在 `useEffect` 的 cleanup 中关闭 `Scope`（`Scope.close(scope, Exit.void)`）；
- 组件渲染路径上假定构建过程是同步且不会被 React 丢弃。

这带来几个问题：

1. **React 并发模式 / StrictMode 下的 Scope 泄漏风险**  
   - 在未 commit 的渲染路径中，`useMemo` 的副作用（`Scope.make` / `buildEffect`）已经执行，但对应的 `useEffect` 不会被调用；  
   - 导致这一次渲染分支中创建的 Scope 与挂在其上的 Fiber 永远没有机会被关闭。
2. **Render 阶段副作用与 Effect 语义冲突**  
   - 创建 Scope 和运行 Module 构建逻辑本质上是 Effect 侧的“资源获取 + 长生命周期 watcher 启动”；  
   - 挤在 render 中执行违背 React 推荐实践，也不利于后续支持 Suspense / 并发特性。
3. **异步构建能力缺失**  
   - 当前实现要求 Module 构建必须是完全同步的（包括其依赖 Layer 的初始化）；  
   - 一旦 ModuleImpl 依赖 `Layer.scoped` + 异步 acquire 或远程配置，`runSync(buildEffect(scope))` 会直接报错。

在运行时规划进入“生产化准备”阶段时，React 适配层应避免将这些实现细节长期固化，需要一版专门的重构方案。

## 目标与约束

目标：

- 消除 `useLocalModule` 在 StrictMode / 并发渲染下的 Scope 泄漏风险；
- 将「创建 Scope + 构建 ModuleRuntime + 启动 watcher」迁移到 commit 之后的 Effect 阶段，而不是 render/useMemo；
- 为未来支持 **异步 Module 构建**（含 Suspense）预留空间；
- 与现有 `RuntimeProvider` / `useModule` 的语义保持一致：Scope 生命周期绑定到组件树，Env 覆盖规则明确。

约束：

- React Hook 必须在 render 过程中返回“可渲染”的结果（要么是 `ModuleRuntime`，要么是可被 Suspense/ErrorBoundary 接住的占位状态）；  
- 不在 render 阶段直接 `runPromise` 或触发 Effect side-effect；  
- 保持与现有测试中的基本场景兼容（局部计数器、本地 Form、依赖 `deps` 重建等）。

## 方案草案：拆分 useLocalModule Runtime 与 UI 层责任

### 1. 新底层 Hook：`useLocalModuleRuntime`

引入新的底层 Hook，负责纯“运行时 + Scope 管理”：

```ts
interface LocalModuleState<MR> {
  readonly runtime: MR | null
  readonly isLoading: boolean
  readonly error: unknown | null
}

function useLocalModuleRuntime<Sh extends Logix.AnyModuleShape>(
  source: LocalModuleFactory | Logix.ModuleInstance<any, Sh>,
  deps: React.DependencyList,
  options?: ModuleInstanceOptions<Sh>
): LocalModuleState<Logix.ModuleRuntime<any, any>>
```

核心行为：

- 在 `useEffect` 中：
  - 使用 `runtime.runSync(Scope.make)` 创建新的 `Scope`；
  - 通过 `runtime.runPromise(buildEffect(scope))`（支持异步）构建 ModuleRuntime；
  - 构建成功后：
    - 关闭旧 Scope（若存在），更新 `state.runtime = newRuntime`；
  - 构建失败时：
    - 关闭新 Scope，写入 `state.error`，`state.runtime = null`。
- 在 cleanup 中：
  - 关闭当前生效的 Scope；
  - 重置 `state.runtime = null`。

注意：

- `runPromise` 的异步特性仅存在于 Effect 层，React 渲染侧只通过 `isLoading / error / runtime` 三元状态表达当前可用性；
- 不在 render 中直接抛错或阻塞，只由调用方决定如何处理 loading / error。

### 2. UI 级 Hook：`useLocalModule`（新版）与 Suspense

在 `useLocalModuleRuntime` 之上，提供更接近当前 API 的 UI Hook，同时把 Suspense 作为一等能力设计进去：

```ts
function useLocalModule<Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleInstance<any, Sh>,
  options: ModuleInstanceOptions<Sh> & {
    readonly suspense?: boolean          // 默认 true：走 Suspense 路线
    readonly throwOnError?: boolean      // 默认 true：交给 ErrorBoundary
  }
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
```

建议行为：

- Suspense 优先（`suspense !== false`）：
  - `isLoading && !runtime`：抛出一个挂起 Promise，让上层 Suspense 边界处理 loading；  
  - `error && throwOnError !== false`：直接抛出 error，由 ErrorBoundary 兜底；  
  - 调用方可以继续把 `useLocalModule` 当成“同步返回 runtime”的 Hook 使用，loading / error 全部交给边界处理。
- 非 Suspense 模式（`suspense=false`）：
  - `useLocalModule` 直接返回 `ModuleRuntime | null`，不会为调用方隐藏 loading/error 状态；  
  - 推荐配套改造 `useSelector` 使其在 `runtime=null` 时返回 `undefined` 或初始快照，而不是抛错：

    ```ts
    // 概念性签名：允许 runtime 为 null
    function useSelector<H extends ReactModuleHandle, V>(
      handle: H | null,
      selector: (state: StateOfHandle<H>) => V,
      equalityFn?: (prev: V | undefined, next: V | undefined) => boolean
    ): V | undefined
    ```

    这样组件可以自然写成：

    ```ts
    const runtime = useLocalModule(Impl, { suspense: false })
    const value = useSelector(runtime, s => s.value) ?? defaultValue
    ```

关于“Dummy Runtime”的取舍：

- 草案不推荐返回“看起来可用但内部静默 no-op 的 Runtime”；  
- 要么返回 `null` 并让 Hook 签名显式暴露“未就绪”的可能性，要么使用 Suspense 把 loading 隐藏在边界里；  
- 若未来需要调试辅助，可以在开发模式下对“在 runtime=null 阶段调用 dispatch/getState”的行为给出明确 warning，而不是悄悄吞掉。

### 3. 与 RuntimeProvider / useModule 的关系

- `RuntimeProvider.layer` 已支持异步 Layer 构建，并在 `fallback` 期间不渲染子树；  
- `useModule(Tag)` 通过 `useModuleRuntime` + `runtime.runSync(Tag)` 取 ModuleRuntime，仍然是假定 Tag 对应的 Module 已经在 Runtime 层构建好。

未来推荐路径：

- **全局 / 页面级模块**：继续通过 `LogixRuntime.make` + `RuntimeProvider` + `useModule` 组合；  
- **局部 / 组件级模块**：优先使用新版 `useLocalModule`（底层由 `useLocalModuleRuntime` 托管 Scope），避免在 render 中创建 Scope；  
- `useModule(Impl)` 可以被视为 `useLocalModule(Impl)` 的语法糖，内部同样复用 `useLocalModuleRuntime` 的 Scope 生命周期管理。

## 实现与迁移计划（草案）

1. **实现阶段**（短期）：
   - 在 `@logix/react` 中新增 `useLocalModuleRuntime`（内部 API），将 Scope 管理与异步构建集中到这个 Hook 中；  
   - 重构 `useLocalModule`，优先实现 Suspense 模式（`suspense=true` 默认），同时提供 `suspense=false` 的 fallback 路径；  
   - 调整 `useSelector` 以优雅处理 `runtime | null`（在非 Suspense 场景下返回 `undefined` 而非直接崩溃）；  
   - 为 `useLocalModuleRuntime` 补充 leak/pressure 测试（高频 mount/unmount、StrictMode 双渲染等），验证 Scope 不泄漏。

2. **文档与规范更新**：
   - 在 `docs/specs/runtime-logix/react/README.md` 中补充 `useLocalModuleRuntime` / Suspense 集成的设计说明；  
   - 在 `apps/docs` 的 React 集成章节中，新增“局部模块 / 本地 Runtime（含 Suspense）”一节，给出典型写法（含 Suspense 边界与非 Suspense 模式）。

3. **兼容性与后续演进**：
   - 当前规划期不强调强向后兼容，可以接受 `useLocalModule` 行为的合理 break，只要在文档中明确变更点并给出迁移建议；  
   - 后续视使用反馈决定是否导出底层的 `useLocalModuleRuntime` 作为高级 API，以及是否提供专门的 `useSuspenseLocalModule` 语法糖。

## 待决问题

- `useLocalModule` 默认是否要为调用方隐藏 `isLoading`/`error`，还是鼓励显式状态处理？  
- 是否要在第一版就对接 Suspense / ErrorBoundary，还是先仅提供非 Suspense 版本？  
- 与 `useModule(Impl)` 的边界怎么定义：是完全别名，还是保留细微差异？  
- 在 DevTools / DebugSink 中如何区分“局部 ModuleRuntime 的 Scope 生命周期”和“全局 RuntimeScope”，是否需要更细粒度的事件。

这些问题建议在实现前先在 `runtime-logix/react` 规范中给出初步结论，再回写到 `@logix/react` 实现和 apps/docs 文档中。 
