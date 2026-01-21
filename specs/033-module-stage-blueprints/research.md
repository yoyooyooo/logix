# Research: Module Stage Blueprints（033：语义蓝图 / IntentRule / rowRef）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/033-module-stage-blueprints/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/033-module-stage-blueprints/plan.md`

> 本文件只固化关键裁决，避免 033 漂移成“UI 画布实现细节”或“runtime 解释器”。  
> IR-first / Agent 出码闭环原则外链：`docs/ssot/runtime/logix-core/concepts/04-ir-vs-ast-and-agent-coding.md`

## Decisions

### D001：语义蓝图是事实源，但不进入运行时解释路径

**Decision**：StageBlueprint 是可持久化、可 diff 的语义事实源；运行时不解释蓝图，生产运行以 codegen 产物为准。  
**Rationale**：避免把编辑器复杂度带进热路径；同时保持可回放与可治理（验收靠 trial-run 工件）。  
**Link**：`specs/033-module-stage-blueprints/spec.md`（Assumptions）

### D002：画布配置的核心概念（节点/边/资产）必须可降解到统一 IR

**Decision**：画布只配置三类东西：

- ModuleInstance（节点）
- IntentRule（事件→动作连线）
- CodeAsset（映射/条件；由 035 模块引用空间协议定义）

PortSpec/TypeIR（同属 035）属于“事实源导出”，禁止手工配置以免并行真相源。  
**Rationale**：把可配置面缩到最小，才能让 Agent/CI 做可靠的审阅与回归。

### D003：rowRef 作为动态列表定位唯一默认语义

**Decision**：跨模块回填与错误对齐必须基于稳定 rowId（`$rowId` + `rowRef.rowPath`），禁止 index 默认语义。  
**Rationale**：平台场景里列表重排极常见；没有稳定 identity 会系统性错行。  
**Link**：`specs/033-module-stage-blueprints/spec.md`（FR-006）

## Open Questions（先落盘，后续再定优先级）

1. StageBlueprint 中 moduleRef 的落地：仅 moduleId（概念引用）还是允许附带 import specifier（实现引用）？
2. IntentRule 的锚点回写：codegen/runtime 侧如何保证 `ruleId` 能出现在动态 Trace（供 Devtools 高亮/回放对齐）？
3. rowRef 的地址格式：rowPath 段的 listPath 使用 JSON Pointer 还是 dot-path？（需与 PortSpec exports 对齐）

## References

- 032 UI 投影边界：`specs/032-ui-projection-contract/spec.md`
- 035 模块引用空间事实源（PortSpec/TypeIR + CodeAsset）：`specs/035-module-reference-space/spec.md`
- 036 统一验收：`specs/036-workbench-contract-suite/spec.md`
