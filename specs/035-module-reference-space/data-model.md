# Data Model: Module Reference Space（035：PortSpec/TypeIR + CodeAsset）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-reference-space/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-reference-space/plan.md`

> 本文件固化 035 的协议层数据模型；实现细节以 runtime 代码与后续 tasks 为准。

## Design Principles

- **平台 SSoT**：PortSpec/TypeIR 是 platform-grade 的引用空间与类型事实源。
- **可降级**：TypeIR 缺失/截断时，平台仍必须可用（至少 key-level 校验）。
- **确定性**：稳定排序/稳定字段；避免 diff 噪音。
- **可审阅**：资产保存期固化 `normalizedIr + deps + digest`；diff 噪音可控。
- **可治理**：黑盒资产允许存在，但必须显式声明 deps/能力/预算；不得“偷跑”。

## Artifact Keys（通过 031 artifacts 槽位导出）

- `@logixjs/module.portSpec@v1` → `ModulePortSpec@v1`
- `@logixjs/module.typeIr@v1` → `TypeIR@v1`

## Asset Protocols（非 artifacts）

下列协议作为“输入资产/可持久化工件”存在（通常由平台保存），并被 032/033/036 消费：

- `@logixjs/module.codeAsset@v1` → `CodeAsset@v1`
- `@logixjs/module.deps@v1` → `Deps@v1`
- `@logixjs/module.reversibilityAnchor@v1` → `ReversibilityAnchor@v1`

## Entity: PortAddress（寻址基元）

用于描述一个“逻辑插座”的地址（不含 instanceId；instanceId 属于 033/032 的语义/投影层绑定锚点）。

Canonical schema：`specs/035-module-reference-space/contracts/schemas/port-address.schema.json`

## Entity: ModulePortSpec@v1

最小必须覆盖：

- `moduleId`
- `actions[] / events[] / outputs[]`
- `exports[]`（公开可读状态路径空间）

Canonical schema：`specs/035-module-reference-space/contracts/schemas/module-port-spec.schema.json`

## Entity: TypeIR@v1

与 PortSpec 对齐的类型摘要/引用 IR：

- 可截断（`truncated=true`）
- 必须可解释（预算摘要/原因）

Canonical schema：`specs/035-module-reference-space/contracts/schemas/type-ir.schema.json`

## Entity: CodeAsset@v1

统一承载两类资产（用 `kind` 区分）：

- `kind="expression"`：映射/条件表达式（用于 IntentRule / BindingSchema 的 payload/patch 变换）
- `kind="validator"`：校验资产（用于 rules/check 等场景）

字段核心：

- `source`：可编辑源码层（truth）
- `normalizedIr`：规范化 IR（可 diff/可重写；可解析子集或 blackbox）
- `analysis.parseable`：是否为可解析子集；黑盒必须给出 `blackboxReason`（可选）
- `deps`：显式依赖（reads/services/configs）
- `digest`：稳定摘要（由 `normalizedIr` 稳定派生）
- `budgets/capabilities`：sandbox 约束与能力声明
- `anchor`：可逆溯源锚点（不影响运行语义）

Canonical schema：`specs/035-module-reference-space/contracts/schemas/code-asset.schema.json`

## Entity: Deps@v1

显式依赖清单：至少覆盖 `reads`（仅允许 `output/export`）+ `services` + `configs`。

Canonical schema：`specs/035-module-reference-space/contracts/schemas/deps.schema.json`

## Entity: ReversibilityAnchor@v1

可逆溯源锚点：允许携带 spec/ui/generated 指针、生成指纹与人类说明，用于 agent 重生成与 drift detection。

Canonical schema：`specs/035-module-reference-space/contracts/schemas/reversibility-anchor.schema.json`

## Entity: CodeAssetRef@v1

以 `digest` 作为最小引用锚点（供 032/033 引用资产）。

Canonical schema：`specs/035-module-reference-space/contracts/schemas/code-asset-ref.schema.json`

## Implementation Hint（非协议）：从 SchemaAST 投影

当模块的 state/actions/events 等“类型事实”来自 `effect/Schema` 时：

- 可从 `schema.ast`（SchemaAST）做投影生成 `TypeIR@v1`（注意：**不要**直接序列化 SchemaAST）。
- 递归/brand/transform/union 等节点需要显式降级策略（避免无限递归与误报）；可参考 `packages/logix-core/src/internal/state-trait/converge.ts` 的 `schemaHasPath` 处理方式。

## Cross-Spec References

- 032 BindingSchema 只允许引用 output/export：`specs/032-ui-projection-contract/contracts/schemas/binding-schema.schema.json`
- 033 IntentRule source/sink 使用 event/action：`specs/033-module-stage-blueprints/contracts/schemas/intent-rule.schema.json`
- 036 ContextPack 可携带 codeAssets：`specs/036-workbench-contract-suite/contracts/schemas/contract-suite-context-pack.schema.json`
