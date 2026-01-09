# Data Model: Module Ports & TypeIR（035：PortSpec/TypeIR）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-ports-typeir/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-ports-typeir/plan.md`

> 本文件固化 035 的协议层数据模型；实现细节以 runtime 代码与后续 tasks 为准。

## Design Principles

- **平台 SSoT**：PortSpec/TypeIR 是 platform-grade 的引用空间与类型事实源。
- **可降级**：TypeIR 缺失/截断时，平台仍必须可用（至少 key-level 校验）。
- **确定性**：稳定排序/稳定字段；避免 diff 噪音。

## Artifact Keys（通过 031 artifacts 槽位导出）

- `@logixjs/module.portSpec@v1` → `ModulePortSpec@v1`
- `@logixjs/module.typeIr@v1` → `TypeIR@v1`

## Entity: PortAddress（寻址基元）

用于描述一个“逻辑插座”的地址（不含 instanceId；instanceId 属于 033/032 的语义/投影层绑定锚点）。

Canonical schema：`specs/035-module-ports-typeir/contracts/schemas/port-address.schema.json`

## Entity: ModulePortSpec@v1

最小必须覆盖：

- `moduleId`
- `actions[] / events[] / outputs[]`
- `exports[]`（公开可读状态路径空间）

Canonical schema：`specs/035-module-ports-typeir/contracts/schemas/module-port-spec.schema.json`

## Entity: TypeIR@v1

与 PortSpec 对齐的类型摘要/引用 IR：

- 可截断（`truncated=true`）
- 必须可解释（预算摘要/原因）

Canonical schema：`specs/035-module-ports-typeir/contracts/schemas/type-ir.schema.json`

## Implementation Hint（非协议）：从 SchemaAST 投影

当模块的 state/actions/events 等“类型事实”来自 `effect/Schema` 时：

- 可从 `schema.ast`（SchemaAST）做投影生成 `TypeIR@v1`（注意：**不要**直接序列化 SchemaAST）。
- 递归/brand/transform/union 等节点需要显式降级策略（避免无限递归与误报）；可参考 `packages/logix-core/src/internal/state-trait/converge.ts` 的 `schemaHasPath` 处理方式。

## Cross-Spec References

- 032 BindingSchema 只允许引用 output/export：`specs/032-ui-projection-contract/contracts/schemas/binding-schema.schema.json`
- 033 IntentRule source/sink 使用 event/action：`specs/033-module-stage-blueprints/contracts/schemas/intent-rule.schema.json`
