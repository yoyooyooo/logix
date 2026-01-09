# Logix Engine Specs · 导航与分层（LLM 入口）

本目录汇总 **Logix Engine** 相关的规格与实现备忘录。为节约 token，多数长文已改为“薄入口 + 分节文件”；默认只读最短链路，按需下钻。

## 最短链路（按任务）

- 写业务 Module-first：`logix-core/api/02-module-and-logic-api.md` → `logix-core/api/03-logic-and-flow.md` → `logix-core/examples/`
- 拼装 Root/Runtime：`logix-core/api/02-module-and-logic-api.md`（runtime container 分节）→ `logix-core/runtime/05-runtime-implementation.md`
- React 集成：`logix-react/01-react-integration.md`
- 调试/诊断：`logix-core/observability/09-debugging.md`

## 上游平台 SSoT（只在需要对齐术语/协议时读）

- `docs/ssot/platform/foundation/02-glossary.md`

## 一条黄金链路（ModuleDef → Logic → Fluent → IntentRule）

从 Runtime 视角看，当前主线围绕一条标准链路设计：

> **ModuleDef → ModuleDef.logic(($) => ...) → $.use(ModuleDef) → Fluent DSL (`$.onState`/`$.onAction` / `$.on`+`.update/.mutate/.run\*`) → IntentRule**

简要说明：

- 在定义层，用 `Logix.Module.make('Id', { state, actions })` 定义领域模块（返回 `ModuleDef`，带 `moduleDef.tag`）；
- 在逻辑层，通过 `ModuleDef.logic(($)=>Effect.gen(...))` 编写 Logic，`$` 绑定当前 ModuleRuntime + 业务 Env；
- 在协作层，通过 `$.use(OtherDef)`（等价 `OtherDef.tag`）获取跨模块句柄，用 Fluent DSL 表达联动；
- 在平台层，这些 Fluent 链被解析为 `IntentRule` IR，用于 Universe/Galaxy 视图与图码双向同步。

详细规范可在以下文档中查阅：

- `logix-core/api/02-module-and-logic-api.md`：ModuleDef / Module / ModuleImpl / Live / `$`；
- `logix-core/api/03-logic-and-flow.md`：Bound API `$`、Logic / Flow / 结构化控制流、Parser 约束与链路示例；
- `logix-core/platform/06-platform-integration.md`：IntentRule IR 与平台集成；
  - `docs/ssot/platform/assets/10-module-assets.md`：Module 资产与代码层 Module 定义的映射。

## 目录结构概览

- `logix-core/`
  - `@logixjs/core`（Logix Runtime 内核）的设计与实现：宣言、架构、API 契约、平台集成、实现架构、使用规范、场景与示例等。
  - 官方入口文档：`logix-core/README.md`（聚合各子文档的推荐阅读路径与分组）。

- `apps/docs/`
  - 面向「使用 Logix 写业务」的一线工程师与平台集成方的用户文档站点（Guide/API/Recipes）。
  - 内容位于 `apps/docs/content/docs`，用于承载对外叙事与可复制示例。

- `logix-react/`
  - `@logixjs/react` 适配层的规范：生命周期管理、订阅模型、Context 注入、并发渲染与 Suspense 等。
  - 官方入口文档：`logix-react/README.md`。

- `logix-form/`
  - `@logixjs/form` 作为领域层客户端的规格：表单状态模型、事件协议与基于 React 的领域 Hooks。
  - 详细设计见 `logix-form/README.md` 及其子文档；示例包见 `examples/logix-form-poc`（历史目录名保留）。

- `logix-form/impl/`
  - Form 实现备忘录：rules/derived 的编译产物（最小 IR）、TraitSpec 降解、validate/writeback 与 RulesManifest 等。
  - 面向 form 维护者使用，不作为对外 API 契约；关键裁决稳定后需同步回写到用户文档与 form 规格文档。

- `logix-test/`
  - `@logixjs/test` 测试工具包：提供 `TestRuntime`、`TestProgram` 与 `runTest` 等基础测试 API。当前实现已覆盖 Logic 场景编排与状态断言，高级能力（如基于 Trace 的断言 DSL、ExecutionDump 等）仍在演进中，设计见 `logix-test/01-test-kit-design.md`。
  - 官方入口文档：`logix-test/README.md`。

- `logix-core/impl/`
  - 运行时实现备忘录与技术草图：围绕应用级 AppRuntime（内部基于 `AppRuntime.makeApp`）、`Logix.Module` / ModuleDef、Logic Middleware、Store 生命周期等复杂能力的具体实现思路与风险评估。
  - 面向 runtime 实现者使用，不作为对外 API 契约；关键决策一旦稳定，会同步回写到 `logix-core/` 规格文档。

- `builder-sdk/`
  - 面向平台/出码链路的 Builder 设计；入口见 `builder-sdk/README.md`。

> 讨论 Logix 能力与方案时，请优先参考 `logix-core/` 下的文档；React/Form 相关内容分别沉淀在 `logix-react/` / `logix-form/` 中；对外使用指南与示例以 `apps/docs` 为准，避免与引擎设计混淆。

## 实现视角补充（非 SSoT）

- `docs/ssot/handbook/long-chain-index.md`：维护者/LLM 的长链路正交分解索引（A–K）与“分贝”指针。

## 检索与源码导航（可选）

- `docs/ssot/handbook/auggie-playbook.md`：auggie 检索链路压缩包（smoke test + 黄金链路分步查询）。
- `docs/ssot/handbook/codebase-playbook.md`：源码导航压缩包（入口 → 内核 → 回归）。
