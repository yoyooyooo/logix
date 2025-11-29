# AppRuntime & ModuleDef 实现草图

> **Status**: Draft (v3 Final · Implementation Planning)
> **Scope**: `Logix.app` / `Logix.module` / `ModuleDef` 在运行时层的具体组合方式与已知取舍。

本说明文档从 **Effect/Layer/Scope** 实现视角，展开 `ModuleDef` / `Logix.module` / `Logix.app` 的具体组合方式。
目标是：

- 让后续实现者在落代码时有清晰的“拼 Layer 与 Scope”的规则可依；
- 提前暴露 v3 版本的一些刻意取舍（例如 Env 扁平合并、不做强隔离），避免后续误以为是“漏实现”；
- 为未来 v4 的 Env 裁剪 / Lazy 模块加载预留思考空间。

## 1. 核心类型回顾

来自 `architecture-app-runtime.md` 的核心定义（略去非关键字段）：

```ts
export interface ModuleDef<R> {
  readonly id: string
  readonly infra?: Layer.Layer<R, any, never>
  readonly imports?: ReadonlyArray<ModuleDef<any>>
  readonly providers?: ReadonlyArray<Provider<any>>

  /**
   * 业务编排 (Links):
   * - 连接多个 Domain 的胶水逻辑 (Effect);
   * - 平台会在架构图上将其渲染为连接线或独立节点;
   * - 运行时与 processes 一视同仁。
   */
  readonly links?: ReadonlyArray<Effect.Effect<void, any, R>>

  /**
   * 基础设施进程 (Processes):
   * - 后台守护进程 (Daemon)、日志上报、心跳检测等;
   * - 平台通常将其折叠或隐藏，视为模块内部细节。
   */
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, R>>

  readonly middlewares?: ReadonlyArray<Logic.Middleware<R>>
  readonly exports?: ReadonlyArray<Context.Tag<any, any>>
}

export interface Provider<S> {
  readonly tag: Context.Tag<S, S>
  readonly value: S // 通常是某个领域模块的运行时实例或 Service 实现
}
```

- **ModuleDef<R>**：一个模块的“图纸”，R 表示该模块期望从外界获得的环境（Env）类型；
- **infra**：该模块内部使用的基础设施 Layer，对外不要求可解析；
- **imports**：依赖的其他模块（Module）；
- **providers**：本模块提供的服务（含领域模块的运行时实例）；
- **links**：核心业务编排逻辑（将军），用于跨 Domain 协作；
- **processes**：基础设施守护进程（杂役），随模块启动；
- **exports**：对外公开的 Tag 列表，平台用来做依赖检查与拓扑展示；v3 Runtime 暂不做强隔离。

`Logix.app` 是 `ModuleDef` 的特例（无 `exports` 要求，且额外提供 `makeRuntime`）。

## 2. flatten 目标：从 ModuleDef 到 { layer, processes }

运行时的目标是：给定一棵模块树（App 视为根 ModuleDef），生成：

```ts
interface BuiltModule<R> {
  layer: Layer.Layer<R, any, never>
  processes: ReadonlyArray<ProcessDef<R>> // 包含 Link 与 Process
  middlewares: ReadonlyArray<Logic.Middleware<R>>
}

// 运行时内部使用的 Process 定义，区分业务与基建
interface ProcessDef<R> {
  readonly id: string
  readonly kind: "link" | "process"
  readonly effect: Effect.Effect<void, any, R>
  readonly ownerModuleId: string
}
```

对于 App：

```ts
interface AppDefinition<R> {
  definition: ModuleDef<R>
  layer: Layer.Layer<R, any, never>
  makeRuntime: () => Effect.ManagedRuntime<R>
}
```

v3 版本的关键特性：

- Env 采用 **扁平合并**：所有 imports / providers 的 Tag 都会出现在同一个 `Context` 环境中；
- **Tag 冲突强校验**：构建过程中必须检查 Tag Key 冲突，发现冲突立即报错，**禁止静默覆盖**；
- `exports` 仅用于 **类型/平台检查**，不做 Env 强隔离；
- `links` 和 `processes` 在运行时合并，但在元数据上严格区分，以便错误处理与可视化。

## 3. flatten 算法与防呆实现

为了保证实现的健壮性，v3 要求 `buildModule` 必须包含以下逻辑：

### 3.1 Tag 冲突检测 (Hard Constraint)

在合并 Layer 之前，必须维护一个 `TagIndex` 并进行冲突检查：

```ts
type TagKey = string

interface TagInfo {
  readonly key: TagKey
  readonly tag: Context.Tag<any, any>
  readonly ownerModuleId: string
  readonly source: "provider" | "export" | "infra"
}

// 必须抛出的错误类型
interface TagCollisionError {
  readonly _tag: "TagCollisionError"
  readonly key: TagKey
  readonly conflicts: ReadonlyArray<TagInfo>
}
```

**实现约束**：
1. 递归收集所有子模块的 Tag 信息；
2. 若发现同一个 Key 对应了不同的 Tag 实例（引用不相等），**必须**构造 `TagCollisionError` 并 fail 掉构建过程；
3. **绝对禁止**依赖 `Layer.mergeAll` 的顺序进行静默覆盖。

### 3.2 Flatten 顺序约定

虽然有冲突检测兜底，但为了行为的可预测性，flatten 顺序固定为：

> **`imports` -> `infra` -> `providers`**

即：
1. 先加载依赖模块；
2. 再加载本模块的基础设施；
3. 最后加载本模块提供的服务。

### 3.3 Link vs Process 的运行时隔离

虽然它们都是 Effect，但在运行时必须包装为 `ProcessDef` 以区分语义：

```ts
function buildModule<R>(def: ModuleDef<R>): BuiltModule<R> {
  // ... (Layer 构建逻辑同上，需加入 Tag 冲突检查) ...

  // 区分 Link 与 Process
  const links = (def.links ?? []).map(eff => ({
    id: generateId("link"),
    kind: "link" as const,
    effect: eff,
    ownerModuleId: def.id
  }))

  const processes = (def.processes ?? []).map(eff => ({
    id: generateId("process"),
    kind: "process" as const,
    effect: eff,
    ownerModuleId: def.id
  }))

  const allEffects = [...links, ...processes]

  // ...
}
```

**错误处理差异**：
- **Process 失败**：视为基础设施崩溃（如心跳停止、日志服务挂掉），默认策略应记录 Error 并可能导致 App 降级或退出（取决于 App 策略）；
- **Link 失败**：视为业务逻辑错误（如“搜索联动详情”失败），默认策略应记录 Error 日志（带上 `kind: "link"`），但不应导致 App 崩溃。

**Dev-time 断言建议**：
- 建议在开发模式下（`NODE_ENV !== "production"`）增加守卫：
  - 若 `Process` 在短时间内（如 1s）正常结束（Success），打印 Warning：“Process 预期是长驻守护进程，请确认是否误用了 Process 承载一次性逻辑”；
  - 若 `Link` 长时间阻塞且不依赖任何 Service，提示可能误用了 Link。

## 4. exports：封装边界的实现策略

### 4.1 v3 策略：类型 & 平台为主

在 v3：

- `exports` 的主要职责是：
  - **类型约束**：ModuleDef 类型中，只有 `exports` 中声明的 Tag 被视为对外可引用；
  - **平台检查**：Universe View 与依赖检查工具在发现“模块 A 使用了模块 B 未 exports 的 Tag”时，给出错误或强烈警告。
- Runtime 层面的 Env 暂时不做裁剪：
  - 这样所有 Tag 在开发/调试时都可以通过 `Effect.service` 拿到，降低实现复杂度；
  - 也便于在 PoC 阶段探索更多模式，而不被“Env 强隔离”挡路。

### 4.2 v4 方向：Env 裁剪与 Scoped Layer（仅规划，不在 v3 实现）

若未来需要更强封装，可以考虑：

- 在 `buildModule` 中引入 “投影 Layer”：
  - 内部构建完整 envLayer；
  - 对外仅暴露 `exports` 中的 Tag（例如通过包装 Runtime、限制可用 Tag 集合）。
- 或者通过 **多级 Scope** 模拟模块边界：
  - 每个 Module 拥有独立 Scope 与 Env；
  - 子 Module 只继承父 Module 的 `exports` 环境，而非全部 Tag。

以上方案都涉及较大的实现／调试成本，v3 暂不落地，仅作为规划备忘。

## 5. 已知取舍与隐患

### 5.1 Env 扁平化带来的隐患

- **优势**：实现简单、调试方便、PoC 阶段灵活；
- **隐患**：
  - 模块内部 Tag 可以被“越界使用”，如果不依赖平台检查，很难在 TypeScript 层完全阻止；
  - 某些错误（比如 Tag 名冲突）会在运行时才暴露。

缓解策略：

- **Tag 冲突强校验**（见 3.1）；
- 严格依赖 `exports` + 平台检查 + Lint 规则，避免跨模块随意引用 Tag；
- 在 Runtime 日志中增加模块边界相关的诊断信息，方便排查。

#### 5.1.1 Tag 冲突风险（命名约定）

由于 v3 采用 Env 扁平合并，**不同模块提供的 Tag 会共享同一个 Context 命名空间**。

建议约定：

- 所有 Tag 的 key（`Context.Tag("...")` 中的字符串）应保持全局唯一，推荐包含模块前缀，例如：
  - `"Order/OrderApi"`、`"User/UserStore"`、`"Global/Layout"`；
- 可通过 Lint/内部检查脚本对 Tag key 做重复扫描，提前发现潜在冲突。

### 5.2 Link vs Process 的语义区分

v3 引入了 `links` 字段，用于区分“业务编排”与“基础设施”：

- **Link (胶水)**：
  - 属于核心业务逻辑，负责连接多个 Domain（如搜索联动详情）；
  - 平台会在架构图中将其渲染为重要节点；
  - 推荐使用 `Link.make("Name", ...)` 创建，以便平台识别名称。
- **Process (杂役)**：
  - 属于基础设施，负责后台维护（如日志、心跳）；
  - 平台通常将其折叠或隐藏。

虽然 Runtime 对它们一视同仁，但在代码组织和可视化上，这种区分至关重要。

### 5.2.1 Infra Error 通道的汇聚

`ModuleDef.infra` 的 Layer 允许 `E = any`，这意味着：

- 单个模块的 infra 部分可能在构建时失败（例如 Config 读取失败、外部服务初始化失败）；
- 多个模块 flatten 后，App 根 Layer 的 Error 通道实质上是“所有子模块 Infra Error 类型的联合”。

实现与使用建议：

- 在 `Logix.app(...).makeRuntime()` 的调用侧，明确处理 App 启动失败的场景：
  - 例如在 CLI/Node 场景中 log 错误并退出；
  - 在前端场景中展示“应用启动失败，请联系管理员”之类的降级 UI。
- 在 runtime 实现中，保持 infra Layer 的 Error 通道不被默默吞掉；让调用者有机会在顶层看到并处理这些错误。

### 5.3 middlewares 的 Runtime 接入

- v3 版本中，`ModuleDef.middlewares` 主要为 **平台与代码生成器** 服务：
  - 平台可以根据模块配置生成或检查 `Logic.compose(Logging, AuthGuard, ...)` 这类组合调用；
  - Runtime 暂不自动从 ModuleDef 将中间件注入到 Logic 执行路径中。
- 若后续希望 Runtime 自动注入 Module 级中间件，可以考虑：
  - 定义一个 `LogicMiddlewareRegistry` Service，通过 Tag 提供；
  - 在 `buildModule` 时根据 ModuleDef 构造该 Registry；
  - 在 Logic 构造的实现中从 Registry 读取当前 Store/Module 对应的中间件并套用。

此方案较重，且会给逻辑执行链引入隐式依赖，v3 暂不落地，仅作为 v4 备选方向记录。

---

**结论**：
v3 的 `Logix.app` / `Logix.module` 在实现上以“递归 flatten 到一个大 Layer + processes 列表”为主，Env 扁平、exports 只用于类型与平台检查。
引入 `links` 字段实现了“业务编排”与“基础设施”的语义分离，为 Universe View 提供了关键的拓扑信息。这为后续演进（Env 裁剪、Lazy 模块、自动 Middleware 注入）预留了空间，同时保证当前实现简单可控、调试成本低。
***
