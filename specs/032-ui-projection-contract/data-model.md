# Data Model: UI Projection Contract（032：PresentationState / BindingSchema / UIBlueprint）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/032-ui-projection-contract/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/032-ui-projection-contract/plan.md`

> 本文件固化 032 的协议层数据模型（平台/编辑期资产），不规定具体 UI 框架或渲染实现。

## Design Principles

- **UI 无状态化（语义层驱动）**：UI 不持有语义真相源，所有行为可回放、可解释、可试运行验收。
- **绑定解耦**：UIBlueprint 不直接引用逻辑端口；BindingSchema 才连接 `uiPropKey/uiEventKey` ↔ `ports/exports`。
- **只读自身模块**：BindingSchema 默认绑定一个 `instanceId`，天然禁止跨模块读写。
- **确定性与可序列化**：默认不允许时间戳/随机作为语义输入；输出必须可 diff。

## Protocols（统一 `@logixjs/module.*` 域）

### `@logixjs/module.presentationState@v1`

语义层的展示态模型（不绑定 UI 技术栈），用于表达 overlay/route/stack 等“展示态真相源”。

Canonical schema：`specs/032-ui-projection-contract/contracts/schemas/presentation-state.schema.json`

### `@logixjs/module.bindingSchema@v1`

UI 插头（props/events）与逻辑插座（PortSpec/exports）的连接协议。

- `instanceId` 是唯一绑定锚点：UI 只能读写这个模块实例。
- `bindings[]` 分为两类：read（从 export/output 映射到 uiPropKey），dispatch（从 uiEventKey 派发 action/event，可选映射资产）。

Canonical schema：`specs/032-ui-projection-contract/contracts/schemas/binding-schema.schema.json`

### `@logixjs/module.uiBlueprint@v1`

纯投影蓝图：描述 UI 结构、布局、组件选择，以及“哪些 UI 节点产生哪些 uiPropKey/uiEventKey”。

- 不直接引用 ports/exports（避免语义耦合与 diff 噪音）
- 可自由演进（UI editor / 组件库替换）而不影响语义蓝图

Canonical schema：`specs/032-ui-projection-contract/contracts/schemas/ui-blueprint.schema.json`

### `@logixjs/module.uiKitRegistry@v1`

UI 组件库的“端口规格事实源”（UI 侧 PortSpec）：用于让平台在编辑/保存/验收时 **可校验、可补全、可解释**：

- 校验 `UiBlueprint.nodes[].componentKey` 是否存在
- 校验 `UiBlueprint.nodes[].propBindings[].propName` / `eventBindings[].eventName` 是否属于该组件
- 给画布/接线面板提供可用 props/events 列表（并标记可绑定性）

关于 IMD 的分层（`base/ui/pro`）：registry 的 `components[].tier` 用于表达组件在设计系统中的层级（并支持平台按视图过滤组件面板）：

- `pro`：优先作为画布/产品视角的默认组件面（语义更强、组合度更高，LLM 更容易选型与生成）。
- `ui`：作为开发视角的补充组件面（更偏“基础 UI 组件”，用于精细化投影）。
- `base`：默认不作为画布节点暴露（更接近 headless/primitive，实现细节多、语义弱）；必要时可在 Dev View 开启“高级面板”才可选。

Canonical schema：`specs/032-ui-projection-contract/contracts/schemas/ui-kit-registry.schema.json`

Example（IMD 抽样）：`specs/032-ui-projection-contract/contracts/examples/imd-ui-kit-registry.sample.json`  
Extractor（从 IMD 生成）：`scripts/extract-imd-ui-kit-registry.ts`

## Cross-Spec References

- 逻辑插座事实源：`specs/035-module-reference-space/contracts/schemas/module-port-spec.schema.json`（PortSpec）
- 映射资产引用：`specs/034-code-asset-protocol/contracts/schemas/code-asset-ref.schema.json`
- 语义蓝图事实源：`specs/033-module-stage-blueprints/contracts/schemas/stage-blueprint.schema.json`
