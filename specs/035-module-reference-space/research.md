# Research: Module Reference Space（035：引用空间事实源 + 资产协议）

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

### D005：资产必须“双层结构”（源码层 + 规范化 IR 层）

**Decision**：保存期必须固化 `source`（可读源码）与 `normalizedIr`（规范化 IR），并输出 `deps + digest`。  
**Rationale**：平台需要可 diff/可审阅/可治理的事实层；同时保留源码层用于人审与可逆重生成。  

### D006：可解析子集与黑盒资产必须显式区分

**Decision**：当推导失败或资产超出可解析子集时，必须标记为 blackbox，并强制显式 `deps/能力/预算`；平台不得对其做结构编辑或自动重写。  
**Rationale**：承认“不可解析”是现实，但不能让它变成不可治理黑洞。  

### D007：依赖模型必须对齐 PortSpec/TypeIR（禁止并行引用空间）

**Decision**：deps 的地址空间以 035 的 `PortAddress`/exports 为基元；平台补全与 lint 只认这套事实源。  
**Rationale**：避免平台侧靠源码推断形成第二套“可引用空间”。  

### D008：digest 必须确定性、且只由稳定字段派生

**Decision**：`digest` 只能由 `normalizedIr` 的稳定表示派生（禁止时间戳/随机盐/机器特异信息）。  
**Rationale**：digest 是引用锚点与 diff/caching 基线，必须可复现、可审阅。  

### D009：sandbox 预览以“确定性 + 预算”作为硬门槛

**Decision**：资产预览执行必须受控：确定性违规/超时/超预算/缺失能力都必须以结构化错误收束；禁止挂死与静默降级。  
**Rationale**：预览是平台/agent 的核心反馈回路，若不可控将导致系统性不可信。

## Open Questions（先落盘，后续再定优先级）

1. exports 的路径语义：JSON Pointer vs dot-path；是否需要规范化规则与可逆转换？
2. TypeIR 的 type node 最小集合：哪些 type kind 是 v1 必须，哪些可作为 JsonValue 摘要延后？
3. PortSpec 与 Manifest/StaticIR 的同源对照：不一致时默认 WARN 还是 FAIL？（由 036 的降级矩阵最终裁决）

## References

- 031 artifacts 槽位：`specs/031-trialrun-artifacts/spec.md`
- 036 Contract Suite：`specs/036-workbench-contract-suite/spec.md`
