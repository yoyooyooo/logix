---
title: 语义化 UI × 画布编排：端口/插座模型对齐（036 统筹）
status: living
date: 2025-12-26
---

# 语义化 UI × 画布编排：端口/插座模型对齐（036 统筹）

> 目标：回答一个问题——**语义化 UI 能否与画布编排逻辑层形成“插座/插口”关系，并且提前打通？**  
> 结论：**可以**。在本仓当前规划里，这个“插座/插口”并不需要发明新概念，直接复用 `@logixjs/module.*` 现有协议即可完成端口化打通。

## 0) 只保留一条主结论

把语义化 UI 看成**另一张端口面（port surface）**：

- 模块端口面：来自 `@logixjs/module.portSpec@v1`（035）+ `@logixjs/module.typeIr@v1`
- UI 端口面：来自 `@logixjs/module.uiBlueprint@v1`（032：声明 uiPropKey/uiEventKey）+ UI 组件库（Semantic UI）的 componentKey/spec
- 接线层：`@logixjs/module.bindingSchema@v1`（032：把 uiPropKey/uiEventKey ↔ PortAddress 接起来）
- 跨模块编排：`@logixjs/module.stageBlueprint@v1` + `@logixjs/module.intentRule@v1`（033：跨实例规则边）

平台交互上可以把它们统一渲染成“画布上的端口与连线”，存储上仍保持 032/033 的职责边界（避免并行真相源）。

## 1) 语义化 UI 草案口径（外链）

- 语义组件与接线模型：`docs/specs/sdd-platform/workbench/ui-ux/04-semantic-ui-modeling.md`
  - `UiPort`：语义组件实例（type/slots/inputs/outputs）
  - `UiBinding`：prop ← module(state/view/trait)
  - `UiSignal`：event → module(action/intent)
- Sandbox 中的 Mock 分层：`docs/specs/drafts/topics/sandbox-runtime/20-dependency-and-mock-strategy.md`
- 多视图原则（同一工件多投影）：`docs/specs/sdd-platform/workbench/ui-ux/05-multi-view-principles.md`
- 平台术语裁决（Universal Spy / Semantic UI Mock / UI_INTENT）：`docs/specs/sdd-platform/ssot/foundation/02-glossary.md`

## 2) 与 032/033/035 的“插座/插口”映射（不引入新协议）

### 2.1 语义组件树（UiPort）落到 `UiBlueprint`

`UiPort`（草案）在协议层的最小落点就是 `@logixjs/module.uiBlueprint@v1`：

- `UiPort.id` → `UiBlueprint.nodes[].nodeId`
- `UiPort.type` → `UiBlueprint.nodes[].componentKey`
- `UiPort.inputs.props` → `UiBlueprint.nodes[].staticProps`
- `UiPort.slots/children` → 由 `UiBlueprint.nodes[]` 的组织方式表达（当前 schema 不强制树结构；由 editor 决定是否额外编码 parent/children）

> 注：`UiBlueprint` 的职责是“投影与组件选择 + 声明哪些 uiPropKey/uiEventKey 存在”，不直接引用模块端口（避免耦合与 diff 噪音）。

### 2.2 UI ↔ 模块：端口接线落到 `BindingSchema`

`UiBinding/UiSignal`（草案）在协议层的落点就是 `@logixjs/module.bindingSchema@v1`：

- **prop 绑定（读）**：`BindingSchema.bindings[kind=read]`
  - `uiPropKey`（UI 侧插口） ← `PortAddress(kind=export|output)`（模块侧插座）
- **event 接线（派发）**：`BindingSchema.bindings[kind=dispatch]`
  - `uiEventKey`（UI 侧插口） → `PortAddress(kind=action|event)`（模块侧插座）
  - 可选 `mapping: CodeAssetRef`（034）用于 payload 变换/补丁生成

这就是你想要的“插座/插口”关系：UI 只暴露 `uiPropKey/uiEventKey`，模块只暴露 `PortAddress`，接线在 `BindingSchema` 里完成且可 diff。

### 2.3 模块端口面来自 `PortSpec/TypeIR`

模块“可被接线的插座”来自 035：

- `@logixjs/module.portSpec@v1`（actions/events/outputs/exports）
- `@logixjs/module.typeIr@v1`（这些端口的类型摘要，可截断但必须显式）

UI editor / 画布只消费这里的事实源，不允许手工编造“某模块有某字段/某 action”。

### 2.4 跨模块编排（逻辑画布）

跨模块协作不通过 UI 直接跨实例读写，而通过 033 的语义边：

- `@logixjs/module.stageBlueprint@v1`：实例图（instanceId ↔ moduleId）
- `@logixjs/module.intentRule@v1`：规则边（source/sink + 可选 mapping 资产）

因此 UI 想影响别的模块，默认路径是：

1) UI `uiEventKey` → 绑定到“自身模块”的某个端口（`BindingSchema.dispatch`）  
2) 再由 `IntentRule`（033）把这个“自身模块端口变化/事件”连到目标模块 action

这样边界保持清晰：**UI 只接自己，跨模块只走语义边**（与 032/033 的约束一致）。

## 3) 让它“真正打通”的三个关键工程点（建议尽早拍板）

### 3.1 稳定锚点：把 UI 运行证据挂回蓝图与端口

Semantic UI Mock 在 Sandbox 里会产出 `UI_INTENT`（PoC 已有 `UiIntentPacket`）：

- 现状（PoC）：`packages/logix-sandbox/src/Types.ts#UiIntentPacket` + Worker 事件 `UI_INTENT`
- 建议：让 `UiIntentPacket.id` **稳定对齐** `UiBlueprint.nodes[].nodeId`（或至少可单向映射）

这会直接决定 Devtools/Contract Suite 是否能做到：

- 点选画布上的 UI 节点 → 过滤出对应 UI_INTENT / TraceSpan / 日志
- Contract Suite 用 UI_INTENT 的 `meta.storyId/stepId`（草案已有）做 Scenario step 覆盖与对齐

### 3.2 UI 组件“端口规格”（UI 侧 PortSpec）

要把语义化 UI 的“插口面”做成可编辑、可提示、可校验，需要一个 UI 组件库的“端口规格”事实源（不一定要放进 032/033/035 的协议里，但必须有 SSoT）：

- 每个 `componentKey` 定义：可绑定的 props、可触发的 events、slots、以及（可选）类型摘要
- 该事实源可作为 Workbench/Agent 的只读输入（036 的 Context Pack 可携带 refs）

协议落点（032）：`@logixjs/module.uiKitRegistry@v1`（schema：`specs/032-ui-projection-contract/contracts/schemas/ui-kit-registry.schema.json`）。

实现上，它可以复用 040 的 SchemaAST 升级路线：用 SchemaAST/TypeScript 类型做投影，生成“UI 端口 TypeIR”，但**对外只暴露投影结果**（不要把 SchemaAST 本体当协议）。

### 3.3 多视图投影：用 `tier` 把“产品视角/开发视角”做成同一份工件的不同投影

`docs/specs/sdd-platform/workbench/ui-ux/05-multi-view-principles.md` 的裁决是“一套工件，多种投影”。把它落到本仓的 032/036 体系上，建议直接用 `@logixjs/module.uiKitRegistry@v1.components[].tier` 驱动“画布组件面板”的裁剪：

- **Product View（默认）**：只展示语义组件树 + 高层绑定摘要；组件面板只露 `tier=pro`（语义强、组合度高，LLM 更易选型与生成）。
- **Dev View（开关）**：展示 props/events 的接线面板与失败诊断；组件面板额外露 `tier=ui`（更细粒度的 UI 组件）。
- **Advanced（可选）**：允许露出 `tier=base`（headless/primitive），但必须明确其“语义弱/实现细节多/更易引入漂移”，并默认关闭。

这样不需要发明第二套“产品平台/开发平台”：同一份 `UiBlueprint/BindingSchema` 事实源在 UI 上按视图投影即可。

## 4) 与旧 UIIntentNode 口径的关系（避免并行真相源）

`docs/specs/sdd-platform/ssot/assets/00-assets-and-schemas.md` 中的 `UIIntentNode` 是早期口径：

- 可作为“历史叙事/概念背景”
- 不建议继续扩展为平台事实源协议

当需要“可编辑的语义 UI + 接线 + 试跑证据”时，应以 032/033/035/036 的 `@logixjs/module.*` 合同套件为准，避免出现两套 UI 事实源漂移。
