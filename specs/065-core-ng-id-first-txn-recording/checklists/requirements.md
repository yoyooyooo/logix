# Requirements Checklist: core-ng 整型化 Phase 2（事务/录制 id-first）

**Purpose**: 作为 `spec.md` 的规格质量门，确保需求可验收、可测试、无明显歧义，并对性能/可诊断性给出可证据化口径。  
**Created**: 2025-12-31  
**Feature**: `specs/065-core-ng-id-first-txn-recording/spec.md`

## Completeness

- [x] 必填结构齐全：包含 User Scenarios、Requirements、Success Criteria
- [x] 至少 3 条用户故事，且每条都有 Independent Test + Acceptance Scenarios
- [x] Edge Cases 已列出，覆盖不可追踪路径/缺失映射/歧义 key/规模/分片等关键边界

## Testability & Clarity

- [x] 所有 FR 均可通过测试/证据门禁判定（不依赖“感觉更快/更好”）
- [x] 所有 SC 都是可度量/可验证的结果（包含可比性与回归判定）
- [x] 关键术语（FieldPathId/DirtySet/Static IR digest/Exec VM evidence）在 spec 内有定义或上下文明确
- [x] `spec.md` 中不存在超过 3 处 `[NEEDS CLARIFICATION]`（当前为 0）

## Scope Control

- [x] Assumptions 已声明（runtime-only NG、string path 边界输入、off 作为默认门禁基线）
- [x] Out of Scope 明确排除 AOT/Wasm/Flat store 与语义变更（避免范围膨胀）

## Performance & Diagnosability (Hot Path)

- [x] 明确 Node + Browser 双端证据与 “comparable=true && regressions==0” 作为 gate 判据
- [x] 明确 diagnostics=off 近零成本、light/full Slim & serializable & bounded
- [x] 明确稳定标识锚点（instanceId/txnSeq/opSeq）与禁止随机/时间默认值
- [x] 明确事务窗口同步边界（无 IO/async、无写逃逸）与可诊断要求

## Outcome

- [x] 规格质量门：PASS（可进入 `$speckit clarify` / `$speckit plan`）
