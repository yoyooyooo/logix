# Contracts: Public API（Workflow）

> 本文定义对外 API 口径；实现细节下沉 `packages/*/src/internal/**`。

## 1) `@logixjs/core`：Workflow（公共子模块）

目标：用“声明式 Program”表达自由工作流（Control Laws），并可被 mount 为 ModuleLogic。

> **定位裁决（v1）**：Workflow 是 AI/平台专属的 **出码层（IR DSL）**，核心目标是稳定、可序列化、可校验、可 diff、可解释；人类直接手写的舒适性不是第一约束。
>
> 因此对外 API 必须以“纯数据 + 可编译”为中心：所有语义在导出/编译期确定，运行时只消费编译产物。

命名关系（避免误解）：

- `Workflow`：对外 authoring/装配入口（定义/组合/validate/export/install）。
- `WorkflowStaticIr`（又称 Workflow Static IR / Π slice）：`Workflow.exportStaticIr(moduleId)` 的导出工件（`programId=moduleId.localId`）；平台/Devtools 通过 `ControlSurfaceManifest.workflowSurface` 消费它。
- `RuntimePlan`：内部热路径执行计划（索引/路由/预解析）；不对外交换，不进入 Root IR，不得以 IR 扫描替代。

## 0.1 双 SSoT：Authoring vs Platform（必须区分）

为避免“同一概念两套权威口径”，本特性明确存在两类 SSoT，分别服务不同消费者：

- **Authoring SSoT（可编辑）**：`WorkflowDef`（纯 JSON、版本化、可校验）。人/LLM/Studio 只能写它；所有语法糖必须确定性 materialize 到它。
- **Platform SSoT（只读消费）**：`ControlSurfaceManifest`（Root IR）+ `workflowSurface`（Π slice，包含 `WorkflowStaticIr`）。它们必须从 Authoring SSoT 确定性编译得到，用于平台/Devtools/CI gate/diff；禁止手改、禁止成为第二语义源。

## 1.0 DX 裁决：SSoT 分化 + Effect-native 一体化

本子模块对外同时提供两层形态（语义同一、无第二真相源）：

- **权威工件（SSoT）**：`WorkflowDef`（纯 JSON、可落盘、可 Schema 校验、版本化），是平台/LLM/Studio 的单一事实源。
- **值对象（DX）**：`Workflow` 是一个 Effect 风格的值：它携带 `WorkflowDef`，并提供冷路径方法（`validate/exportStaticIr/install`）。

约束：

- `Workflow` 的 `toJSON()` MUST 只导出 `WorkflowDef`（纯 JSON）；不得把 Tag/Effect/Fiber/闭包序列化进工件。
- `Workflow.fromJSON(def)`（或等价静态方法）用于把 `WorkflowDef` 恢复为值对象形态（补齐方法能力）。
- Platform-Grade/LLM 出码 MUST 以 `callById('<serviceId>')`（字面量）表达 service 调用；TS 侧允许写 `call(serviceTag)` 作为语法糖，但落盘/导出时一律解析为 `serviceId: string`（复用 078 的单点 helper；不要求 Parser/Autofill 解析 Tag）。

### 1.1 入口（概念）

- `Workflow.make(def)`：构造一个 Program 值对象（输入为 `WorkflowDef` 或等价的 def-like 形态；**禁止闭包**）
- `program.install(moduleTag)`：把 Program 绑定到 module 并编译+mount（产出 ModuleLogic）
  - 推荐 DX sugar：`Module.withWorkflow(program)`（内部等价于 `Module.withLogic(program.install(Module.tag))`）
- **推荐（平台/AI 出码 + 性能门槛）**：`Module.withWorkflows(programs)`（批量安装多个 programs，并保证每个 module instance 只产生 1 条 actions$ watcher Fiber；内部做 `actionTag -> programs[]` 路由）
- `program.exportStaticIr(moduleId)`：导出 JSON 可序列化 Static IR（供 Devtools/Alignment Lab 可视化与 diff；`programId=moduleId.localId`）
- `program.validate()`：导出/安装前的强校验入口（fail-fast；错误可机器修复；运行时不承担校验成本）
- `program.toJSON()`：导出 `WorkflowDef`（单一事实源，纯 JSON）
- `Workflow.fromJSON(def)`：从 `WorkflowDef` 恢复值对象（提供方法能力）

### 1.1.1 TS-only：actionTag 类型“手动挡”

`Workflow` 默认以 `actionTag: string` 为中心（平台/LLM 出码友好）。但在业务侧手写 workflow 时，可以选择启用**类型手动挡**来避免把 workflow 挂到错误 module、或 dispatch 到不存在的 action：

- `Workflow.make<typeof M>(...)`：当显式提供 `typeof M` 时，`trigger.actionTag` 与 `dispatch.actionTag` 会被约束为 `keyof M.actions`（编译期错误；运行时语义不变）。
- `Workflow.forModule(M)`：语法糖。返回一组“绑定了 `keyof M.actions`”的 DSL（`onAction/dispatch/make/...`），避免反复书写 `typeof M`。

约束（必须明确）：

- 该能力只影响 TypeScript 类型层；`WorkflowDef` / Static IR 仍是纯 JSON，可序列化字段仍是 `string`。
- 动态字符串（无法推导为字面量 union）在类型层仍会退化为 `string`，属于 TS 能力边界。

说明（避免“差点味道”的三条硬边界）：

- **Def ≠ Static IR**：`WorkflowDef` 是 authoring 输入（声明式、可落盘），Static IR 才是可序列化/可对比的单一真相源。
- **Canonical AST（唯一规范形）**：在 Spec 与 Static IR 之间存在 Canonical AST：无语法糖、默认值落地、分支显式、`stepKey` 完整；所有前端（Recipe/AI/Studio/TS DSL）必须先归一到 Canonical AST，再编译为 Static IR。
- **Tag-only call（推荐名）**：`call` 的 TS 语法糖只接受 `Context.Tag`；Static IR 中只保留 `serviceId: string`（由 Tag 派生，算法对齐 `specs/078-module-service-manifest/contracts/service-id.md`，必须单点实现）。
- **无用户闭包进入运行期**：Program 内不允许“运行时求值”的 user closure；复杂映射/条件下沉到 service/pattern（Program 只编排边界与策略）。

### 1.2 触发源（最小集合）

- `Workflow.onAction(actionTag)`
- `Workflow.onStart()` / `Workflow.onInit()`

### 1.3 步骤（最小集合）

v1 采用 **对象式 step 构造**（更像“定义工件”，避免链式执行错觉），并把 `stepKey` 前移为必填字段：

- `dispatch({ key, actionTag, payload? })`：默认写侧（可追踪）
- `callById({ key, serviceId, input?, timeoutMs?, retry?, onSuccess, onFailure })`：事务窗口外执行 IO；可产生 success/failure 分支（Platform-Grade/LLM 规范形）
  - `serviceId` 必须为字符串字面量（与 078 的规范化算法对齐；Static IR 只存 `serviceId: string`）
- `call({ key, service, input?, timeoutMs?, retry?, onSuccess, onFailure })`：等价 TS sugar
  - `service` 只接受 `Context.Tag`；落盘/导出时解析为 `serviceId`（不要求 Parser/Autofill 解析 Tag）
  - `input`：缺省时，Action 触发默认传入 `payload`；其它触发源为 `undefined`
  - `timeoutMs/retry`：时间语义必须进入 tick 参考系，并体现在可导出的 Static IR
  - `serviceTag` 建议代表“单一 operation 的 service port”（而不是一个包含多个方法的大而全 service）：
    - Static IR 只记录 `serviceId` 而不记录 methodName；多操作应拆分为多个 Tag（每个 Tag 对应一个 port/操作）
- `delay({ key, ms })`：必须进入 tick 参考系（禁止影子 `setTimeout`）

> 关于“看起来像 Traits 的能力”（例如 `source.refresh`）：不进入 core steps。推荐通过 `callById('logix/kernel/<port>')`（TS sugar：`call(KernelPorts.<Port>)`）表达；如确需语法糖，一律进入 `Workflow.Ext.*` 并走版本化/预算/诊断门控（见 2) 约束）。

### 1.3.1 输入映射 DSL（v1，最小）

Workflow v1 允许在不引入 user closure 的前提下，表达最小“结构映射”，用于 `call.input` 与 `dispatch(payload)`：

- **允许**：`payload`、`payload.path`（JSON Pointer）、`const`、`object`、`merge`
- **禁止**：读取 state/traits、条件/循环/算术、引用 `call` 返回值

> 该 DSL 的目标是服务“平台/AI 出码”，并保证编译与校验可完全前置；复杂映射继续下沉到 service/pattern。

### 1.4 策略

- 并发：`latest | exhaust | parallel`（与既有 FlowRuntime 语义一致）
- priority：`urgent | nonUrgent`（与 073 lanes 对齐）

### 1.5 组合（Build-time Composition）

目标：在不引入运行时闭包的前提下，增强 DSL 的表达能力与组合性；组合的产物仍必须可被编译为单一 Static IR。

- `Workflow.fragment(fragmentId, steps)`：定义可复用片段（fragment）
  - fragment 是 build-time 结构单元：用于复用/组合；编译后 fragment 边界可映射到 IR 节点的 `source.fragmentId`（或等价可序列化字段）
- `Workflow.compose(...parts)`：组合步骤与片段，生成 `steps`（序列化的结构 AST，而不是运行时函数管道）
- `Workflow.withPolicy(policy, stepsOrFragment)`：为一段结构附加策略（例如默认并发/时间策略）

组合细节（v1 硬口径：stepKey 唯一性、compose 语义、withPolicy 合并优先级）见 `data-model.md#workflow-composition`。

明确不做（避免歧义）：

- 不把 `Effect.pipe/map/flatMap` 作为 Workflow 的结构 DSL：这些 API 以任意函数闭包为中心，无法可靠 IR 化/序列化；Effect 仅用于运行时解释执行（FlowRuntime/IO/Timer 之下的执行层）。

## 2) 约束（必须）

- Program 必须可导出为 Static IR（JSON 可序列化，带 version+digest）。
- 写侧默认仅允许 dispatch；禁止把 direct state write 作为 Program step（避免写逃逸）。
- 时间算子必须可回放/可解释：timer 触发必须能归因到 tickSeq。
- **表面语法糖自由，但语义不自由**：任何 sugar MUST 100% 可确定性降糖到 Canonical AST；禁止隐式降级为 opaque。
- **stepKey 必填**：除 Recipe 的确定性补全外，缺失/冲突必须 fail-fast（并产出可机器修复的结构化错误）。

## 3) Recipe（压缩前端）与 Canonical AST（规范形）

v1 引入 Recipe 作为“压缩输入”形态：它不是另一套语义语言，而是可确定性展开为 Canonical AST 的模板层。

### 3.1 Recipe 的职责

- 输入：少量参数（触发、调用的 service、策略、成功/失败处理…），且必须纯数据（JSON 可序列化）
- 输出：Canonical AST（唯一规范形；无语法糖；分支显式；`stepKey` 完整）
- 目标：让业务侧/AI 以更短的描述获得“少胶水”的 workflow，同时不牺牲 IR 的稳定性与可诊断性

### 3.2 Canonical AST 的职责（关键不变量）

- 同一语义只有一种表示：去 sugar、补默认、显式分支、稳定 key
- 所有 step 必须具备 `stepKey`（缺失 fail-fast）
- `call`（原 `serviceCall`）v1 只表达控制流（success/failure），不提供结果数据流

> Canonical AST 的精确定义与示例见 `data-model.md`。
