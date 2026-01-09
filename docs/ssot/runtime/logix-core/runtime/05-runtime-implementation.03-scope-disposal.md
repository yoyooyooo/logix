# 3. Scope 管理与资源释放

Logix 严格遵循 Effect 的 Scope 机制：

- **Global Store**：
  - 生命周期绑定在应用级 Runtime（通过 `Logix.Runtime.make` 构造的 Runtime / 内部 AppRuntime）创建的根 Scope 上。
  - App 关闭时，根 Scope 关闭，触发所有 Global Store 的 `onDestroy`。

- **Local Store**：
  - 生命周期绑定在 React 组件创建的临时 Scope 上（通过 `useLocalStore`）。
  - 组件卸载时，临时 Scope 关闭，触发 Local Store 的 `onDestroy`。

这种机制保证了无论是全局还是局部状态，其资源（如 WebSocket 连接、定时器）都能被精确、自动地释放。成功初始化后，`processes` 中的进程才会启动；

- 若某个模块初始化失败，`processes` 将不会被执行，AppRuntime 的构建会以错误告终。

2. **生命周期绑定**：
   - `finalLayer` 通常作为应用根节点的 Runtime 入口：
     - React 场景：由 `RuntimeProvider runtime={Logix.Runtime.make(...)}`（或等价封装）持有其 Scope；
     - Node / CLI 场景：通过 `makeRuntime()` 创建的 Runtime 持有其 Scope。

> 注意
> 上述代码为概念性伪代码，用于描述 Layer 组合与 Scope 关系；
> 真正实现时需以本地 `effect` 版本的 API 为准（包括 `ManagedRuntime` 的导入路径与签名）。

## 6.3 依赖顺序与生命周期 (Dependency & Lifetime)

AppRuntime 在语义上遵循如下顺序：

1. **依赖初始化顺序**：`layer` → `modules` → `processes`。
   - 只有在所有基础设施与 Store 都成功初始化后，`processes` 中的进程才会启动；
   - 若某个模块初始化失败，`processes` 将不会被执行，AppRuntime 的构建会以错误告终。
2. **生命周期绑定**：
   - `finalLayer` 通常作为应用根节点的 Runtime 入口：
     - React 场景：由 `RuntimeProvider runtime={Logix.Runtime.make(...)}`（或等价封装）持有其 Scope；
     - Node / CLI 场景：通过 `makeRuntime()` 创建的 Runtime 持有其 Scope。
   - 当应用卸载或进程退出时：
     - `processes` 中通过 `forkScoped` 启动的所有进程会自动收到中断信号并优雅退出；
     - 所有挂在 App 根 Scope 下的 Store / Service 资源均会被释放。

通过这种方式，Logix 在保持 Effect-Native 运行时特性的同时，为平台与 React/Form 层提供了一个稳定的 **App 级组合契约**：
微观层使用 `Logix.Module` / Bound API `$` 组织行为，宏观层推荐使用 `Logix.Runtime.make(root, { layer, onError })` 组织 Root Module 与跨模块协作；AppRuntime 仅作为底层实现存在。

## 6.4 已知局限与取舍 (Known Trade-offs)

当前的 AppRuntime 设计在平台可解析性与工程灵活性之间做了一些有意识的取舍：

- **进程语义**：
  - `processes` 专门用于描述“长生命周期的守护进程 / 协调逻辑”，例如 `SearchDetailCoordinator`；
  - 一次性初始化脚本（如简单的日志打印、一次性的配置读取）建议放在 Infra 构建层或具体 Store/Logic 中，而非 `processes`。
- **Bundle 体积**：
  - 由于 AppRuntime 蓝图是静态结构，`modules` 中引用的所有 Store 实现会被打入主 Bundle；
  - 对于非常大的前端应用，这会增加首屏体积，但换来的是平台在“静态模式”下即可完整分析应用拓扑。
- **Layer 黑盒**：
  - `layer` 字段仍然是一个任意的 `Layer.Layer<R, any, never>`，平台不会尝试解析其中的服务细节；
  - 这样可以保留 Effect-Native 的完全表达力，同时将拓扑解析的范围聚焦在 `modules` / `processes` 这两类结构化资产上。
