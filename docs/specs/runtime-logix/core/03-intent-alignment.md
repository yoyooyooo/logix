# 意图对齐 (Intent Alignment)

> **Status**: Draft
> **Date**: 2025-11-20

## 1. 目标

本 Logix 引擎的设计初衷之一，是作为 `intent-driven-ai-coding` 平台中的一个前端 Runtime Target（`logix-engine`），承载“贴近 UI 的行为与联动”。这意味着：

- Logix 不重新定义 Intent / Flow / Constraint 的模型，相关概念与 Schema 以 `docs/specs/intent-driven-ai-coding/v3` 为事实源：  
  - 三位一体 Intent 模型：`v3/02-intent-layers.md`；  
  - 资产与 Schema 映射：`v3/03-assets-and-schemas.md`；  
  - Runtime 家族与 Flow 执行：`v3/97-effect-runtime-and-flow-execution.md`。  
- 如需回顾 v2 六层模型及其与 v3 的差异，可参考 `v2/02-intent-layers.md` 与 `v2/99-history-and-comparison.md`，但它们不再作为当前 Logix 设计的事实源。  
Logix 只定义“这些 Intent 如何在前端运行时中落地”为 Store Schema、Actions/Inputs 与 Logic 规则。

## 2. Intent 三维与 Logix 的关系

参考 v3 文档中的三维 Intent 模型（UI / Logic / Domain），Logix 的覆盖范围可以概括为：

| Intent 维度 | Logix 角色 | 说明 |
| :--- | :--- | :--- |
| **UI Intent** | Inputs & State Consumer | UI Intent 决定界面结构与可交互部件，Logix 通过 State/Actions/Inputs 为这些组件提供数据与行为入口，但不关心具体布局细节。 |
| **Logic Intent** | 运行时目标之一 | 当 `runtimeTarget = 'logix-engine'` 时，Logic Intent 中的 Flow DSL 会被编译为 Logix 的 Logic 规则；当目标为其他 Runtime（如 Effect Flow Runtime）时，Logix 只负责触发/展示结果。 |
| **Domain Intent** | Schema + Services | Domain Intent 中的实体与服务契约映射为 Logix Store 的 `stateSchema` / `initialState` 以及注入的 `services`，决定状态结构与可用服务。 |

在 v2 的六层模型中：

- Layout / View / Interaction Intent 现在被统一纳入 UI / Logic 维度（参见 `v3/02-intent-layers.md` 中的说明）；  
- Code Structure Intent 不再被视为 Intent，而是由 Pattern / 模板层自动产出的工程细节。  
这些历史概念如需回顾，可以用来理解 Logix 覆盖范围的由来，但不再约束当前 DSL 与 Schema 设计。

Logix 视角只关心：某段 Behavior & Flow Intent 是否选择了 `logix-engine` 作为 `runtimeTarget`，以及哪些 Interaction / Data & State / Constraint 信息需要在前端运行时中被落实。

## 3. `runtimeTarget = 'logix-engine'` 时的映射

当 Behavior & Flow Intent 明确标记为在 Logix 上执行时，平台端的编译/出码过程大致如下：

1. **触发条件**（Interaction Intent）  
   - 事件（如 `button.click`、`field.change`）在 UI 层通过标准模式映射为：  
     - 对应字段的 `set(path, value)`；  
     - 或某个业务意图的 `dispatch(action)`；  
     - 或注入到 `inputs` 流（如搜索框输入流）。

2. **行为步骤链**（Behavior & Flow Intent）  
   - 行为步骤（检查、调用服务、更新状态、发出信号等）被编译为 Logix 的 Logic 规则：  
     - 对字段变化敏感的步骤 → `flow.fromChanges(selector)`；  
     - 对 Actions 敏感的步骤 → `flow.fromAction(predicate)`；  
     - 对外部流敏感的步骤 → `flow` 规则。

3. **状态结构**（Data & State Intent）  
   - Data & State Intent 声明的字段/实体 Schema 映射到 Store 配置：  
     - `schema: Schema<S>` 与 `initialValues: S`；  
     - 对应的错误/元信息字段（如 `errors`, `touched`, `status`）由 Form/列表等领域包在 Logix 之上扩展。

4. **约束与质量**（Constraint & Quality Intent）  
   - 非功能性约束（防抖、节流、并发策略、重试/超时等）被编译为 Logic 规则上的 options 或中间件：  
     - 如 `debounce: '500 millis'`, `concurrency: 'restart'` 等；  
     - 更复杂的约束（如审计/埋点）可通过 Env/Services 层或专门的 Logic 规则实现。

最终结果是在某个 feature 下生成一个或多个 Logix Store 配置文件（或 JSON DSL），由 UI 通过 `@logix/react` 适配层接入。

## 4. 与 Effect Flow Runtime 的边界

Behavior & Flow Intent 在平台层可以选择不同的 Runtime Target：

- **Effect Flow Runtime**：  
  - 负责跨系统、强审计/重试/回放的长流程（如订单导出任务、审批流、数据同步）；  
  - 以 `.flow.ts` + Env/Layer 的形式在服务端运行。

- **Logix Engine Runtime**：  
  - 负责“贴近 UI”的行为（字段联动、表单校验、列表加载与刷新策略、轻量本地流程）；  
  - 在需要跨系统时，通过服务接口调用前者暴露的 Flow。

从 Logix 视角看待 Behavior & Flow Intent：

- 若 `runtimeTarget = 'effect-flow-runtime'`：  
  - Logix 配置只是生成调用入口（如 `services.FlowRunner.run(flowId, input)`）与状态回填逻辑；  
  - 行为本体在 Flow Runtime 中运行。

- 若 `runtimeTarget = 'logix-engine'`：  
  - Logix 直接承载步骤链，以上节描述的方式生成 Logic 规则；  
  - Flow Runtime 只在必要时作为被调用方出现。

这种分工保证了：Intent 模型与 DSL 在平台层保持统一，运行时则由 Logix 与 Effect Flow Runtime 按各自擅长的范围协同承载。

## 5. AI 视角下的使用方式

对于 LLM 来说，重要的是 **“Logix 只是 Runtime Family 之一”** 这一认知：

- 在生成 Behavior & Flow Intent / FlowDslV2 草稿时，模型需要先判断行为更适合落在 `logix-engine` 还是 `effect-flow-runtime`；  
- 当目标是 Logix 时，输出的重点是：  
  - 哪些 Interaction 事件会触发 Logic；  
  - 需要监控/更新哪些 State 路径；  
  - 有哪些防抖/并发/重试约束；  
  - 需要调用哪些前端可用的服务（如本地缓存、前端校验库、Flow Runner 客户端）。

Logix 端的 JSON 解释器与 Logic DSL 仅是“承接这些 Intent 的一种落地形式”，其 Schema 设计应以 v3 中的 Intent / Flow / Constraint 模型为上游（参见 `v3/02-intent-layers.md`、`v3/03-assets-and-schemas.md` 与 `v3/97-effect-runtime-and-flow-execution.md`），避免再出现第二套事实源。

## 6. v3 Intent ↔ Logix API 映射表

为方便在实现与出码时快速定位，下面给出一份从 v3 Intent 模型到 Logix 核心 API 的直观映射表（只列出常用字段，详细语义以各自规范为准）：

| v3 Intent / Schema 字段 | Logix 对应位置 | 典型写法 / 说明 |
| :--- | :--- | :--- |
| `IntentSpecV3.ui[*]`（UI Intent 节点） | Store 使用侧（UI 层） | 由平台生成的 React 组件树，通过 `@logix/react` 订阅 Store 状态、派发 Actions；Logix 不直接建模 UI 节点，只消费其发出的事件。 |
| `UIIntentNode.emits` / `UIImplConfig.emits` | `dispatch(action)` | UI 事件（如 `onClick: 'signal:submitOrder'`）被编译为向 Store 派发某个 Action，供 `flow.fromAction` 触发。 |
| `DomainIntentNode` / `DomainImplConfig.fields` | `makeStore({ stateSchema, initialState })` | Domain 字段 Schema 编译为 `stateSchema: Schema.Schema<S>`，同时生成对应的 `initialState: S`。 |
| `DomainImplConfig.services` | `makeStore({ services })` + Logic 中 `api.services` | Domain 服务契约映射为 `Services` 接口与具体实现对象，注入到 Store 的 `services` 字段，在 Logic 中通过 `api.services.Xxx` 调用。 |
| `LogicIntentNode.trigger` / `LogicImplConfig.trigger` | `flow.fromAction` / `flow.fromChanges` | `type: 'onSignal' | 'onLifecycle' | 'onSchedule'` 等触发器被编译为对应的流创建函数；例如 `signalId: 'submitOrder'` → `flow.fromAction(a => a._tag === 'submitOrder')`。 |
| `LogicImplConfig.flow.nodes` / `edges`（Flow DSL） | Logic / Flow API | Flow 节点（`service-call` / `update-state` / `dispatch` / `branch` 等）通过 `Logic.make` 中的 `Effect` 和 `flow` API 进行组合；调用服务 → 直接 `yield* services.Xxx` 或包装为 Pattern；更新状态 → 通过 `state.update` / `state.mutate` 实现；发射信号 → 通过 `dispatch` 实现。 |
| `LogicImplConfig.constraints`（`concurrency` / `timeout` / `retry` / `transaction`） | 规则 Options / 中间件 | 编译为 Rule 层面的选项（如防抖/并发策略）或封装在服务调用的 Effect 组合子内（如 `Effect.timeoutFail`、`Effect.retry`），由 Logix Runtime 在执行时统一处理。 |
| `LogicImplConfig.testCases` | `@logix/test` / Round-trip 测试 | 平台可将这些用例转换为基于 Logix Store 的 Round-trip 测试（参见 `runtime-logix/test` 系列文档），通过注入 Mock Services、构造输入、断言 State/Signals。 |

在实际出码链路中，平台会先根据 v3 Intent/Flow Schema 生成中间层的 Flow DSL/JSON（与 `v3/04-intent-to-code-example.md` 一致），再由 Logix 编译器将其中 `runtimeTarget = 'logix-engine'` 的部分落地为上述 Store 配置与 Logic 规则。
