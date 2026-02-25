# Tasks: O-005 单一最小 IR 收敛（Static IR + Dynamic Trace）

**Input**: `specs/098-unified-minimal-ir/spec.md`, `specs/098-unified-minimal-ir/plan.md`  
**Prerequisites**: spec.md, plan.md

## Phase 1: Setup

- [x] T001 整理 Phase 0 研究结论到 `specs/098-unified-minimal-ir/research.md`
- [x] T002 [P] 产出最小 IR 数据模型到 `specs/098-unified-minimal-ir/data-model.md`
- [x] T003 [P] 建立契约目录与说明 `specs/098-unified-minimal-ir/contracts/README.md`
- [x] T004 产出验收与执行脚本说明 `specs/098-unified-minimal-ir/quickstart.md`

---

## Phase 2: Foundational（阻塞）

- [x] T005 定义统一最小 IR 契约草案 `specs/098-unified-minimal-ir/contracts/unified-minimal-ir.md`
- [x] T006 [P] 定义稳定标识模型 `specs/098-unified-minimal-ir/contracts/stable-identity.md`
- [x] T007 [P] 定义 full cutover 默认门禁与 reason codes `specs/098-unified-minimal-ir/contracts/full-cutover-gate.md`
- [x] T008 [P] 定义迁移说明（无兼容层）`specs/098-unified-minimal-ir/contracts/migration-playbook.md`
- [x] T009 [P] 定义性能证据矩阵 `specs/098-unified-minimal-ir/perf/README.md`
- [x] T010 定义诊断成本与预算口径 `specs/098-unified-minimal-ir/contracts/diagnostics-budget.md`

---

## Phase 3: User Story 1 - 默认 full cutover 单一路径 (P1)

**Independent Test**: 默认策略运行时无隐式 fallback，且失败/降级有 reason codes。

- [x] T011 [P] [US1] 增加门禁与 fallback 回归测试 `packages/logix-core/test/internal/runtime/core/FullCutoverGate.098.test.ts`
- [x] T012 [P] [US1] 增加锚点稳定性测试 `packages/logix-core/test/internal/reflection/UnifiedIrAnchors.098.test.ts`
- [x] T013 [US1] 收敛 static IR 出口 `packages/logix-core/src/internal/reflection/staticIr.ts`
- [x] T014 [US1] 收敛 control surface 装配 `packages/logix-core/src/internal/reflection/controlSurface.ts`
- [x] T015 [US1] 默认启用 full cutover 并阻断隐式回退 `packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts`
- [x] T016 [US1] 统一门禁失败/降级语义 `packages/logix-core/src/internal/runtime/core/FullCutoverGate.ts`

---

## Phase 4: User Story 2 - 四类消费者解释一致 (P2)

**Independent Test**: Devtools/Evidence/Replay/Platform 对同一 run 的锚点与顺序一致。

- [x] T017 [P] [US2] 增加跨消费者一致性测试 `packages/logix-core/test/internal/Debug/UnifiedIrParity.098.test.ts`
- [x] T018 [P] [US2] 增加 replay 锚点对齐测试 `packages/logix-core/test/internal/Replay/UnifiedIrReplay.098.test.ts`
- [x] T019 [US2] 统一 Debug 事件导出字段 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- [x] T020 [US2] 统一 Devtools 快照消费口径 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [x] T021 [US2] 对齐公开 Debug API 导出语义 `packages/logix-core/src/Debug.ts`

---

## Phase 5: User Story 3 - 破坏性迁移可执行 (P3)

**Independent Test**: 按迁移说明改造旧消费者后通过统一 IR 验收，且不依赖兼容层。

- [x] T022 [P] [US3] 增加迁移回归测试 `packages/logix-core/test/internal/reflection/UnifiedIrMigration.098.test.ts`
- [x] T023 [US3] 编写 breaking 变更矩阵 `specs/098-unified-minimal-ir/contracts/breaking-matrix.md`
- [x] T024 [US3] 完成用户迁移说明 `specs/098-unified-minimal-ir/contracts/migration-playbook.md`
- [x] T025 [US3] 更新切换检查清单 `specs/098-unified-minimal-ir/checklists/cutover-readiness.md`

---

## Phase 6: Validation & Evidence

- [x] T026 [P] 运行类型检查并记录 `specs/098-unified-minimal-ir/verification/typecheck.txt`
- [x] T027 [P] 运行测试并记录 `specs/098-unified-minimal-ir/verification/test.txt`
- [x] T028 [P] 采集 before/after 性能证据并生成 diff `specs/098-unified-minimal-ir/perf/`
- [x] T029 验证诊断成本预算并记录 `specs/098-unified-minimal-ir/perf/diagnostics-budget.md`
- [x] T030 输出实现报告与迁移总结 `specs/098-unified-minimal-ir/notes/implementation-report.md`

---

## Dependencies & Execution Order

1. Phase 1（T001-T004）先完成。
2. Phase 2（T005-T010）是阻塞前置，完成后才可进入 US 阶段。
3. Phase 3、4、5 可按优先级串行（P1→P2→P3）或在人力允许时并行推进。
4. Phase 6（T026-T030）必须在实现与测试完成后执行。

## Parallel Opportunities

- Phase 1：T002/T003 可并行。
- Phase 2：T006/T007/T008/T009 可并行。
- US1：T011/T012 可并行；US2：T017/T018 可并行；US3：T022 可并行。
- Validation：T026/T027/T028 可并行启动，T029/T030 在证据齐全后串行收口。
