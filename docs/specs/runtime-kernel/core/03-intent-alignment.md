# 意图对齐 (Intent Alignment)

> **Status**: Draft
> **Date**: 2025-11-20

## 1. 目标

本 Logix 引擎的设计初衷之一，是作为 `intent-driven-ai-coding` 平台中的一个前端 Runtime Target（`logix-engine`），承载“贴近 UI 的行为与联动”。这意味着：

- Logix 不重新定义 Intent / Flow / Constraint 的模型，相关概念与 Schema 以 `docs/specs/intent-driven-ai-coding/v2` 为事实源：  
  - 六层 Intent 模型：`v2/02-intent-layers.md` + `v2/design/*`；  
  - 资产与 Schema 映射：`v2/03-assets-and-schemas.md`；  
  - Linking / Traceability / Replay：`v2/06-intent-linking-and-traceability.md`；  
  - Runtime 家族与 Flow 执行：`v2/97-effect-runtime-and-flow-execution.md`。  
Logix 只定义“这些 Intent 如何在前端运行时中落地”为 Store Schema、Actions/Inputs 与 Logic 规则。

## 2. Intent 六层与 Logix 的关系

参考 v2 文档中的六大 Intent 类型，Logix 的覆盖范围可以概括为：

| Intent Layer | Logix 角色 | 说明 |
| :--- | :--- | :--- |
| **Layout Intent** | N/A | 布局/区域树由 Layout Intent + UI/Pro Pattern 决定，Logix 不直接关心布局结构，只关心与状态相关的字段。 |
| **View & Component Intent** | 间接 | 视图/组件选择与组合由 View & Component Intent + Pattern 实现，Logix 提供这些组件依赖的 state/actions（如表单值、loading 状态）。 |
| **Interaction Intent** | Inputs + Actions | 用户操作（点击、输入、切 Tab 等）在 UI 中被转为 `set` / `dispatch(action)` / `inputs` 事件流，是 Logix 行为的主要触发源。 |
| **Behavior & Flow Intent** | 运行时目标之一 | 当 `runtimeTarget = 'logix-engine'` 时，Behavior & Flow Intent 描述的步骤链会被编译为 Logix 的 Logic 规则；当目标为其他 Runtime（如 Effect Flow Runtime）时，Logix 只负责触发/展示结果。 |
| **Data & State Intent** | Schema + initialValues | 字段与实体 Schema 映射为 Logix Store 的 `schema` 与 `initialValues`，并决定状态分层与生命周期。 |
| **Code Structure Intent** | N/A（仅消费约定） | 代码组织与目录结构由 Code Structure Intent 与模板决定，Logix 只是运行时代码的一部分消费者。 |
| **Constraint & Quality Intent** | Rule Options / 中间件 | 性能与可靠性约束（防抖、并发策略、重试、超时等）映射为 Logic 规则上的 options 或中间件配置。 |

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
     - 对字段变化敏感的步骤 → `watch(path, handler, options)` / `watchMany`；  
     - 对 Actions 敏感的步骤 → `onAction(type, handler, options)`；  
     - 对外部流敏感的步骤 → `onInput(inputId, handler, options)` 或 `flow` 规则。

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

Logix 端的 JSON 解释器与 Logic DSL 仅是“承接这些 Intent 的一种落地形式”，其 Schema 设计应以 v2 中的 Intent/Flow/Constraint 模型为上游，避免再出现第二套事实源。
