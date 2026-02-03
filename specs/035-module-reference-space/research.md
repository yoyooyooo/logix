# Research: Module Reference Space（035：引用空间事实源）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-reference-space/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-reference-space/plan.md`

> 本文件只固化关键裁决，避免 035 漂移成“平台侧源码推断规则”。  
> IR/trial-run 工件链路外链：`docs/ssot/runtime/logix-core/api/07-ir-pipeline-from-irpage.md`

## Decisions

### D001：PortSpec 是平台引用空间的唯一事实源（禁止并行推断）

**Decision**：平台 autocomplete 与 lint 必须只依赖导出的 `@logixjs/module.portSpec@v1`（以及可选的 TypeIR），不得以源码推断作为真相源。  
**Rationale**：源码推断不可控且易漂移；PortSpec 由 trial-run 从最终可运行形状导出，更能反映真实边界。

### D002：TypeIR 是 best-effort，可截断但必须显式

**Decision**：TypeIR 超预算允许截断，但必须标注 `truncated` 与预算摘要；平台在 TypeIR 缺失/截断时必须可降级为 key-level 校验。  
**Rationale**：类型系统容易爆炸；必须保持平台可用与可解释性优先。

### D003：统一寻址基元 PortAddress

**Decision**：ports/exports 的地址统一为 `PortAddress`（kind + key/path），由 schema 固化，并被 032/033/036 引用。  
**Rationale**：减少协议间重复与口径漂移，便于 Agent 生成与校验。

### D004：SchemaAST 与 TypeIR 的关系（可利用，但不外泄）

**Decision**：`@logixjs/module.typeIr@v1` 的实现**可以**基于 `effect/Schema` 的 `Schema.ast`（SchemaAST）做投影，但 SchemaAST 本体**不得**作为协议输出或平台事实源。  
**Rationale**：

- SchemaAST 擅长表达“数据形状”，正好覆盖 TypeIR 的目标域；但它不是 `JsonValue`，也会随 effect 版本演进。
- 平台侧应只消费稳定的 TypeIR/PortSpec 工件，避免“平台直接解析用户代码/Schema”形成并行真相源。

**Existing evidence**：runtime 里已在 `packages/logix-core/src/internal/state-trait/converge.ts` 使用 `effect/SchemaAST` 做 fieldPath 静态判定与诊断（`schemaHasPath/schemaHasFieldPath`）。

> 说明：CodeAsset/Deps/Digest/Anchor 与 sandbox 预览相关裁决已拆分为 034：`specs/034-code-asset-protocol/`。

## Open Questions（先落盘，后续再定优先级）

1. exports 的路径语义：JSON Pointer vs dot-path；是否需要规范化规则与可逆转换？
2. TypeIR 的 type node 最小集合：哪些 type kind 是 v1 必须，哪些可作为 JsonValue 摘要延后？
3. PortSpec 与 Manifest/StaticIR 的同源对照：不一致时默认 WARN 还是 FAIL？（由 036 的降级矩阵最终裁决）

## References

- 031 artifacts 槽位：`specs/031-trialrun-artifacts/spec.md`
- 034 资产协议：`specs/034-code-asset-protocol/spec.md`
- 036 Contract Suite：`specs/036-workbench-contract-suite/spec.md`
