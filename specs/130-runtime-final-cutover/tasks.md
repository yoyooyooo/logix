# Tasks: Runtime Final Cutover

**Input**: Design documents from `/specs/130-runtime-final-cutover/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/README.md`, `quickstart.md`
**Tests**: contract audit、runtime surface audit、control plane route audit、assembly residue audit、exports audit、targeted vitest、`pnpm typecheck`、必要时 `perf collect/diff`

## Phase 1: Setup

- [x] T001 Audit and update runtime spine ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/runtime-spine-ledger.md`
- [x] T002 [P] Audit and update shell residue ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/shell-residue-ledger.md`
- [x] T003 [P] Audit and update control plane entry ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md`
- [x] T004 [P] Set allowlist default budget to zero, remove placeholders, and audit approval metadata in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/allowlist-ledger.md`
- [x] T005 [P] Audit and update docs and direct consumer matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`
- [x] T006 [P] Create and maintain migration ledger in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/migration-ledger.md`

---

## Phase 2: Foundational

- [x] T007 Audit current runtime public spine, expert surfaces, root exports, shell residues, and control plane entries across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-devtools-react`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix`, then write classifications into the inventory ledgers
- [x] T008 [P] Enumerate owner docs and consumer defaults across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/{01-public-api-spine.md,02-hot-path-direction.md,03-canonical-authoring.md,04-capabilities-and-runtime-control-plane.md,05-logic-composition-and-override.md,07-standardized-scenario-patterns.md,09-verification-control-plane.md,README.md}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/platform/{01-layered-map.md,02-anchor-profile-and-instantiation.md}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/{2026-04-04-logix-api-next-charter.md,2026-04-05-ai-native-runtime-first-charter.md}`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/logix-api-next-guardrails.md`, then record required sync targets in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`
- [x] T009 [P] Enumerate old default entry hotspots in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/{observability,TrialRunArtifacts,Contracts,Runtime,Module,Logic,FieldKernel,Process,Link,Bound,internal}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/test`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/src`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/test/browser`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix`, then classify each as migrate / expert-only / internal-backing-only / remove / allowlisted-temporary
- [x] T010 [P] Create decomposition brief for any touched ≥1000 LOC runtime-core file in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/shell-residue-ledger.md` before semantic changes
- [x] T011 [P] Establish perf evidence routing for kernel-hit tasks in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/plan.md` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/runtime-spine-ledger.md`
- [x] T012 [P] Register every known breaking surface and its replacement or no-replacement path in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/migration-ledger.md` before semantic cutover starts

**Checkpoint**: inventory, decomposition gate, exports census, migration ledger, docs owner matrix, and direct-consumer hotspot list are ready before any code cutover begins.

---

## Phase 3: User Story 1 - 唯一 runtime 主线 (Priority: P1) 🎯 MVP

**Goal**: 把公开 runtime spine 和 canonical capability 面最终压成唯一主线，并消除并列公开入口与 limbo capability。

**Traceability**: NS-8, NS-10, KF-8

**Independent Test**: reviewer 在 5 分钟内可以只靠 docs、exports 和 tests 判断唯一公开主线，不再遇到并列入口、limbo capability 或 legacy root export。

### Tests for User Story 1

- [x] T013 [P] [US1] Add or tighten canonical spine contract assertions in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/KernelBoundary.test.ts`
- [x] T014 [P] [US1] Add or tighten canonical capability settlement coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Runtime/Runtime.make.Program.test.ts`
- [x] T015 [P] [US1] Add regression coverage for old public assembly defaults in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/test/**` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/test/browser/**`

### Implementation for User Story 1

- [x] T016 [US1] Audit and settle root export surface in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/index.ts`, explicitly classifying `Kernel`, `ControlPlane`, `Observability`, `Reflection`, and any runtime-related top-level namespaces in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/runtime-spine-ledger.md`
- [x] T017 [US1] Audit and settle `Module.implement`, `Runtime.trial`, `Runtime.trial`, and `Reflection` trial-facing facades in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/{Module.ts,Observability.ts,Reflection.ts}` and record per-surface verdicts in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/{runtime-spine-ledger.md,control-plane-entry-ledger.md,shell-residue-ledger.md}`
- [x] T018 [US1] Collapse canonical runtime spine rules in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/{index.ts,Module.ts,Program.ts,Runtime.ts}`
- [x] T019 [US1] Resolve the current known limbo capability `roots` by implementing stable semantics or removing it from canonical docs/examples/contracts in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/Program.ts` and matching docs under `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/{runtime,platform}/`
- [x] T020 [US1] Audit and update affected package barrels and package.json#exports across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox` so no removed, legacy, or allowlisted surface remains publicly exported
- [x] T021 [US1] Remove canonical public references to legacy assembly and legacy naming from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/{01-public-api-spine.md,03-canonical-authoring.md}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/platform/{01-layered-map.md,02-anchor-profile-and-instantiation.md}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/{2026-04-04-logix-api-next-charter.md,2026-04-05-ai-native-runtime-first-charter.md}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/logix-api-next-guardrails.md`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/**`
- [x] T022 [US1] Create explicit migration entries for every removed or downgraded public surface in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/migration-ledger.md`
- [x] T023 [US1] Run `pnpm vitest run packages/logix-core/test/Contracts/KernelBoundary.test.ts packages/logix-core/test/Runtime/Runtime.make.Program.test.ts` plus direct-consumer regression tests, then record results in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/runtime-spine-ledger.md`

**Checkpoint**: canonical runtime spine is singular, canonical capability surface has no limbo items, exports are classified, and migration entries exist for every breaking surface.

---

## Phase 4: User Story 2 - 单一 control plane (Priority: P2)

**Goal**: 把 control plane 的一级公开入口最终收口到 `runtime.check / runtime.trial / runtime.compare`，让旧 trial/evidence 路径退出 canonical 主叙事。

**Traceability**: NS-8, NS-10

**Independent Test**: Agent 能仅靠公开入口完成 stage routing，不再需要在 `Observability`、`Reflection` 和 host-specific 路径之间自行猜测。

### Tests for User Story 2

- [x] T024 [P] [US2] Add or tighten control plane contract coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- [x] T025 [P] [US2] Add or tighten route ownership tests in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/{Contracts/Contracts.045.KernelActivation.test.ts,Contracts/Contracts.045.KernelContractVerification.test.ts,observability/**,TrialRunArtifacts/**,Reflection*.test.ts}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/test/{TestProgram,Vitest}/**`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/test/browser/**`
- [x] T026 [P] [US2] Add explicit consumer migration tests for `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/**`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/src/{Client.ts,Service.ts}`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/scenarios/trial-run-evidence.ts`

### Implementation for User Story 2

- [x] T027 [US2] Define final public control plane facade and shared contract ownership in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/{ControlPlane.ts,Runtime.ts,Observability.ts,Reflection.ts}`
- [x] T028 [US2] Align CLI direct consumers to the final control plane route in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/internal/commands/{check.ts,trial.ts,compare.ts}`
- [x] T029 [US2] Remove or explicitly demote archived CLI routes and backend-placeholder semantics in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli/src/{Commands.ts,internal/args.ts,internal/commands/{trial.ts,trialRun.ts,describe.ts,irValidate.ts,irDiff.ts}}` and matching CLI tests
- [x] T030 [US2] Align sandbox direct consumers to the final control plane route in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/src/{Client.ts,Service.ts}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/scripts/bundle-kernel.mjs`, and related browser tests under `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/test/browser/`
- [x] T031 [US2] Rebuild and audit sandbox published outputs in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/public/sandbox/**` so generated artifacts no longer expose legacy trial/evidence/Reflection defaults
- [x] T032 [US2] Align example and test-harness consumers to the final control plane route in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/**` and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/test/{TestProgram,Vitest,TestRuntime}/**`
- [x] T033 [US2] Enforce zero canonical-surface mentions of legacy trial/evidence facades across docs, exports, and examples; any surviving mention must be recorded in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md` as `expert-only` or `internal-backing-only`
- [x] T034 [US2] Rewrite control plane owner docs, public-spine docs, layered map, ADR charters, and guardrails in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/{01-public-api-spine.md,04-capabilities-and-runtime-control-plane.md,07-standardized-scenario-patterns.md,09-verification-control-plane.md,README.md}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/platform/{01-layered-map.md,02-anchor-profile-and-instantiation.md}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/adr/{2026-04-04-logix-api-next-charter.md,2026-04-05-ai-native-runtime-first-charter.md}`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/standards/logix-api-next-guardrails.md`
- [x] T035 [US2] Run targeted control plane tests plus `pnpm typecheck` and record route outcomes in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md`

**Checkpoint**: all 一级验证入口统一到 `check / trial / compare` 心智，旧 trial/evidence 路径只剩 explicit expert/backing 角色。

---

## Phase 5: User Story 3 - 壳层清场与回流封堵 (Priority: P3)

**Goal**: 删除剩余 runtime shell / legacy residue / 旧语义残影，并通过 docs、allowlist 和 tests 堵死回流路径。

**Traceability**: NS-4, KF-9

**Independent Test**: reviewer 能明确判断一个残留项是删除、allowlist 还是 expert，不再出现“先留着过渡”。

### Tests for User Story 3

- [x] T036 [P] [US3] Add or tighten shell-residue and hot-path boundary regression coverage in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/RuntimeHotPathPolicy.test.ts` and any directly affected runtime-core contract tests
- [x] T037 [P] [US3] Add regression checks for old semantic markers, forwarding shells, stale examples, and lingering direct-consumer old defaults through targeted rg-based audit scripts or test helpers referenced from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/quickstart.md`

### Implementation for User Story 3

- [x] T038 [US3] Settle non-forwarder runtime shell coordinators in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/{AppRuntime.ts,Runtime.ts,ModuleFactory.ts,index.ts}` before deleting any lower-level bridge files
- [x] T039 [US3] Remove or collapse forwarding shell groups in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/{ModuleRuntime*,ProgramRunner*,BoundApiRuntime.ts,FlowRuntime.ts,Lifecycle.ts}` and any matching top-level bridge imports
- [x] T040 [US3] Strip old semantic residue such as `v3` carry-over wording, platform-first framing, stale expert drift, and shell-preserving comments from `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/ModuleFactory.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/module.ts`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/**`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/**`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/**`
- [x] T041 [US3] If final cutover touches `ModuleRuntime.impl.ts`, `WorkflowRuntime.ts`, or `StateTransaction.ts`, complete a decomposition-only patch for the touched file in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/runtime/core/**`, verify behavior is unchanged, and record proof in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/shell-residue-ledger.md`
- [x] T042 [US3] Finalize explicit allowlist decisions with owner, exit conditions, replacement paths, consumer-zero proof, and migration links in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/allowlist-ledger.md`
- [x] T043 [US3] Migrate or explicitly allowlist remaining `.implement(...)` and legacy assembly defaults in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/{Module,Logic,FieldKernel,Process,Link,Bound,internal/**,observability/**,TrialRunArtifacts/**,Reflection*.test.ts}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test/**`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox/test/browser/**`
- [x] T044 [US3] Run targeted runtime tests, shell audits, and any required perf diff or targeted before/after probes for kernel-hit changes and `internal/runtime/**` paths reachable from `Runtime.ts`, `ProgramRunner*`, or module assembly, then record final residue verdicts in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/shell-residue-ledger.md`

**Checkpoint**: shell residue is either deleted or explicitly allowlisted with an exit condition, assembly residue in direct consumers is cleared, and old semantic markers no longer leak into canonical docs/examples/exports。

---

## Phase 6: Docs / Examples / Exports / Direct Consumers Convergence

- [x] T045 Reconcile owner docs, canonical examples, exports, and direct consumer matrix in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`
- [x] T046 [P] Update migration notes and breaking-surface mapping in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/{migration-ledger.md,docs-consumer-matrix.md}`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/plan.md`, and related docs touched by final cutover
- [x] T047 [P] Audit and update root exports and subpath exports across `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-cli`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-test`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-sandbox`, `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-react`, and `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-devtools-react`

---

## Phase 7: Perf + Diagnostics + Allowlist Final Gate

- [x] T048 Run full final gate: `pnpm typecheck`, required vitest suites, exports audit, inventory closed-state audit, and if needed perf diff; then capture the final verdict in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`
- [x] T049 Run a strict zero-hit or allowlist-gated grep audit for `Observability\\.trialRun`, `Observability\\.trialRunModule`, `Reflection\\.(verify|export|extract)`, `runtime\\.trial is not available yet`, `TRIAL_BACKEND_PENDING`, `\\.implement\\(`, `^\\s*imports:`, `^\\s*services:`, `^\\s*roots:`, `v3:`, `platform-first`, `settle`, and `_TBD_` across canonical docs, canonical examples, direct consumers, root exports, and default test surfaces; every intentional hit must be classified in `/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/130-runtime-final-cutover/inventory/{control-plane-entry-ledger.md,allowlist-ledger.md,migration-ledger.md}`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Setup and blocks all story work
- **User Story 1 (Phase 3)**: depends on Foundational
- **User Story 2 (Phase 4)**: depends on Foundational and should begin after canonical spine decisions and direct-consumer census are stable
- **User Story 3 (Phase 5)**: depends on Foundational and should consume outcomes from US1/US2
- **Docs / Examples / Exports / Direct Consumers Convergence (Phase 6)**: depends on US1/US2/US3
- **Perf + Diagnostics + Allowlist Final Gate (Phase 7)**: depends on all previous phases

### User Story Dependencies

- **US1** defines the final canonical public spine and capability settlement
- **US2** depends on US1 的 public boundary decisions to avoid building a second surface
- **US3** depends on US1/US2 outcomes to know which residue can be deleted and which rare items must enter allowlist
- Any task touching `ModuleRuntime.impl.ts`, `WorkflowRuntime.ts`, or `StateTransaction.ts` is blocked on T010

### Parallel Opportunities

- Phase 1 setup items marked `[P]` can run in parallel
- Phase 2 foundational inventory tasks marked `[P]` can run in parallel
- Within US1, tests and docs rewrites can start in parallel after the target runtime spine is agreed
- Within US2, contract tests and direct-consumer rewrites can run in parallel once the final control plane facade is fixed
- Within US3, residue audits and docs/example semantic cleanup can run in parallel, but any ≥1000 LOC file hit must respect decomposition-first ordering

## Implementation Strategy

### MVP First

1. Finish Setup + Foundational
2. Complete US1 and verify the canonical spine
3. Stop and audit if the public spine is still ambiguous

### Incremental Delivery

1. US1 settles `public spine + canonical capabilities`
2. US2 settles `single control plane`
3. US3 settles `shell residue + anti-regression gate`
4. Phase 6 closes docs / examples / exports / direct consumers
5. Phase 7 writes the single final verdict

### Parallel Team Strategy

With multiple developers:

1. One thread maintains the inventory ledgers
2. One thread drives canonical spine and capability settlement
3. One thread drives control plane cutover
4. One thread drives direct-consumer migration for CLI / sandbox / logix-test / core tests
5. One thread handles shell residue and decomposition-first refactors
