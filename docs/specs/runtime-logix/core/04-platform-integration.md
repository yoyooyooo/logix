# Platform Integration (平台集成与治理)

> **Status**: Draft  
> **Context**: 本文档从 Logix 视角说明：在 `intent-driven-ai-coding` v3 架构下，Logix 作为 `logix-engine` Runtime Target，如何消费 Intent/Flow/Constraint 契约并接入平台的治理能力。  
> Intent 三位一体模型与 Schema 见 `docs/specs/intent-driven-ai-coding/v3/02-intent-layers.md` / `v3/03-assets-and-schemas.md`，  
> Runtime 家族与 Flow 执行链路见 `v3/97-effect-runtime-and-flow-execution.md`。  
> 如需对比 v2 六层模型与历史设计，可参考 `v2/02-intent-layers.md` 与 `v2/99-history-and-comparison.md`，但当前集成方案以 v3 为事实源。

## 1. 总体定位

在平台整体架构中：

- **Intent (意图)**：产品与开发者在 v2 模型下表达的 Layout / View / Interaction / Behavior & Flow / Data & State / Code Structure 等信息；  
- **Platform (平台)**：负责 Intent 的校验、FlowDslV2/LogixLogicDsl 编译、出码与治理；  
- **Runtimes (运行时家族)**：承接 Behavior & Flow Intent 的具体执行后端，其中之一就是本文件描述的 Logix Engine Runtime。

Logix 在这里扮演：

- 前端应用内的「状态与本地行为运行时」；  
- Behavior & Flow Intent 在 `runtimeTarget = 'logix-engine'` 场景下的承载者；  
- 与 Effect Flow Runtime 等其他 Runtime 协作的前端侧协调层（触发 Flow、接收结果、驱动 UI）。

## 2. Intent 层映射（Logix 视角）

### 2.1 Data & State Intent -> Logix Schema

平台定义的 Data & State Intent（实体/字段/校验等）直接映射为 Logix Store 的 Schema 与初始值：

- **Entity / Field Schema**：映射为 `Schema.Struct`、`Schema.Union` 等，组成 Store 的 `schema: Schema<S>`；  
- **State Source**：  
  - `local`: 映射为 Store 内部状态字段；  
  - `external`（如 React Query、WebSocket）：通过 `inputs` 与 `mount/onInput` 规则接入。

Data & State Intent 的演进与兼容性规则仍由 v2 文档（`02-intent-layers.md` / `03-assets-and-schemas.md` / `SCHEMA_EVOLUTION.md`）约束，Logix 只做映射。

### 2.2 Behavior & Flow Intent -> Logix Logic（仅 `logix-engine`）

当 Behavior & Flow Intent 的 `runtimeTarget = 'logix-engine'` 时：

- **Trigger**：`FlowIntent.trigger` → 映射为 Interaction/State 事件：  
  - 字段变化：`watch(path, handler, options)` / `watchMany`；  
  - 动作：`onAction(type, handler, options)`；  
  - 外部输入流：`onInput(inputId, handler, options)` / `flow` 组合。

- **Steps**：`FlowIntent.pipeline` → 映射为 Logic Handler 中的 Effect 步骤序列：  
  - `callService`：`yield* services.ServiceName.method(...)`；  
  - `branch`：`if (...) { ... }` / `match`；  
  - `parallel`：`Effect.all(...)` 等组合子。

-- **Context / Services**：  
  - 平台根据 Behavior & Flow Intent 中引用的服务定义生成 `Services` 接口；  
  - Logix 通过 Effect Env/Layer 或配置项将这些服务注入到 `LogicOps.services`。

当 `runtimeTarget = 'effect-flow-runtime'` 时，Behavior & Flow Intent 的主体会由 Flow Runtime 承载，Logix 只生成触发 Flow 的入口与结果回填逻辑（参考 v2/97 中的说明）。

### 2.3 Interaction Intent -> Inputs & Actions

交互意图中的“用户行为”在 UI 层被标准化为 Logix 可消费的事件：

- **字段输入**：映射为 `set(path, value, meta)`，触发相应的 `watch` / `watchMany` 规则；  
- **按钮点击等动作**：映射为 `dispatch(action)` 或向 `inputs.someStream` 推送事件；  
- **复杂交互模式**（如拖拽、快捷键序列）：通过适配器在 React 层聚合为 Stream，再注入 `inputs`。

Logix 不直接关心具体组件，而是通过这些统一入口感知 Interaction Intent 所表达的行为。

### 2.4 Constraints & Quality Intent -> Rule Options / 中间件

平台定义的非功能性约束映射为：

- **Rule Options**：  
  - 性能：`debounce`, `throttle`, `batch` 等；  
  - 并发：`concurrency: 'switch' | 'exhaust' | 'queue'` 等；  
  - 生命周期：`immediate: true` 等。

- **中间件 / Env 配置**：  
  - 可靠性：`retry`, `timeout`, 熔断策略等，通过 Effect 组合子或服务层中间件实现；  
  - 审计 / 埋点：通过专门的 Audit/Telemetry 服务与 Logic 规则协作。

这些配置在 Schema 层由 Constraint & Quality Intent 定义，在 Logix 层只是被消费与实现。

## 3. 静态分析与竞态治理（Logix 代码视角）

虽然 Logix 在运行时内置了 Loop Protection，但平台侧仍应基于 Logix Logic（或对应 DSL）做静态分析，以提前发现问题。

### 3.1 依赖图构建（Dependency Graph）

平台解析 Logix Logic（或 LogixLogicDsl），构建 Path 级依赖有向图：

- **Nodes**：State Path（如 `user.name`、`items.*.price`）或 Action/Input 标识；  
- **Edges**：规则依赖关系（如 `watch('a', set('b'))` 形成 `A -> B`）。

### 3.2 治理策略

| 风险模式 | 检测逻辑 | 平台行为 |
| :--- | :--- | :--- |
| **直接循环** | Graph Cycle (A -> B -> A) | **Error**：阻止代码生成或运行，要求人工介入。 |
| **多源写入** | 多条规则写入同一路径 (A -> C, B -> C) | **Warning**：提示竞态风险，建议合并逻辑或使用 `watchMany`。 |
| **孤儿规则** | 监听无任何可能触发源的节点 | **Info**：提示规则可能永远不会触发。 |
| **高频震荡** | (Runtime) 同一路径在短时间内频繁变更 | **Trace**：在 DevTools 中高亮显示 Flapping 路径。 |

这些分析可以基于 DSL（JSON 形式）或静态扫描 TS/Effect 代码实现，目标是让 Logix Logic 成为“可治理资产”，而不是黑盒 Hook。

## 4. JSON 解释器与 LogixLogicDsl

为了降低 LLM 生成 TS 代码的难度，Logix 提供 JSON 级的 Logic DSL 及其解释器：

- 上游：  
  - 行为的事实源仍是 Behavior & Flow Intent / FlowDslV2；  
  - LogixLogicDsl 可以被视为 FlowDslV2 在 `runtimeTarget = 'logix-engine'` 场景下的一种投影或子集（由平台编译/映射产生）。

- 下游：  
  - Logix 侧提供 `compile(json): LogicRule` 或等价 API，将 JSON 规则转换为可执行的 Effect 逻辑；  
  - 解释器实现必须与 Intent/Flow/Constraint 的演进保持兼容，不单独演化新的语义。

示例 JSON 片段仍类似原设计，只是需要在上游 Schema 中保证字段命名与语义与 Flow/Constraint 契约对齐。

## 5. 可观测性与 Intent Trace 集成

Logix 默认集成 Effect Tracing 与结构化调试事件（详见 `08-debugging-features.md`），平台 DevTools 可以在此基础上提供（与 `v2/06-intent-linking-and-traceability.md` 中的 Use Case / ID / 回放模型对齐）： 

1. **Timeline View**  
   - 展示 State 变更时间轴；  
   - 每条变更关联触发规则、源 Path/Action/Input、Constraint 信息等。

2. **Causal Graph View**  
   - 可视化展示当前变更的因果链（State/Action/Input 之间的传播）；  
   - 与静态依赖图结合，用于分析复杂联动。

3. **Intent Tracing**  
   - 平台在出码阶段将 Intent Id / Flow Id / UseCase Id 注入到 Logix 规则与 Trace 上下文；  
   - 运行时的 DebugEvent / Span 中带有这些 Id，使得可以从日志/告警一键跳回 Intent / Flow 视图。

在更完整的端到端链路中，Logix 的 TraceId 还应与 Effect Flow Runtime 的 TraceId 贯通，实现“前端 Logix 行为 → 服务侧 Flow 执行 → 外部系统调用”的全链路追踪。
