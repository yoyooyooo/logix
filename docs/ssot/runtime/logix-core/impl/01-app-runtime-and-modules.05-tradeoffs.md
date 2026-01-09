# 5. 已知取舍与隐患

## 5.1 Env 扁平化带来的隐患

- **优势**：实现简单、调试方便、早期探索阶段灵活；
- **隐患**：
  - 模块内部 Tag 可以被“越界使用”，如果不依赖平台检查，很难在 TypeScript 层完全阻止；
  - 某些错误（比如 Tag 名冲突）会在运行时才暴露。

缓解策略：

- **Tag 冲突强校验**（见 3.1）；
- 严格依赖 `exports` + 平台检查 + Lint 规则，避免跨模块随意引用 Tag；
- 在 Runtime 日志中增加模块边界相关的诊断信息，方便排查。

### 5.1.1 Tag 冲突风险（命名约定）

由于当前实现采用 Env 扁平合并，**不同模块提供的 Tag 会共享同一个 Context 命名空间**。

建议约定：

- 所有 Tag 的 key（`Context.Tag("...")` 中的字符串）应保持全局唯一，推荐包含模块前缀，例如：
  - `"Order/OrderApi"`、`"User/UserStore"`、`"Global/Layout"`；
- 可通过 Lint/内部检查脚本对 Tag key 做重复扫描，提前发现潜在冲突。

## 5.2 Link vs Process 的语义区分

当前主线引入了 `links` 字段，用于区分“业务编排”与“基础设施”：

- **Link (胶水)**：
  - 属于核心业务逻辑，负责连接多个 Domain（如搜索联动详情）；
  - 平台会在架构图中将其渲染为重要节点；
  - 推荐使用 `Link.make({ id: "Name", modules: [...] }, ...)` 创建，以便平台识别名称与参与模块。
- **Process (杂役)**：
  - 属于基础设施，负责后台维护（如日志、心跳）；
  - 平台通常将其折叠或隐藏。

虽然 Runtime 对它们一视同仁，但在代码组织和可视化上，这种区分至关重要。

## 5.2.1 Infra Error 通道的汇聚

`ModuleDef.infra` 的 Layer 允许 `E = any`，这意味着：

- 单个模块的 infra 部分可能在构建时失败（例如 Config 读取失败、外部服务初始化失败）；
- 多个模块 flatten 后，App 根 Layer 的 Error 通道实质上是“所有子模块 Infra Error 类型的联合”。

实现与使用建议：

- 在 AppRuntime 的 `makeApp(...).makeRuntime()` 调用侧，明确处理 App 启动失败的场景：
  - 例如在 CLI/Node 场景中 log 错误并退出；
  - 在前端场景中展示“应用启动失败，请联系管理员”之类的降级 UI。
- 在 runtime 实现中，保持 infra Layer 的 Error 通道不被默默吞掉；让调用者有机会在顶层看到并处理这些错误。

## 5.3 middlewares 的 Runtime 接入

- `ModuleDef.meta.aop.middlewares` 主要为 **平台与代码生成器** 服务：
  - 平台可以根据模块配置生成或检查 `Logic.compose(Logging, AuthGuard, ...)` 这类组合调用；
  - Runtime 暂不自动从 ModuleDef 将中间件注入到 Logic 执行路径中。
- 若后续希望 Runtime 自动注入 Module 级中间件，可以考虑：
  - 定义一个 `LogicMiddlewareRegistry` Service，通过 Tag 提供；
  - 在 `buildModule` 时根据 ModuleDef 构造该 Registry；
  - 在 Logic 构造的实现中从 Registry 读取当前 Store/Module 对应的中间件并套用。

此方案较重，且会给逻辑执行链引入隐式依赖，当前主线不落地；仅作为未来方向备忘。

---

**结论**：
应用级 Runtime 在实现上以“递归 flatten 到一个大 Layer + processes 列表”为主，Env 扁平、exports 只用于类型与平台检查。
引入 `links` 字段实现了“业务编排”与“基础设施”的语义分离，为 Universe View 提供了关键的拓扑信息。这为后续演进（Env 裁剪、Lazy 模块、自动 Middleware 注入）预留了空间，同时保证当前实现简单可控、调试成本低。

---
