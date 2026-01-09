# Research: UI Projection Contract（032：语义编排与 UI 投影解耦）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/032-ui-projection-contract/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/032-ui-projection-contract/plan.md`

> 本文件只固化“关键裁决/权衡”，避免 032 漂移为某个 UI 框架的实现细节。  
> runtime/IR 证据链外链：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`

## Decisions

### D001：UI 不是事实源（只读自身模块 + 仅派发事件/动作）

**Decision**：UI 层不得维护“弹框是否打开/栈顺序/路由”等语义真相源；UI 只读自身绑定模块公开状态，交互只能派发该模块事件/动作。  
**Rationale**：这是可回放/可解释/可多投影的前提；否则会形成隐式依赖与不可审阅行为。  
**Link**：`specs/032-ui-projection-contract/spec.md`（FR-001/003/004）

### D002：BindingSchema 作为唯一桥梁（UI 与语义彻底解耦）

**Decision**：UIBlueprint 不允许直接引用 PortSpec/exports；它只声明 `uiPropKey/uiEventKey`，BindingSchema 才把这些 key 映射到逻辑插座（ports/exports）。  
**Rationale**：让 UI 投影可替换且 diff 噪音最小；语义校验集中在 BindingSchema（可用 035 事实源做 autocomplete 与 lint）。  
**Implication**：BindingSchema 默认“一模块实例一份”，天然禁止跨模块读取。

### D003：协议统一放在 `@logixjs/module.*` 概念域

**Decision**：presentationState/bindingSchema/uiBlueprint 统一使用 `@logixjs/module.*@vN` 版本化命名。  
**Rationale**：UI 投影是平台基础设施能力，不应绑定具体实现包名或组件库。

### D004：UI Kit Registry 作为 UI 侧端口规格事实源

**Decision**：平台不从 UI 代码/运行时行为“推断”组件可用 props/events；而是显式引入 `@logixjs/module.uiKitRegistry@v1` 作为 UI 侧 PortSpec。  
**Rationale**：这是把“语义化 UI”真正变成可编辑、可补全、可校验的前提；同时能为 Agent 提供稳定、可机器校验的 UI 插口面。  
**Links**：

- Schema：`specs/032-ui-projection-contract/contracts/schemas/ui-kit-registry.schema.json`
- 示例（IMD 抽样）：`specs/032-ui-projection-contract/contracts/examples/imd-ui-kit-registry.sample.json`
- 生成脚本：`scripts/extract-imd-ui-kit-registry.ts`

## Open Questions（先落盘，后续再定优先级）

1. PresentationState 的最小覆盖面：overlay/route/stack/focus/selection 的边界与恢复语义（刷新/重进）。
2. 动态列表的 UI 渲染与 rowRef 传递：BindingSchema 是否需要显式表达 repeat/rowScope，还是交给 UIBlueprint 的结构表达？
3. BindingSchema 的类型校验：TypeIR 缺失/截断时的降级策略（仅 key-level 校验 vs 允许显式 blackbox）。

## References

- 035 PortSpec/TypeIR（引用空间事实源）：`specs/035-module-ports-typeir/spec.md`
- 033 语义蓝图（语义事实源）：`specs/033-module-stage-blueprints/spec.md`
- 034 资产协议（映射/条件表达式）：`specs/034-expression-asset-protocol/spec.md`
