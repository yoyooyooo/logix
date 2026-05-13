# Runtime HMR Lifecycle Review Ledger

## Meta

- target: `specs/158-runtime-hmr-lifecycle`
- targets:
  - `specs/158-runtime-hmr-lifecycle/spec.md`
  - `specs/158-runtime-hmr-lifecycle/plan.md`
  - `specs/158-runtime-hmr-lifecycle/research.md`
  - `specs/158-runtime-hmr-lifecycle/data-model.md`
  - `specs/158-runtime-hmr-lifecycle/contracts/README.md`
  - `specs/158-runtime-hmr-lifecycle/quickstart.md`
  - `specs/158-runtime-hmr-lifecycle/discussion.md`
- source_kind: `file-plan`
- reviewers: `A1 Goodall`, `A2 Planck`, `A3 Descartes`, `A4 Kuhn`
- round_count: 2
- challenge_scope: `open`
- consensus_status: `consensus-after-converge`

## Bootstrap

- target_complete: yes
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - 用户要求先用 `$plan-optimality-loop` 打磨需求方案细节。
    - 本轮只审 planning artifacts，不进入实现。
    - 主 agent 可直接修订目标计划与绑定文档。
  - open_questions: none
  - confirmation_basis: feature 已有 SpecKit 工作集，用户明确要求继续打磨需求方案。
- review_contract:
  - artifact_kind: `implementation-plan`
  - review_goal: `implementation-ready`
  - target_claim: `specs/158-runtime-hmr-lifecycle` 当前计划应成为面向终局的 runtime HMR lifecycle 实施方案，指导后续 tasks，闭合 owner/boundary/verification/writeback，且不引入第二系统或兼容壳层。
  - target_refs:
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
    - `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime*.md`
    - `apps/docs/content/docs/guide/essentials/react-integration*.md`
  - non_default_overrides:
    - stop_condition: `consensus`
    - write_policy: main agent may edit target plan family and write ledger
- review_object_manifest:
  - source_inputs:
    - user HMR failure description
    - SpecKit feature `158-runtime-hmr-lifecycle`
    - project SSoT and React host docs
  - materialized_targets: target files listed in Meta
  - authority_target: `specs/158-runtime-hmr-lifecycle/plan.md`
  - bound_docs:
    - `spec.md`
    - `research.md`
    - `data-model.md`
    - `contracts/README.md`
    - `quickstart.md`
    - `discussion.md`
  - derived_scope: implementation plan family for runtime HMR lifecycle
  - allowed_classes:
    - plan clarification
    - requirement correction
    - data model correction
    - contract and witness matrix correction
    - ledger write
  - blocker_classes:
    - implementation code changes
    - compatibility layer design
    - new public `runtime.*` command without separate authority intake
  - ledger_target: `docs/review-plan/runs/2026-04-25-runtime-hmr-lifecycle-optimality-loop.md`
- challenge_scope: `open`
- reviewer_set:
  - A1: evidence authority, resource taxonomy, canonical owner route
  - A2: first-wave contract, verification owner, doc duplication
  - A3: consistency, control-plane landing, topology
  - A4: target scope, retention, closure boundary
- kernel_council: `Ramanujan`, `Kolmogorov`, `Godel`
- dominance_axes:
  - `concept-count`
  - `public-surface`
  - `compat-budget`
  - `migration-cost`
  - `proof-strength`
  - `future-headroom`
- stop_rule: consensus after adopted freeze record and target text update
- reopen_bar:
  - current wave cannot prove recovery without refresh
  - evidence authority splits into a second report protocol
  - current decision set grows beyond `reset | dispose`
  - React host owner law conflicts with `RuntimeProvider` projection boundary
- ledger_path: `docs/review-plan/runs/2026-04-25-runtime-hmr-lifecycle-optimality-loop.md`
- writable: yes

## Assumptions

- A1:
  - summary: Current wave needs `retain / reject-retain` in formal lifecycle decision algebra.
  - status: `overturned`
  - resolution_basis: all reviewers found this expands concept count and proof matrix beyond reset-first closure.
- A2:
  - summary: HMR evidence authority can be selected during tasks.
  - status: `overturned`
  - resolution_basis: plan now freezes existing evidence envelope and feature witness artifacts, with no new `runtime.*` root command.
- A3:
  - summary: `RuntimeProvider` or an example helper can own lifecycle truth.
  - status: `overturned`
  - resolution_basis: owner topology now fixes app/example root owner plus module-level HMR boundary adapter; `RuntimeProvider` is projection-only.
- A4:
  - summary: Host adjunct cleanup can live in `RuntimeResource`.
  - status: `overturned`
  - resolution_basis: data model now separates `RuntimeResource` from `HostBindingCleanup`.
- A5:
  - summary: HMR, remount, root teardown, manual dispose, and provider layer scope should be one first-wave closure target.
  - status: `overturned`
  - resolution_basis: current wave is `development hot-update owner replacement` plus no-successor dispose; other boundaries require blocker evidence.

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `critical` `invalidity`:
  - summary: current plan carried future retention as a first-wave decision.
  - evidence: `spec.md`, `data-model.md`, and `contracts/README.md` listed `retain / reject-retain`.
  - status: `closed`
- F2 `critical` `ambiguity`:
  - summary: evidence authority and verification landing were conditional.
  - evidence: plan used conditional writeback for `04/09`, discussion kept A004 open.
  - status: `closed`
- F3 `high` `invalidity`:
  - summary: host adjunct cleanup was mixed into core runtime resources.
  - evidence: `external-store` and `provider-layer-scope` appeared in runtime resource taxonomy.
  - status: `closed`
- F4 `high` `ambiguity`:
  - summary: owner topology did not freeze who creates runtime, who receives HMR, and what `RuntimeProvider` owns.
  - evidence: plan only named shared helper without topology.
  - status: `closed`
- F5 `medium` `ambiguity`:
  - summary: witness and writeback targets did not map to a single closure matrix.
  - evidence: quickstart listed package tests without matrix or landing.
  - status: `closed`

### Counter Proposals

- P1:
  - summary: reset-first HMR owner handoff contract.
  - why_better: removes unimplemented state-survival branch from current proof surface.
  - overturns_assumptions: A1, A5
  - resolves_findings: F1
  - supersedes_proposals: all partial retention-as-current proposals
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +2
    - public-surface: +1
    - compat-budget: +2
    - migration-cost: +2
    - proof-strength: +2
    - future-headroom: +1
  - status: `adopted`
- P2:
  - summary: single evidence landing through existing evidence envelope and feature witness artifacts.
  - why_better: blocks a second HMR verification lane while preserving host-specific browser witness.
  - overturns_assumptions: A2
  - resolves_findings: F2, F5
  - supersedes_proposals: debug-only evidence and new `runtime.hmr` report proposals
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +1
    - public-surface: +2
    - compat-budget: +1
    - migration-cost: +1
    - proof-strength: +2
    - future-headroom: +1
  - status: `adopted`
- P3:
  - summary: root lifecycle owner plus module-level HMR boundary adapter, with projection-only `RuntimeProvider`.
  - why_better: aligns React host SSoT with examples and prevents example helper from becoming public owner truth.
  - overturns_assumptions: A3
  - resolves_findings: F4
  - supersedes_proposals: generic shared helper as canonical route
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +1
    - public-surface: +1
    - compat-budget: +1
    - migration-cost: +1
    - proof-strength: +2
    - future-headroom: +2
  - status: `adopted`
- P4:
  - summary: split core `RuntimeResource` and host `HostBindingCleanup`.
  - why_better: keeps core host-neutral and makes React cleanup visible without contaminating runtime taxonomy.
  - overturns_assumptions: A4
  - resolves_findings: F3
  - supersedes_proposals: unified resource list without owner kind
  - dominance: `dominates`
  - axis_scores:
    - concept-count: +1
    - public-surface: 0
    - compat-budget: +1
    - migration-cost: +1
    - proof-strength: +2
    - future-headroom: +1
  - status: `adopted`

### Resolution Delta

- `spec.md`: current lifecycle decision set narrowed to reset and dispose; state survival moved out of scope.
- `plan.md`: added Frozen Owner Topology, Closure Matrix, Verification Matrix, fixed writeback set.
- `data-model.md`: removed `retain / reject-retain`, added `HostBindingCleanup`.
- `contracts/README.md`: removed current retention contract, added host binding cleanup and evidence envelope requirement.
- `quickstart.md`: mapped witness targets to closure matrix and single evidence landing.
- `discussion.md`: closed A004 and moved decisions to plan family.

## Adoption

- adopted_candidate: reset-first HMR owner handoff contract
- lineage: P1 + P2 + P3 + P4
- rejected_alternatives:
  - retention as current decision algebra
  - debug-only HMR evidence
  - new HMR-specific `runtime.*` command or report protocol
  - canonical public example helper
  - unified resource taxonomy mixing host adjunct cleanup into core runtime resources
- rejection_reason: each alternative increased concept count, public surface, proof matrix, or authority split without improving current failure closure.
- dominance_verdict: adopted candidate strictly dominates the baseline across concept-count, public-surface, compatibility budget, migration cost, proof strength, and future headroom.

### Freeze Record

- adopted_summary: current feature is `reset-first HMR owner handoff` for development hot-update owner replacement. Core owns host-neutral lifecycle cleanup evidence, React owns boundary delivery and projection safety, examples consume a repo-local helper, and verification consumes existing evidence envelope plus feature artifacts.
- kernel_verdict:
  - Ramanujan: accepted because it reduces formal decisions to `reset | dispose`.
  - Kolmogorov: accepted because closure is expressed by one topology and two matrices.
  - Godel: accepted because it removes second evidence lane, second owner truth, and mixed resource taxonomy.
- frozen_decisions:
  - lifecycle decision set: `reset | dispose`
  - owner topology: app/example root owner, module-level HMR boundary adapter, projection-only `RuntimeProvider`
  - evidence landing: core internal lifecycle event captured by existing evidence envelope and feature witness artifacts
  - control-plane surface: no new `runtime.*` root command in this wave
  - resource taxonomy: `RuntimeResource` and `HostBindingCleanup` are distinct
  - writeback: `10`, `09`, `04`, and fixed user docs set
- non_goals:
  - production live patching
  - state survival across arbitrary hot updates
  - full scenario language expansion
  - public canonical lifecycle helper
  - HMR-specific report protocol
- allowed_reopen_surface:
  - direct blocker evidence that remount/root teardown/provider layer scope must enter first wave
  - evidence that existing evidence envelope cannot carry slim lifecycle artifacts without degrading `09`
  - real browser HMR timing that requires adjusting witness route
- proof_obligations:
  - active demo recovery without refresh
  - 20 consecutive reset events
  - no duplicate active task/timer/watcher copies
  - evidence for reset, dispose, idempotency, disabled diagnostics
  - React no-tearing and host cleanup summary
  - docs writeback before Done
  - performance baseline or explicit withheld conclusion
- delta_from_previous_round: current plan family has been rewritten to match the adopted candidate.

## Consensus

- reviewers: all four reviewers found the same blocking themes and their alternatives converged on the adopted candidate.
- adopted_candidate: reset-first HMR owner handoff contract
- final_status: `consensus-after-converge`
- stop_rule_satisfied: yes, for planning artifact revision. Round 2 residual findings recorded below have been closed.
- residual_risk:
  - browser HMR timing may still force witness implementation adjustment
  - `docs/ssot/runtime/09` wording must be precise enough to avoid implying a default host-level gate
  - implementation may discover lifecycle owner registry perf cost, requiring perf note or design adjustment

## Round 2

### Phase

- converge

### Input Residual

- unresolved findings against adopted freeze record after target text edits

### Findings

- R2-F1 `high` `invalidity`:
  - summary: `plan.md` still left a `Runtime.ts` public or control-plane route escape hatch.
  - status: `closed`
  - resolution_basis: plan now states this wave does not add any HMR lifecycle public API, `Runtime.ts` route, or control-plane route.
- R2-F2 `medium` `ambiguity`:
  - summary: `HostBindingCleanup` was separated, but the evidence contract and CM-04 writeback did not clearly route host cleanup summary through `09`.
  - status: `closed`
  - resolution_basis: contracts now require host cleanup summary in the same lifecycle evidence envelope, and `CM-04` plus React host cleanup witness now write back to `09`.
- R2-F3 `medium` `ambiguity`:
  - summary: `04` was fixed in the writeback set, but it was not represented in matrix closure.
  - status: `closed`
  - resolution_basis: `CM-06` and the control-plane negative writeback doc check now bind `04` to the matrix closure for no new `runtime.*` root command.

### Counter Proposals

- none

### Resolution Delta

- `plan.md`: removed route escape hatch, added `09` writeback for host cleanup evidence, and added `04` negative writeback rows to closure and verification matrices.
- `contracts/README.md`: added `host cleanup summary` to required evidence fields and prevented second evidence authority.

## Converge Notes

- A2 returned no unresolved findings after the first edit pass.
- A4 found R2-F1 and R2-F2; both were closed in the second edit pass.
- A1 found R2-F3; it was closed by adding explicit `04` negative writeback matrix rows.
- A3 returned no unresolved findings after the second edit pass.
