# Tasks: Kernel-to-Playground Verification Parity

**Input**: Design documents from `/specs/168-kernel-to-playground-verification-parity/`  
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [discussion.md](./discussion.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md)

First implementation slice has closed the blocking discussion items and split remaining design questions into deferred follow-up items.

## Phase 0: Dominance Audit

- [x] T001 Classify `packages/logix-core/src/Runtime.ts` dependency cause generation as keep/rewrite/delete with evidence.
- [x] T002 Classify `packages/logix-core/src/internal/workbench/authority.ts` id derivation as keep/rewrite/delete with evidence.
- [x] T003 Classify `packages/logix-core/src/internal/workbench/findings.ts` run-failure facet as keep/rewrite/delete with evidence.
- [x] T004 Classify `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts` output classes as keep/rewrite/delete with evidence.
- [x] T005 Classify `packages/logix-playground/src/internal/runner/runProjection.ts` value projection as keep/rewrite/delete with evidence.
- [x] T006 Classify `packages/logix-playground/src/internal/summary/workbenchProjection.ts` compile/preview failure truth mapping as keep/rewrite/delete with evidence.
- [x] T007 Classify diagnostics and pressure demo routes under `examples/logix-react/src/playground/projects/**`.
- [x] T008 Record the disposition table in `notes/verification.md`.

## Phase 0A: Review And Closure

- [x] T010 Run plan-optimality-loop against the 168 review contract.
- [x] T011 Apply adopted review decisions to `spec.md`, `plan.md`, `data-model.md`, `contracts/README.md` and owner SSoT pages.
- [x] T012 Clear or demote all blocking implementation items in `discussion.md`.
- [x] T013 Update this task list into implementation-ready slices after review.

Note: T010 is closed by `docs/review-plan/runs/2026-04-30-168-kernel-to-playground-verification-parity-direct-review.md` under the current repository subagent policy; no subagent reviewers were spawned.

## Phase 1: Core Verification Spine

- [x] T020 Prove or reject `VerificationDependencyCause` as the dependency spine before adding `DependencyClosureIndex`.
- [x] T021 Add missing stable owner coordinates for startup missing service/config/import findings.
- [x] T022 Define and test run failure carrier so failed Run cannot project as successful null result.
- [x] T023 Define and test lossy run value metadata for `undefined`, truncation and stringification.
- [x] T024 Add tests proving `runtime.check` does not run startup validation.
- [x] T025 Add tests for declared dependency risk in `runtime.check` if adopted.
- [x] T026 Keep `trial --mode scenario` blocked until core scenario executor is implemented.

## Phase 2: Reflection Manifest

- [x] T030 Link reflection manifest to dependency cause spine if adopted.
- [x] T031 Add payload validator availability and stable validation issue projection.
- [x] T032 Add sourceRef/focusRef and degradation markers required by Playground drilldown.
- [x] T033 Add deterministic manifest digest tests.
- [x] T034 Add negative tests proving source regex is fallback-only evidence gap.
- [x] T035 Expand reflection bridge beyond manifest artifact refs into required projection nodes.

## Phase 3: CLI Parity

- [x] T040 Add CLI fixture for startup missing dependency.
- [x] T041 Ensure CLI trial artifact contains the same report authority consumed by Playground.
- [x] T042 Add CLI compare fixture using before/after report refs.
- [x] T043 Preserve `CommandResult` transport-only invariants in schema guards.
- [x] T044 Add structured failure coverage for scenario mode while executor is absent.

## Phase 4: Workbench Projection

- [x] T050 Add CLI authority bundle adapter tests.
- [x] T051 Add Playground authority bundle adapter tests.
- [x] T052 Rewrite Workbench report id derivation so summary wording changes do not affect ids.
- [x] T053 Demote preview-only failure out of run-result truth input.
- [x] T054 Gate compile failure classification through transport/pre-control-plane authority.
- [x] T055 Project run-failure facet from accepted run failure carrier.
- [x] T056 Project reflection actions, payload metadata and dependency nodes.
- [x] T057 Project missing manifest, unknown schema and stale digest as evidence gaps.
- [x] T058 Add parity snapshot for same report from CLI and Playground inputs.

## Phase 5: Playground Runtime And Demos

- [x] T060 Route failed Run output to result-face failure or Workbench run-failure facet.
- [x] T061 Add browser test proving failed Run does not render successful `{ value: null }`.
- [x] T062 Add browser test proving business `null`, `undefined`, void and run failure are distinguishable.
- [x] T063 Add captured report refs for Check and Trial.
- [x] T064 Add captured run-failure refs if accepted by data model.
- [x] T065 Add compare-compatible before/after capture proof.
- [x] T066 Audit diagnostics-dense and pressure demos for fake authority rows.
- [x] T067 Split visual pressure fixtures from real diagnostics demos where needed.
- [x] T068 Add real demo for missing service/config/import startup failure.
- [x] T069 Add real demo for static check declaration finding if adopted.
- [x] T070 Add real demo for payload validation failure or validator-unavailable evidence gap.
- [x] T071 Add real demo for reflection/action evidence gap.

## Phase 6: Writeback And Verification

- [x] T080 Update `docs/ssot/runtime/09-verification-control-plane.md` with adopted control-plane parity refinements.
- [x] T081 Update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` with adopted CLI parity refinements.
- [x] T082 Update `docs/ssot/runtime/17-playground-product-workbench.md` with adopted Playground parity refinements.
- [x] T083 Update `specs/160-cli-agent-first-control-plane-cutover/spec.md` if CLI scenario/compare wording changes.
- [x] T084 Update `specs/162-cli-verification-transport/spec.md` if transport parity or artifact refs change.
- [x] T085 Update `specs/165-runtime-workbench-kernel/spec.md` if projection input classes change.
- [x] T086 Update `specs/166-playground-driver-scenario-surface/spec.md` if demo or diagnostics authority boundaries change.
- [x] T087 Update `specs/167-runtime-reflection-manifest/spec.md` if dependency or payload reflection shape changes.
- [x] T088 Record verification outcomes in `notes/verification.md`.
- [x] T089 Record perf evidence if hot paths change.

Note: T083 and T084 required no content changes because this slice did not change CLI scenario/compare wording, transport artifact refs or `CommandResult` schema truth. T089 records that no runtime hot path changed.

## Verification Commands

- [x] T090 Run `rtk pnpm -C packages/logix-core typecheck`.
- [x] T091 Run `rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot`.
- [x] T092 Run `rtk pnpm -C packages/logix-cli typecheck`.
- [x] T093 Run `rtk pnpm -C packages/logix-cli test -- --run --cache --silent=passed-only --reporter=dot`.
- [x] T094 Run `rtk pnpm -C packages/logix-playground typecheck`.
- [x] T095 Run `rtk pnpm -C packages/logix-playground test -- --run --cache --silent=passed-only --reporter=dot`.
- [x] T096 Run `rtk pnpm -C examples/logix-react typecheck`.
- [x] T097 Run browser proof for relevant Playground routes.
- [x] T098 Run `rtk pnpm typecheck`.
- [x] T099 Run `rtk pnpm lint`.
- [x] T100 Run `rtk pnpm test:turbo`.

Verification note: T099 passed after the Workbench selector lint cleanup. T100 passed after adding the CLI package Vitest timeout configuration for repo-level turbo execution.
