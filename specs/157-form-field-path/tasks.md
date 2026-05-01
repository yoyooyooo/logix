# Tasks: Form Companion Formalization

**Input**: Design documents from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/`
**Prerequisites**: `spec.md`, `plan.md`, `tasks.md`
**Optional Support**: `discussion.md` 只作 reopen evidence；`quickstart.md` 只作命令索引；`research.md / data-model.md / contracts/README.md` 只作 support

**Tests**: control-plane proof 是主验证链。每个 user story 仍需先补失败用例，再实现。Vitest、browser perf-boundary evidence、example build 都属于 supporting evidence，顺序要服从 `runtime.check -> runtime.trial(startup) -> runtime.trial(scenario) -> runtime.compare(conditional)`。

**Organization**: 任务按 `contract freeze -> authoring/lowering -> recipe-only read proof -> authority freeze -> post-freeze examples -> final gates` 单轨推进。任何任务都不得重开 `list/root companion`、第二 host family、第二 diagnostics truth、第三 slot、public helper noun 或 public type budget。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行
- **[Story]**: 对应用户故事或 gate
- 每个任务都包含明确文件路径

## Phase 1: Contract Freeze

**Purpose**: 在代码改动前，先冻结 `157` 的单轨 contract，避免把 reopen 项混入主线

- [x] T001 Confirm `plan.md` 中每个 work item 都已分类为 `already frozen / needed enabler / reopen-gated`，并移除任何混合项：`/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/plan.md`
- [x] T002 Record residual reopen evidence for read helper / selector primitive / type promotion only, and keep `discussion.md` out of execution logging: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/discussion.md`
- [x] T003 [P] Refresh the command index to match `runtime.check -> runtime.trial(startup) -> runtime.trial(scenario)` ordering: `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/quickstart.md`

**Checkpoint**: no public helper, no second host family, and no public type promotion remains in mainline workset

---

## Phase 2: Foundational Boundary Guards

**Purpose**: 建立所有 user stories 共用的 boundary guard，防止 companion 实现时扩大 owner scope 或额外 route

**CRITICAL**: 本阶段完成前，不进入任何 production code 变更

- [x] T004 [P] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.InternalBoundary.test.ts` to assert companion remains field-only and does not introduce `list().companion` or `root().companion`
- [x] T005 [P] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.DomainBoundary.test.ts` to assert companion does not create a new root public noun, package subpath, or second public route family
- [x] T006 [P] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Authoring.ExactSurface.test.ts` to reserve `field(path).companion(...)` as the only new authoring slot under `field(path)`

**Checkpoint**: companion implementation may start only after field-only / no-second-route guards are red and ready to be made green

---

## Phase 3: User Story 1 - 字段侧辅助信息正式可写 (Priority: P1) 🎯 MVP

**Goal**: `field(path).companion({ deps, lower })` 能在 `Form.make(..., define)` 中正式声明，并产出 field-owned companion bundle

**Traceability**: NS-3, NS-4, KF-3, KF-9

**Independent Test**: 一个最小 Form program 声明 companion 后，能在 `value / deps / source` 改变时生成或清空 companion bundle，并保持 field-only owner

### Tests for User Story 1

- [x] T007 [P] [US1] Create failing authoring test `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Companion.Authoring.test.ts` for `field(path).companion({ deps, lower })`, `value / deps / source?` context, bundle output, and clear output
- [x] T008 [P] [US1] Create failing row-scope authoring test `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts` for `field('items.someField').companion(...)` under `form.list('items', { identity })`
- [x] T009 [P] [US1] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Companion.Authoring.test.ts` to assert invalid `list/root companion` surfaces are unavailable or rejected with clear errors

### Implementation for User Story 1

- [x] T010 [US1] Add companion field API shape in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/impl.ts` without changing `source / rule / submit` owner semantics
- [x] T011 [US1] Add companion type-only contract and collector helpers in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/impl.ts`; keep runtime value/read helper surface closed
- [x] T012 [US1] Implement companion lowering bridge in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/impl.ts`, connecting `field(path).companion(...)` into the same Form declaration flow as `source / rule`
- [x] T013 [US1] Implement atomic companion clear/bundle write semantics in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/fields.ts` and any required helper under `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/`
- [x] T014 [US1] Re-run `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Companion.Authoring.test.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts`

**Checkpoint**: US1 is complete when companion can be authored and produces field-owned facts without widening owner scope

---

## Phase 4: User Story 2 - recipe-only read proof + control-plane closure (Priority: P1)

**Goal**: companion facts 在既有 selector law 下可读，并能通过 control-plane proof 解释 `source -> companion -> rule / submit`

**Traceability**: NS-4, NS-7, NS-10, KF-8, KF-10

**Independent Test**: companion read route、diagnostics causal chain、row-heavy sufficiency 可以独立证明 companion 没有引入第二 truth，且不需要新 helper

### Tests for User Story 2

- [x] T015 [P] [US2] Verify no companion-specific React helper is exported; any sanctioned companion selector primitive remains Form-owned and consumed only through `useSelector(handle, ...)`
- [x] T016 [P] [US2] Create failing control-plane scenario evidence `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Companion.Scenario.trial.test.ts` for `source -> companion -> rule / submit` causal chain
- [x] T017 [P] [US2] Create failing Form evidence `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts` for reorder / replace / byRowId / cleanup under field-only companion
- [x] T018 [P] [US2] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts` to include companion evidence refs when companion participates in submit blocking or stale source facts

### Implementation for User Story 2

- [x] T019 [US2] If existing projection surface lacks recipe-only access, add only the minimal projection support in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/FormProjection.ts`; do not add a public helper or second host family
- [x] T020 [US2] Wire companion evidence export into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/artifacts.ts` without creating a second evidence truth
- [x] T021 [US2] Align companion diagnostics and reason/source refs in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/errors.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/artifacts.ts`
- [x] T022 [US2] Align row-heavy companion attribution with existing row identity helpers in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/rowid.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/arrays.ts`
- [x] T023 [US2] Run `runtime.check`, `runtime.trial(mode="startup")`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.Companion.Scenario.trial.test.ts`, the selector recipe test, and row-heavy proofs; only invoke `runtime.compare` if trial divergence or hot-path regression needs explanation

**Checkpoint**: US2 is complete when sanctioned read route closes, no public helper or second host family is added, and a single evidence chain is proven

### Reopen Wave: Sanctioned Selector Primitive

- [x] T040 [US2] Record the sanctioned selector primitive reopen decision in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/discussion.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/spec.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/plan.md`
- [x] T041 [US2] Add `Form.Companion.field(path)` in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Companion.ts` and export it from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/index.ts`
- [x] T042 [US2] Wire `Form.Companion.field(path)` into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/FormProjection.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/internal/hooks/useSelector.ts`
- [x] T043 [US2] Add opaque primitive surface coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts`
- [x] T044 [US2] Add React host proof for `useSelector(handle, Form.Companion.field(path))` in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx`
- [x] T045 [US2] Re-run focused companion authoring and selector primitive tests across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/Hooks/`
- [x] T046 [US2] Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/05-public-api-families.md` for the adopted selector primitive
- [x] T047 [US2] Add decision and freeze ledgers for the sanctioned selector primitive and `PROJ-03` baseline in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/`

### Reopen Wave: Row-owner Projection

- [x] T048 [US2] Record the row-owner reopen decision in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/discussion.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/spec.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/plan.md`
- [x] T049 [US2] Add `Form.Companion.byRowId(listPath, rowId, fieldPath)` in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/Companion.ts`
- [x] T050 [US2] Wire `Form.Companion.byRowId(listPath, rowId, fieldPath)` into `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/FormProjection.ts` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/internal/hooks/useSelector.ts`
- [x] T051 [US2] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts` with opaque row-owner selector primitive coverage
- [x] T052 [US2] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx` with row-owner selector proof under reorder
- [x] T053 [US2] Re-run focused row-owner selector tests across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/Hooks/`
- [x] T054 [US2] Add a closure ledger for `COL-04` row-owner projection in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/`
- [x] T055 [US2] Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/05-public-api-families.md` for the adopted row-owner selector primitive
- [x] T056 [US2] Close `COL-04` and update planning control-plane and capability harness to move the active cursor to the next open lane
- [x] T057 [US2] Extend focused verification to include companion authoring + row-owner selector primitive together, ensuring the reopened exact carrier does not break existing field-path sanctioned reads
- [x] T058 [US2] Re-run `packages/logix-form` typecheck after the row-owner primitive landed
- [x] T059 [US2] Re-run `packages/logix-react` typecheck after the row-owner primitive landed
- [x] T060 [US2] Re-run browser evidencees `diagnostics-overhead` and `runtime-store-no-tearing` after the row-owner primitive landed

---

## Phase 5: Authority Freeze

**Purpose**: 在 examples 之前先冻结 authority、writeback 与 no-change rationale

- [x] T024 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md` with the adopted companion surface, deferred read carrier status, and public type budget notes
- [x] T025 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md` with companion lowering boundary and field-only owner law
- [x] T026 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/spec.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/plan.md` with adopted outcomes and remaining reopen surface
- [x] T027 Record explicit no-change rationale for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/05-public-api-families.md`, or update them if read authority actually changed

**Checkpoint**: frozen contract is written before any example tries to teach the feature

---

## Phase 6: User Story 3 - post-freeze examples 回链 SSoT 场景矩阵 (Priority: P2)

**Goal**: retained examples 在 authority freeze 之后对齐 `06` 的 `SC-*` 主场景矩阵

**Traceability**: NS-3, NS-4, NS-7, KF-3, KF-9

**Independent Test**: retained demo matrix 中存在 companion-specific route，且该 route 明确回链 `SC-C / SC-D` 与派生 `WF*`

### Tests for User Story 3

- [x] T028 [P] [US3] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/test/form-demo-matrix.contract.test.ts` to require a companion-specific retained demo route, `SC-*` mapping, and derived evidence mapping
- [x] T029 [P] [US3] Extend `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/test/use-selector-type-safety.contract.test.ts` if companion demo introduces new selector recipes, ensuring no `any` or `useSelector(handle)` regressions

### Implementation for User Story 3

- [x] T030 [US3] Create companion-specific demo layout in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/FormCompanionDemoLayout.tsx`, covering `availability / candidates`, source participation, and clear/bundle behavior
- [x] T031 [US3] Update retained demo matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/demoMatrix.ts` with the companion route, `SC-*` mapping, and derived evidence mapping
- [x] T032 [US3] Update route shell in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/App.tsx` only if current matrix-driven routing does not automatically pick up the new companion entry
- [x] T033 [US3] Run `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react` contract test, typecheck, and build after authority freeze

**Checkpoint**: examples consume frozen contract，不再反向塑形 authority

---

## Phase 7: Final Gates & Cleanup

**Purpose**: 收紧跨故事细节，确保 companion formalization 不引入 drift

- [x] T034 [P] Review `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/impl.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/fields.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/FormProjection.ts` for accidental second owner/read family
- [x] T035 [P] Run `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react` typechecks
- [x] T036 [P] Run browser evidencees `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx` only if companion implementation touches React host or diagnostics hot paths
- [x] T037 Run broader gates `pnpm lint` and `pnpm test:turbo` from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api` unless scoped failures are documented as unrelated
- [x] T038 Trim `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/discussion.md` to residual reopen evidence only
- [x] T039 Refresh `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/quickstart.md` with the final command index if implementation changed it

---

## Phase 8: PF-08 Exactness Writeback

**Purpose**: 把 startup report / host explain / row-heavy evidence 形成的 PF-08 当前证据地板回写进 planning control plane 与 `157` 台账，同时明确 residual 不外溢成新的 reopen

- [x] T040 [P] Re-run the PF-08 evidence bundle in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/Hooks/`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/`
- [x] T041 Write `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-24-pf-08-evidence-envelope-exactness-packet.md` with accepted floor, residual, and next cursor
- [x] T042 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/08-capability-decomposition-api-planning-harness.md` with PF-08 status promotions and residual pressure
- [x] T043 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/logix-api-planning/shape-snapshot.md` so `SC-C / SC-E / SC-F` reflect the covered baseline
- [x] T044 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/logix-api-planning/run-state.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/logix-api-planning/proposal-portfolio.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/logix-api/README.md` to move the active cursor from `PF-08` to `PF-04`
- [x] T045 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/spec.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/plan.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/157-form-field-path/discussion.md` so PF-08 does not create a new `157` reopen
- [x] T046 [P] Re-run `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react` typechecks after PF-08 writeback

---

## Phase 9: PF-04 Rule-submit Backlink Packet

**Purpose**: 把 `SC-D` 当前已有的 final-truth state evidence 收成 `PF-04 executable`，并把 residual 精确压到 `CAP-15`

- [x] T047 [P] Re-run the `W5` state evidence bundle in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/Form/` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx`
- [x] T048 Write `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-24-pf-04-rule-submit-backlink-packet.md` with accepted floor, residual, and next cursor
- [x] T049 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/08-capability-decomposition-api-planning-harness.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md`, and planning workspace files so `PF-04` becomes executable and `SC-D` residual narrows to `CAP-15`
- [x] T050 Update `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/logix-api/README.md`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md`, and `157` plan/tasks to reflect the new proof floor

---

## Phase 10: CAP-15 Routing Decision

**Purpose**: 裁定 `CAP-15` exact backlink 是否还能继续停在 current state truth；若不能，则把 residual 正式路由到 `VOB-01`

- [x] T051 Audit `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/errors.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react/src/FormProjection.ts`, and `W5` evidence maps for current backlink admissibility
- [x] T052 Write `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-24-cap-15-vob-01-routing-decision.md` and record the rejected alternatives
- [x] T053 Update planning control-plane files and `157` planning docs so the active cursor moves from `CAP-15 state-truth admissibility` to `VOB-01 scenario carrier work`

---

## Phase 11: VOB-01 Minimal Packet

**Purpose**: 把 `CAP-15` residual 从抽象归属判断推进到可实施的 runtime-owned scenario carrier 最小 packet

- [x] T054 Audit `TRACE-S4 scenario execution carrier law` plus current `internal/verification/**` landing files
- [x] T055 Write `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-24-vob-01-scenario-carrier-minimal-packet.md` with required feed fields, reuse landing, and non-claims
- [x] T056 Update planning control-plane files and `157` plan/tasks so the next cursor becomes the first `VOB-01` implementation proof

---

## Phase 12: VOB-01 First Feed Contract

**Purpose**: 先落一层不会引入第二 truth 的 internal feed contract，为后续 producer wiring 提供稳定靶点

- [x] T057 [P] Create failing contract test `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts`
- [x] T058 Implement minimal internal feed contract in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/scenarioCarrierFeed.ts` and collector landing in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/evidenceCollector.ts`
- [x] T059 [P] Re-run the new contract test, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/observability/Observability.RuntimeEvidencePackage.test.ts`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core` typecheck
- [x] T060 Update planning control-plane files so the next cursor becomes `runtime-owned producer path for W5 reason-link`

---

## Phase 13: Runtime-owned Producer Helper

**Purpose**: 把 `VOB-01` 从裸 collector contract 再推进到 proof-kernel context 下的 runtime-owned helper

- [x] T061 [P] Create failing contract test `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts`
- [x] T062 Implement the runtime-owned proof path, now retained as test fixture `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts`
- [x] T063 [P] Re-run the new proof-kernel contract, the feed contract, runtime evidence package contract, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core` typecheck
- [x] T064 Update planning control-plane files so the next cursor becomes `real W5 extraction path`

---

## Phase 14: Real W5 Extraction Plan

**Purpose**: 先把 real extraction 拆成一个诚实的 staged plan，避免继续用全 synthetic input 假装前进

- [x] T065 Audit current Form/runtime internals for reusable `reasonSlotId / row locality / ownership` coordinates
- [x] T066 Write `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-24-vob-01-real-w5-extraction-plan.md` with reusable facts, missing facts, and staged narrowing strategy
- [x] T067 Update planning control-plane files so the next cursor becomes `derive real reasonSlotId and row locality while keeping bundlePatchRef deferred`

---

## Phase 15: Row-scoped Narrowing

**Purpose**: 把 synthetic 输入继续压缩，先去掉 row locality 相关字段

- [x] T068 [P] Create failing contract test `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts`
- [x] T069 Implement row-scoped narrowing, now retained in test fixture `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts`
- [x] T070 [P] Re-run both proof-kernel proof contracts, feed contract, runtime evidence package contract, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core` typecheck
- [x] T071 Update planning control-plane files so the next cursor becomes `Form-backed reasonSlotId extraction`

---

## Phase 16: Form-state ReasonSlot Narrowing

**Purpose**: 把 `reasonSlotId` 也切到真实 Form state，只保留 `bundlePatchRef` 为最后一个 synthetic 字段

- [x] T072 [P] Create failing contract test `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts`
- [x] T073 Implement Form-state reasonSlot extraction, now retained in test fixture `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts`
- [x] T074 [P] Re-run all proof contracts, feed contract, runtime evidence package contract, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core` typecheck
- [x] T075 Update planning control-plane files so the next cursor becomes `runtime-owned bundlePatchRef extraction`

---

## Phase 17: BundlePatchRef Blocker

**Purpose**: 明确 `bundlePatchRef` 当前还缺 runtime-owned constructor / extraction path，避免继续在不存在的提取路径上空转

- [x] T076 Audit current repo for runtime-owned `bundlePatchRef` extraction anchors
- [x] T077 Write `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-24-vob-01-bundle-patch-ref-blocker.md`
- [x] T078 Update planning control-plane files so the next cursor becomes `bundlePatchRef constructor / extraction design`

---

## Phase 18: Form-artifact BundlePatchRef Extraction

**Purpose**: 先用 Form evidence-contract artifact seed 落一条 fully non-synthetic fixture path，但不急着把它升格为通用 law

- [x] T079 [P] Create failing contract test `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts`
- [x] T080 Implement fixture-local artifact-seed bundlePatchRef extraction, now retained in test fixture `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts`
- [x] T081 [P] Re-run all VOB-01 proof contracts, feed contract, runtime evidence package contract, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core` typecheck
- [x] T082 Update planning control-plane files so the next cursor becomes `compaction review over current VOB-01 ladder`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: starts immediately
- **Phase 2**: depends on contract freeze and blocks all code work
- **Phase 3 (US1)**: depends on Foundational completion
- **Phase 4 (US2)**: depends on US1 authoring/lowering existing
- **Phase 5**: depends on US2 proof closure
- **Phase 6 (US3)**: depends on authority freeze from Phase 5
- **Phase 7**: depends on desired stories being implemented and aligned
- **Phase 8**: depends on the proof floor already existing and only performs exactness writeback plus cursor movement

### User Story Dependencies

- **US1**: required MVP and must be completed first
- **US2**: depends on US1, because read/diagnostics need companion facts
- **US3**: depends on authority freeze after US2, so examples only consume frozen contract

### Parallel Opportunities

- T004 / T005 / T006 can run in parallel
- T007 / T008 / T009 can be drafted in parallel before implementation
- T015 / T016 / T017 / T018 can be drafted in parallel after US1 tests define companion behavior
- T028 / T029 can run in parallel once authority freeze is complete
- T034 / T035 / T036 can run in parallel during final gates

---

## Parallel Example: User Story 2

```bash
Task: "Verify companion does not add a React helper or selector primitive"
Task: "Create control-plane scenario evidence in packages/logix-form/test/Form/Form.Companion.Scenario.trial.test.ts"
Task: "Create row identity evidence in packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1
2. Complete Phase 2
3. Complete Phase 3
4. Stop and confirm `field(path).companion(...)` is authorable and field-only

### Incremental Delivery

1. US1 authoring + lowering
2. US2 recipe-only read proof + control-plane closure
3. Phase 5 authority freeze
4. US3 examples alignment
5. Final gates and cleanup
6. PF-08 exactness writeback

### Parallel Team Strategy

如果多人并行：

1. 一人主导 Form authoring / lowering
2. 一人主导 selector recipe proof 与最小 projection plumbing
3. 一人主导 diagnostics / row-heavy / control-plane proofs
4. 一人主导 examples alignment
5. 最后由同一人合流 authority freeze 与 final gates
