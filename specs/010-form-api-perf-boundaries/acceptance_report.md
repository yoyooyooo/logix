# Acceptance Report: Form API（设计收敛与性能边界）

**Spec**: `specs/010-form-api-perf-boundaries`
**Status**: ✅ Passed
**Date**: 2025-12-21

## 1. 验收概览 (Overview)

| Dimension                | Status     | Notes                                                                 |
| :----------------------- | :--------- | :-------------------------------------------------------------------- |
| **Deliverables**         | ✅ Pass    | 关键文件与目录结构完整，导出口径一致。                                |
| **Logic & Architecture** | ✅ Pass    | 逻辑正确下沉到 `@logixjs/core`，Form 层保持纯 DX 包装。                 |
| **Type Safety**          | ✅ Pass    | `Effect.Schema` 广泛使用，路径类型化（`FieldPath`）已落地。           |
| **Tests**                | ✅ Pass    | 所有规划的回归测试与性能测试均通过。                                  |
| **Performance**          | ✅ Pass    | Form 侧写回已提供字段级证据，不再触发 `dirty_all_fallback`。          |

## 2. 交付物验收 (Deliverables Check)

- [x] `packages/logix-core/src/internal/state-trait/validate.ts` (Core Logic)
- [x] `packages/logix-form/src/form.ts` (Controller & Reducers)
- [x] `packages/logix-form/src/logics/install.ts` (Wiring & Triggers)
- [x] `packages/logix-form/src/path.ts` (Path Mapping)
- [x] `packages/logix-form/src/react/index.ts` (Exports)
- [x] runtime SSoT：`.codex/skills/project-guide/references/runtime-logix/logix-form/*`
- [x] 用户文档：`apps/docs/content/docs/form/*`
- [x] 性能记录：`specs/010-form-api-perf-boundaries/references/perf-baseline.md`
- [x] Tests (`Writeback`, `ListScope`, `Install`, `RowId`, `Perf`)

## 3. 质量洞察 (Quality Insights)

### 🌟 Highlights

1.  **架构分层清晰**: 核心的 list-scope 扫描、Graph 推导与 ReverseClosure 都在 `logix-core` 实现，`@logixjs/form` 极轻量，仅负责 Path 映射与 Wiring。
2.  **Schema/Rules 统一**: `handleSubmit` 与 `controller.validate` 均实现了 Schema + Rules 的合并语义，且 `$list/rows[]` 错误树结构统一。
3.  **可诊断性**: `trait:check` 事件在 `validate.ts` 中实现了 Slim 摘要，且包含 `ruleId`、`trigger` 与 `affectedRows`，完全符合 FR-005。

### ⚠️ Issues / Smells

1.  **Performance Warning (`dirty_all_fallback`)**（已处理）:
    - 现象：在运行 `Form.RowIdErrorOwnership` 等测试时，Logix Runtime 报出 `state_transaction::dirty_all_fallback` 警告。
    - 修复：`Form` 的 primary reducers 与 Form 相关测试写回均已提供 field-level patchPaths 证据（避免事务降级为 dirtyAll 调度）。
    - 影响：不改变正确性语义，主要用于避免大规模表单下的全量 converge/validate 退化。

2.  **Explicit `submit` Action Behavior**:
    - 现象：`install.ts` 中监听 `submit` 动作仅触发 Rules (`validateRoot`)，不包含 Schema。
    - 影响：若用户手动 dispatch `submit` 动作（而非调用 `handleSubmit`），将跳过 Schema 校验。
    - 评估：鉴于 `handleSubmit` 是主入口且包含 Schema 逻辑，此行为作为“Raw Action vs Helper”的区别接受；用户文档已明确该差异。

## 4. 测试结果 (Test Summary)

- **Total Tests**: 29 passed
- **Key Scenarios Covered**:
  - List-scope unique check (Cross-row consistency)
  - RowId error ownership (Remove/Move stability)
  - ValidateOn/ReValidateOn triggers
  - Diagnostics levels (off/light/full)
  - Performance check (List scope writeback)

## 5. 结论 (Conclusion)

本特性 **通过验收**。核心功能（跨行校验、RowId 稳定、错误树统一）均已实现且测试通过。

**建议后续行动**:

- （无）
