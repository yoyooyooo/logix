# Research: Expression Asset Protocol（034：codeAsset + deps/digest + sandbox 约束）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/034-expression-asset-protocol/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/034-expression-asset-protocol/plan.md`

> 本文件只固化“关键裁决/权衡”，避免资产协议漂移成某个表达式语言的实现细节。  
> IR vs AST（上帝视角）外链：`docs/ssot/runtime/logix-core/concepts/04-ir-vs-ast-and-agent-coding.md`

## Decisions

### D001：资产必须“双层结构”（源码层 + 规范化 IR 层）

**Decision**：保存期必须固化 `source`（可读源码）与 `normalizedIr`（规范化 IR），并输出 `deps + digest`。  
**Rationale**：平台需要可 diff/可审阅/可治理的事实层；同时保留源码层用于人审与可逆重生成。  
**Link**：`specs/034-expression-asset-protocol/spec.md`（FR-002/003/004）

### D002：可解析子集与黑盒资产必须显式区分

**Decision**：当推导失败或资产超出可解析子集时，必须标记为 blackbox，并强制显式 `deps/能力/预算`；平台不得对其做结构编辑或自动重写。  
**Rationale**：承认“不可解析”是现实，但不能让它变成不可治理黑洞。  
**Link**：`specs/034-expression-asset-protocol/spec.md`（FR-011）

### D003：依赖模型必须对齐 PortSpec/TypeIR（禁止并行引用空间）

**Decision**：deps 的地址空间以 035 的 PortAddress/exports 为基元；平台补全与 lint 只认这套事实源。  
**Rationale**：避免平台侧靠源码推断形成第二套“可引用空间”。  

## Open Questions（先落盘，后续再定优先级）

1. 规范化 IR 的具体形状：表达式是“树（AST-like）”还是“图（SSA-like）”？（不要求与 TS AST 对齐）
2. digest 算法与 canonicalization：字段排序、数组顺序、数值/字面量规范化的口径。
3. sandbox 的确定性 enforcement：静态检查 vs 运行期拦截（预算/超时/输出裁剪）的分工边界。

## References

- 035 PortSpec/TypeIR：`specs/035-module-ports-typeir/spec.md`
- 033 StageBlueprint/IntentRule：`specs/033-module-stage-blueprints/spec.md`
- 031 artifacts 槽位：`specs/031-trialrun-artifacts/spec.md`
- 036 IR-first 闭环：`specs/036-workbench-contract-suite/spec.md`
