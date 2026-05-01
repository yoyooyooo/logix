# Tasks: Form Implementation First

**Input**: Design documents from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/`
**Prerequisites**: `plan.md`, `implement-plan.md`, `spec.md`, `research.md`, `data-model.md`, `discussion.md`

**Execution Supplement**: `implement-plan.md` 提供本任务表的文件职责、波次顺序、默认命令与 writeback 配方；本文件继续作为任务索引与依赖图。

**Tests**: 本特性触及 `packages/logix-form`、`packages/logix-core`、`packages/logix-react` 的运行时 / 证据闭环，因此测试是必需项。除 targeted unit/integration 外，还必须保留至少一组 browser perf-boundary witness；当进入 examples/docs alignment 时，还必须补 `examples/logix-react` build/typecheck，并在触及 docs 时跑 docs build。

**Organization**: 任务按用户故事组织，并保持 `plan gate satisfied -> implementation -> result writeback` 的单轨顺序。核心 internal-enabler 任务必须直接服务 `G1 / G2 / G3 / G4`；post-closure 的 examples/docs alignment 任务必须回链到 `06` 的 `SC-*` 主场景矩阵、派生 `WF*` projection 或 canonical docs route。所有任务都不得重开 public surface。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行
- **[Story]**: 对应用户故事
- 每个任务都包含明确文件路径

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 把 `156` 的实施边界、工作清单与验证入口固定下来

- [x] T001 Create `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/tasks.md` and lock execution to `AC3.3` baseline + `G1/G2/G3/G4`
- [x] T002 [P] Create an implementation audit table in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md` for `already frozen / needed enabler / reopen-gated`
- [x] T003 [P] Record concrete verification entrypoints in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/quickstart.md` for form tests and browser perf-boundary witnesses

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立所有 user stories 共用的 implementation guard 与 enabler inventory

**⚠️ CRITICAL**: 本阶段完成前，不进入任何 user story 的代码变更

- [x] T004 Build `needed enabler` inventory from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/field-kernel/`, then write current-layer / target-gate mapping into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md`
- [x] T005 [P] Mark every touched internal surface as `already frozen / needed enabler / reopen-gated` in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md`, and reject any item that cannot map to `G1/G2/G3/G4`
- [x] T006 [P] Add a verification matrix draft to `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/plan.md` cross-linking `G1/G2/G3/G4` with `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/browser/perf-boundaries/`
- [x] T007 Freeze non-goals in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md` so semantic-owner descent, declaration-authority descent, public-noun descent, and exact-act descent cannot re-enter implementation slices

**Checkpoint**: `156` 的实施工作集已经只剩 `needed enabler`

---

## Phase 3: User Story 1 - 实施波次不越界 (Priority: P1) 🎯 MVP

**Goal**: 明确 internal mechanism 的第一波实现边界，保证后续实现不越过已冻结 public surface

**Traceability**: NS-3, NS-4, KF-3, KF-9

**Independent Test**: 只基于当前 tasks 与 discussion，就能明确判断某个候选实现是否属于合法主线工作

### Tests for User Story 1

- [x] T008 [P] [US1] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.InternalBoundary.test.ts` to assert implementation-first work does not reopen semantic owner / declaration authority
- [x] T009 [P] [US1] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.DomainBoundary.test.ts` to assert `needed enabler` stays in internal mechanism space

### Implementation for User Story 1

- [x] T010 [US1] Audit `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/install.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/impl.ts` for places where implementation work could leak into public semantic owner, then document explicit guard comments / structure notes
- [x] T011 [US1] Audit `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/field-kernel/install.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/field-kernel/build.ts` for declaration-authority boundaries, and refactor only if needed to keep compile-time ownership explicit
- [x] T012 [US1] Write back the admitted `needed enabler` list and forbidden surfaces into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/plan.md`

**Checkpoint**: 后续波次有清晰边界，不会再把 public/API/semantic-owner 当成自由变量

---

## Phase 4: User Story 2 - 功能点能直接映射到 G1-G4 (Priority: P1)

**Goal**: 让 source scheduling、receipt ownership、row-heavy hooks 三类内部逻辑直接落到 `G1/G2/G3/G4`

**Traceability**: NS-7, NS-8, NS-10, KF-8, KF-10

**Independent Test**: 每个内部机制改动都能明确指向 `G1/G2/G3/G4` 之一，并有对应 witness

### Tests for User Story 2

- [x] T013 [P] [US2] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Source.Authoring.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts` to pin exact `source(...)` act while allowing internal scheduling refinement
- [x] T014 [P] [US2] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts` to validate scheduling / stale / submitImpact behavior against the refined substrate
- [x] T015 [P] [US2] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts` to verify `source receipt -> reason / evidence / bundle patch` ownership
- [x] T016 [P] [US2] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts` to bind row-heavy cleanup/remap hooks to row identity guards

### Implementation for User Story 2

- [x] T017 [US2] Refine scheduling / task substrate in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/field-kernel/source.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/field-kernel/source.impl.ts` without changing exact `source(...)` act
- [x] T018 [US2] Refine source-backed internal bridge in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/fields.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/artifacts.ts` so `source receipt` ownership and bundle-patch backlinks are explicit
- [x] T019 [US2] Refine row-heavy remap / cleanup hooks in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/rowid.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/arrays.ts` so reorder/replace/delete paths stay aligned with row identity and cleanup receipts
- [x] T020 [US2] If needed, refine field-kernel diagnostics substrate in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/field-kernel/converge-diagnostics.ts` and related evidence files, but keep diagnostics truth singular

**Checkpoint**: source scheduling、receipt ownership、row-heavy hooks 三类内部 enabler 都已落到具体代码与 witness

---

## Phase 5: User Story 3 - 支撑背后逻辑的验证闭环 (Priority: P2)

**Goal**: 把上述 internal enabler 与 `runtime.trial / runtime.compare`、browser perf-boundary witness 对齐

**Traceability**: NS-4, NS-7, NS-8, NS-10, KF-8, KF-9, KF-10

**Independent Test**: 完成后能用 trial/compare/browser witness 证明 internal refinement 生效且未越界

### Tests for User Story 3

- [x] T021 [P] [US3] Run and, if needed, refine `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx` against the updated internal mechanism behavior
- [x] T022 [P] [US3] Run and, if needed, refine `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx` to ensure no second diagnostics truth or obvious overhead regression
- [x] T023 [P] [US3] Run and, if needed, refine `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx` to ensure host law remains stable

### Implementation for User Story 3

- [x] T024 [US3] Wire implementation-level evidence hooks needed by `G4` into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/ControlPlane.ts` or adjacent internal evidence surfaces, without creating a new public control plane surface
- [x] T025 [US3] If necessary, add or refine Form-side trial/compare bridge points in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/impl.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/install.ts`
- [x] T026 [US3] Record `G1/G2/G3/G4` witness outcomes and any remaining enabler gaps in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md`

**Checkpoint**: internal refinement 已经能通过 trial/compare/browser witness 被验证，不能只停在代码实现

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 收紧跨故事细节，确保实现结果与 authority / docs / witness 一致

- [x] T027 [P] Review touched files in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/field-kernel/` for accidental semantic-owner drift or second-truth additions
- [x] T028 [P] Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/quickstart.md` with the final execution order and verification commands actually used
- [x] T029 Validate no task in this wave introduced a new public noun, public route, declaration authority, or semantic owner

---

## Phase 7: Result Writeback

**Purpose**: 把稳定结果回写到 authority / spec / discussion，避免并行真相源

- [x] T030 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md` if the implemented enablers change the internal boundary explanation
- [x] T031 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md` only if implementation proved a needed clarification to the exact boundary wording, without changing public surface
- [x] T032 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/spec.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/plan.md` with adopted implementation outcomes
- [x] T033 Trim stale items from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md` and keep only residual open questions or reopen evidence
- [x] T034 Run final targeted verification listed in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/plan.md` and record the pass/fail result in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md`

---

## Phase 8: User Story 4 - examples/logix-react 与用户文档同叙事收口 (Priority: P3)

**Goal**: 在核心 implementation closure 之后，整顿 `examples/logix-react` 的 form demos，并让 retained demos 与 `apps/docs/content/docs/form/*` 的默认路径共享同一叙事骨架

**Traceability**: NS-3, NS-4, NS-7, KF-3, KF-9

**Independent Test**: retained form demos 能被映射到 `06` 的 `SC-*` 主场景矩阵与派生 `WF*` projection，且 examples/docs 不再各讲各的

### Tests for User Story 4

- [x] T035 [P] [US4] Create `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/test/form-demo-matrix.contract.test.ts` to pin the retained form demo routes, labels, and narrative slices against `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/App.tsx`
- [x] T036 [P] [US4] Run `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react` typecheck/build and, if docs pages are touched, run `pnpm -C apps/docs types:check` plus `pnpm -C apps/docs build`

### Implementation for User Story 4

- [x] T037 [US4] Inventory current form demo routes, layouts, and supporting modules from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/App.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/modules/`, then classify each as `retain / rewrite / merge / remove` inside `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md`
- [x] T038 [US4] Refresh retained form demo layouts in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/FormDemoLayout.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/QuerySearchDemoLayout.tsx`, and add or adapt a dedicated row-heavy / complex witness demo under `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/` when needed
- [x] T039 [US4] Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/App.tsx` so form demo ordering, route labels, and grouping reflect the retained canonical story instead of historical ad hoc naming
- [x] T040 [US4] Reuse or adapt `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/modules/complex-field-form.ts` and related form modules when a retained `SC-* / WF*` projection needs a richer example, instead of introducing a parallel one-off demo module
- [x] T041 [US4] If docs writeback is needed, update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/index.cn.mdx`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/introduction.cn.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/quick-start.cn.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/apps/docs/content/docs/form/field-arrays.cn.md` and their English counterparts so the docs keep the retained narrative without直接暴露 demo 预览
- [x] T042 [US4] Write back the SSoT-backed retained demo matrix, docs alignment decision, and any deferred items into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/plan.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/quickstart.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/156-form-implementation-first/discussion.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: starts immediately
- **Phase 2**: depends on Setup completion
- **Phase 3 (US1)**: depends on Foundational completion
- **Phase 4 (US2)**: depends on US1 boundary lock
- **Phase 5 (US3)**: depends on US2 internal enablers existing
- **Phase 6**: depends on desired stories being implemented
- **Phase 7**: depends on verification completion
- **Phase 8 (US4)**: depends on Phase 7 core writeback completion

### User Story Dependencies

- **US1**: 独立建立实现边界，必须最先完成
- **US2**: 建立内部 enabler，依赖 US1
- **US3**: 做 evidence closure，依赖 US2
- **US4**: 做 examples/docs alignment，依赖 US3 与核心 writeback 完成

### Parallel Opportunities

- T002、T003 可并行
- T005、T006、T007 可并行
- T013-T016 可并行准备
- T021-T023 可并行运行和校正
- T027-T029 可并行
- T035、T036 可并行

---

## Parallel Example: User Story 2

```bash
Task: "Extend Form source authoring tests in packages/logix-form/test/Form/Form.Source.Authoring.test.ts and packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts"
Task: "Extend reason/cleanup witnesses in packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts and packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts"
Task: "Extend row identity witness in packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. 完成 Setup
2. 完成 Foundational
3. 完成 US1
4. 停下来确认边界未越界

### Incremental Delivery

1. US1 锁边界
2. US2 做 internal enabler
3. US3 做 evidence closure
4. 先做核心 writeback
5. 再做 examples/docs alignment

### Parallel Team Strategy

如果多人并行：

1. 先共同完成 Phase 1-2
2. 一人主导 `source scheduling / receipt ownership`
3. 一人主导 `row-heavy hooks`
4. 一人主导 browser/perf witness 与 writeback
