# Logix Engine Specs · 导航与分层

本目录汇总 **Logix Engine** 相关的全部规格文档，既包含「引擎设计与契约」，也包含「React/Form 适配层」与「面向使用者的指南」。

## 面向谁

- 架构/平台规划者
关注 Logix 在 intent-driven 平台中的定位、与 Effect Flow Runtime 的关系以及与 Intent 模型的映射。
推荐从 `core/00-manifesto.md`、`core/01-architecture.md`、`core/03-intent-alignment.md`、`core/04-platform-integration.md` 开始阅读；
  Intent/Flow/Runtime 家族与 Linking/Replay 的上游规范见：
  - `docs/specs/intent-driven-ai-coding/README.md`（平台蓝图与版本索引，确立 v3 为事实源）；
  - `docs/specs/intent-driven-ai-coding/v3/01-overview.md`（三位一体模型与整体定位）；
  - `docs/specs/intent-driven-ai-coding/v3/02-intent-layers.md`（UI/Logic/Domain 三维意图模型）；
  - `docs/specs/intent-driven-ai-coding/v3/03-assets-and-schemas.md`（Intent/Pattern/Flow/Schema 资产映射）；
  - `docs/specs/intent-driven-ai-coding/v3/04-intent-to-code-example.md`（Intent → Flow/Logix 端到端示例）；
  - `docs/specs/intent-driven-ai-coding/v3/97-effect-runtime-and-flow-execution.md`（Runtime 家族与 Flow 执行）。

- Logix 实现者 / 运行时维护者
  关注 Module/Store/Logic API 契约、内部实现架构、调试与可观测性。
  以 `core/01-architecture.md`、`core/02-module-and-logic-api.md`、`core/03-logic-and-flow.md`、`core/05-runtime-implementation.md`、`core/08-usage-guidelines.md`、`core/09-debugging.md` 为主轴。

- 业务工程师 / 平台集成方
  需要在真实业务中使用 Logix 与其 React/Form 适配层写代码。
  以 `guide/` 下文档为入口，对应的核心契约和示例在 `core/examples/`、`core/scenarios/` 以及 `react/`、`form/` 中查找。

## 一条黄金链路（Module → Logic → Fluent → IntentRule）

从 Runtime 视角看，Logix v3 围绕一条标准链路设计：

> **Module → Module.logic(($) => ...) → $.use(Module) → Fluent DSL (`$.onState` / `$.onAction` / `$.on`) → IntentRule**

简要说明：

- 在定义层，用 `Logix.Module('Id', { state, actions })` 定义领域 Module，它同时承担 Id / Schema / Tag 三种角色；
- 在逻辑层，通过 `Module.logic(($)=>Effect.gen(...))` 编写 Logic，`$` 是绑定了当前 ModuleRuntime + 业务服务 Env 的 Bound API；
- 在协作层，通过 `$.use(Module)` 获取其他领域模块的只读句柄，用 Fluent DSL（`$.onState / $.onAction / $.on(stream)` + `$.state/dispatch`）表达单 Module 内与跨 Module 的联动；
- 在平台层，这些 Fluent 链被解析为 `IntentRule` IR，用于 Universe/Galaxy 视图与图码双向同步。

详细规范可在以下文档中查阅：

- `core/02-module-and-logic-api.md`：Module / Logic / Live / `$` API 总览与 Module-first 编程模型；
- `core/03-logic-and-flow.md`：Bound API `$`、Logic / Flow / Control 与完整链路示例；
- `core/06-platform-integration.md`：IntentRule IR 与平台集成；
- `docs/specs/intent-driven-ai-coding/v3/03-module-assets.md`：Module 资产与代码层 Module 定义的映射。

## 目录结构概览

- `core/`
  - Logix 运行时本身的设计与实现：宣言、架构、API 契约、平台集成、实现架构、使用规范、场景与示例等。
  - 官方入口文档：`core/README.md`（聚合各子文档的推荐阅读路径与分组）。

- `guide/`
  - 面向「使用 Logix 写业务」的一线工程师与平台集成方的用户手册。
  - 覆盖从「我在架构里处于什么位置？」到「如何写第一个表单/列表」、「常见场景配方」等内容。

- `react/`
  - `@logix/react` 适配层的规范：生命周期管理、订阅模型、Context 注入、并发渲染与 Suspense 等。
  - 详细 API 说明见 `react/README.md` 及其子文档。

- `form/`
  - `@logix/form` 作为领域层客户端的规格：表单状态模型、事件协议与基于 React 的领域 Hooks。
  - 详细设计见 `form/README.md` 及其子文档。

- `test/`
  - `@logix/test` 测试工具包：提供 `TestRuntime`、`renderLogic` 与 `Scenario` 流畅测试 API。
  - 详细设计见 `impl/test-package.md`。

- `impl/`
  - 运行时实现备忘录与技术草图：围绕 `Logix.app` / `Logix.module` / ModuleDef、Logic Middleware、Store 生命周期等复杂能力的具体实现思路与风险评估。
  - 面向 runtime 实现者使用，不作为对外 API 契约；关键决策一旦稳定，会同步回写到 `core/` 规格文档。

> 讨论 Logix 能力与方案时，请优先参考 `core/` 下的文档；React/Form 相关内容分别沉淀在 `react/` / `form/` 中，使用示例与工作流则集中在 `guide/` 下，避免与引擎设计混淆。
