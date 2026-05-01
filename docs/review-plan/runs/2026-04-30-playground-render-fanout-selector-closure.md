# Playground Render Fanout Selector Closure Review Ledger

## Meta

- target: `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`
- targets:
  - `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/17-playground-product-workbench.md`
  - `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
  - `packages/logix-playground/src/internal/state/workbenchProgram.ts`
  - `packages/logix-react/src/internal/hooks/useSelector.ts`
  - `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
  - `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- source_kind: `file-plan`
- reviewers:
  - A1 structure purity
  - A2 compression
  - A3 dominance alternatives
  - A4 goal-function challenge
- reviewer_model: `gpt-5.5`
- reviewer_reasoning: `xhigh`
- round_count: 2
- challenge_scope: `open`
- consensus_status: `achieved`

## Bootstrap

- target_complete: true
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - User explicitly requested `$plan-optimality-loop`.
    - User requested a proposal first, then terminal-state challenge under assumptions that may all be challenged.
    - User allowed subagent/reviewer path by explicitly invoking the skill.
    - Challenge scope is open and may question goal function, success criteria, public/internal boundaries, selector API shape, diagnostics, and implementation wave boundaries.
    - Workflow must not start implementation code.
    - Proposal and ledger are writable under `docs/review-plan/`.
  - open_questions: none
  - confirmation_basis: User said `开个提案，然后走 $plan-optimality-loop 面向终局，可挑战一切的前提下去打磨`.
- review_contract:
  - artifact_kind: `implementation-plan`
  - review_goal: `implementation-ready`
  - target_claim: `Playground render fanout must be fixed by region ownership and the exposed core/React host selector gaps must be closed without adding a second host state model or Playground-specific public API.`
  - target_refs:
    - `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`
    - `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
    - `packages/logix-playground/src/internal/layout/ResizableWorkbench.tsx`
    - `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
    - `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
    - `packages/logix-playground/src/internal/components/FilesPanel.tsx`
    - `packages/logix-playground/src/internal/state/workbenchProgram.ts`
    - `packages/logix-playground/src/internal/state/workbenchTypes.ts`
    - `packages/logix-react/src/internal/hooks/useSelector.ts`
    - `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
    - `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
    - `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
    - `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/ssot/runtime/17-playground-product-workbench.md`
  - non_default_overrides:
    - alignment_policy: `auto`
    - scope_fence: `May challenge the goal function, success criteria, public/internal boundaries, selector API shape, diagnostics, and implementation wave boundaries; must stay within Playground render fanout, React host selector law, runtime selector graph, dirty evidence, and diagnostics closure.`
    - stop_condition: `consensus`
    - write_policy: `Update proposal and ledger only; do not implement runtime code in this loop.`
- review_object_manifest:
  - source_inputs:
    - User request.
    - Prior local analysis of Playground render fanout.
    - Existing code evidence from Playground shell, React host `useSelector`, runtime `ReadQuery`, runtime `SelectorGraph`, and `RuntimeStore`.
  - materialized_targets:
    - `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`
  - authority_target: `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`
  - bound_docs:
    - `docs/ssot/runtime/10-react-host-projection-boundary.md`
    - `docs/ssot/runtime/17-playground-product-workbench.md`
  - derived_scope:
    - Playground component region ownership
    - workbench narrow dirty paths
    - React host selector carrier dogfood
    - runtime read-query static lane
    - nested dirty evidence
    - trace-derived diagnostics
    - render fanout proof harness
  - allowed_classes:
    - wave
    - task
    - dependency
    - rollback
    - verification backlog
    - public/internal boundary
    - diagnostics law
    - proof harness
  - blocker_classes:
    - live task ambiguity
    - unbound dependency
    - unsealed verification gate
    - second host state model
    - Playground-specific public core API
    - broad subscription preserved as normal path
    - public selector builder added without separate reopen
  - ledger_target: `docs/review-plan/runs/2026-04-30-playground-render-fanout-selector-closure.md`
- challenge_scope: `open`
- reviewer_set:
  - A1 structure purity
  - A2 compression
  - A3 dominance alternatives
  - A4 goal-function challenge
- active_advisors:
  - A4
- activation_reason: `Open scope touches architecture, public/internal contract, diagnostics, and long-term React host authoring law.`
- max_reviewer_count: 4
- kernel_council:
  - Ramanujan
  - Kolmogorov
  - Godel
- dominance_axes:
  - concept-count
  - public-surface
  - compat-budget
  - migration-cost
  - proof-strength
  - future-headroom
- stop_rule:
  - Ramanujan gate: candidate must remove an assumption, public boundary, or duplicate contract.
  - Kolmogorov gate: concept-count, public-surface, and compat-budget must not worsen overall; if unchanged, proof-strength or future-headroom must strictly improve.
  - Godel gate: candidate must not introduce dual authority, dual workflow, dual contract, or unexplained contradiction.
- reopen_bar: `Reopen only if a candidate strictly dominates the adopted plan on the dominance axes without creating a second authority or compatibility residue.`
- ledger_path: `docs/review-plan/runs/2026-04-30-playground-render-fanout-selector-closure.md`
- writable: true

## Assumptions

- id: A1
  - summary: `Playground render fanout is primarily an application region ownership failure.`
  - status: kept
  - resolution_basis: `All reviewers agreed the direct evidence is PlaygroundShell broad subscriptions and slot construction.`
- id: A2
  - summary: `Core and React host must change in the same first implementation loop.`
  - status: overturned
  - resolution_basis: `Reviewers found current ReadQuery/static selector carrier and nested sink substrate are enough for first closure; core changes are conditional on proof failures.`
- id: A3
  - summary: `A public explicit selector builder should be part of this plan.`
  - status: overturned
  - resolution_basis: `All reviewers found `Logix.Select.*` would reopen public surface and conflict with current React host selector law.`
- id: A4
  - summary: `Flattening `inspector` is the default terminal fix.`
  - status: overturned
  - resolution_basis: `Problem is broad sink, not nested object shape; existing nested dirty path machinery should be dogfooded first.`
- id: A5
  - summary: `Render fanout proof should be a first-class acceptance gate.`
  - status: kept
  - resolution_basis: `Reviewers accepted fanout proof but required budgeted, warmup-normalized, region-scoped tests instead of absolute render claims.`
- id: A6
  - summary: `Only `inspector` is a coarse dirty root.`
  - status: overturned
  - resolution_basis: `A3 identified `runtimeEvidence` as another coarse root requiring narrow lane sinks.`

## Round 1

### Phase

- challenge

### Input Residual

- Initial proposal used Option C: Playground split plus selector builder, nested dirty evidence, diagnostics, and performance matrix in one implementation plan.

### Findings

- id: F1
  - severity: critical
  - class: invalidity
  - summary: `Initial Option C was too broad for implementation-ready scope.`
  - evidence: `A2 and A4 found it bound Playground region split, public selector builder, diagnostics, performance matrix, and SSoT writeback into one closure.`
  - status: adopted
- id: F2
  - severity: critical
  - class: invalidity
  - summary: `The proposed `Logix.Select.path/struct` public builder conflicts with current public spine and React host law.`
  - evidence: `A1, A2, A3, and A4 all cited public spine and runtime/10 constraints; current core root does not expose `Select` or `ReadQuery`.`
  - status: adopted
- id: F3
  - severity: high
  - class: invalidity
  - summary: `Selector identity law was underspecified.`
  - evidence: `A1 noted selector graph reuses entries by selectorId and declared-reads path can make id only from reads.`
  - status: adopted
- id: F4
  - severity: high
  - class: invalidity
  - summary: `Flattening `inspector` by default confuses dirty precision with state shape.`
  - evidence: `A1, A2, and A4 noted existing sink accepts nested path and SelectorGraph supports nested overlap; current reducer marks only broad `inspector`.`
  - status: adopted
- id: F5
  - severity: high
  - class: ambiguity
  - summary: `Nested dirty path precision requires selector reads and reducer sink paths to share path normalization/registry.`
  - evidence: `A3 cited SelectorGraph fallback to evaluate-all without registry and ModuleRuntime registry source.`
  - status: adopted
- id: F6
  - severity: high
  - class: invalidity
  - summary: `runtimeEvidence is also a coarse dirty root and must be covered.`
  - evidence: `A3 cited `recordRuntimeEvidence` sinking `runtimeEvidence` while consumers often read only `runtimeEvidence.reflect` or another lane.`
  - status: adopted
- id: F7
  - severity: medium
  - class: ambiguity
  - summary: `Diagnostics scope was too broad and risked a second performance authority.`
  - evidence: `A2 and A3 found existing `trace:react-selector`, `trace:selector:eval`, and strict gate already carry relevant facts.`
  - status: adopted
- id: F8
  - severity: medium
  - class: ambiguity
  - summary: `Render-count success criteria must be budgeted and normalized.`
  - evidence: `A1 and A4 challenged absolute render-count wording under StrictMode, parent commits, callback identity, and Profiler behavior.`
  - status: adopted
- id: F9
  - severity: medium
  - class: ambiguity
  - summary: `Performance matrix lacked trigger and threshold.`
  - evidence: `A2 found the matrix required sample size, threshold, and failure handling; reviewers agreed it should only run when core selector internals change.`
  - status: adopted

### Counter Proposals

- id: CP1
  - summary: `C-prime: Region ownership plus existing ReadQuery/static selector carrier.`
  - why_better: `Directly closes the visible Playground defect, uses existing selector substrate, avoids new public root nouns, and keeps core changes conditional.`
  - overturns_assumptions:
    - A2
    - A3
    - A4
  - resolves_findings:
    - F1
    - F2
    - F4
    - F6
    - F7
    - F8
    - F9
  - supersedes_proposals:
    - Initial Option C
  - dominance: dominates
  - axis_scores:
    - concept-count: `strictly better`
    - public-surface: `strictly better`
    - compat-budget: `strictly better`
    - migration-cost: `better`
    - proof-strength: `equal or better for the visible defect`
    - future-headroom: `preserved through explicit reopen gate`
  - status: adopted
- id: CP2
  - summary: `Selector builder as independent reopen.`
  - why_better: `Preserves public surface closure while allowing future DX work if existing carriers fail under proof.`
  - overturns_assumptions:
    - A3
  - resolves_findings:
    - F2
    - F3
  - supersedes_proposals:
    - `Logix.Select.*` in the initial proposal
  - dominance: dominates
  - axis_scores:
    - concept-count: `better`
    - public-surface: `strictly better`
    - compat-budget: `strictly better`
    - migration-cost: `better`
    - proof-strength: `requires separate proof`
    - future-headroom: `better`
  - status: adopted
- id: CP3
  - summary: `Trace-derived diagnostics first.`
  - why_better: `Uses existing selector and React traces to enforce gates before adding new DebugSink event families.`
  - overturns_assumptions:
    - A2
  - resolves_findings:
    - F7
  - supersedes_proposals:
    - broad new diagnostics lane
  - dominance: partial
  - axis_scores:
    - concept-count: `better`
    - public-surface: `unchanged`
    - compat-budget: `better`
    - migration-cost: `better`
    - proof-strength: `adequate for first closure`
    - future-headroom: `preserved`
  - status: adopted

### Resolution Delta

- Rewrote the authority proposal to status `adopted`.
- Replaced initial Option C with adopted `C-prime`.
- Removed `Logix.Select.*` from the implementation plan.
- Changed `selector builder` into independent reopen criteria.
- Changed `flatten inspector` into nested sink first.
- Added `runtimeEvidence.*` narrow lane sinks.
- Added path registry same-source proof.
- Changed diagnostics to derive from existing traces first.
- Changed performance matrix to conditional on core internals changing.

## Adoption

- adopted_candidate: `C-prime: Region Ownership + Existing Selector Carrier`
- lineage:
  - Initial proposal Option C
  - A1 ALT-1/2/3
  - A2 C1/C2/C3
  - A3 C-prime and evidence-first split
  - A4 ALT-A4-1
- rejected_alternatives:
  - `Initial Option C with public `Logix.Select.*` selector builder`
  - `Flatten inspector by default`
  - `Add new diagnostics event family before deriving from existing traces`
  - `Always run selector topic performance matrix`
- rejection_reason:
  - `These alternatives either broaden public surface, duplicate existing runtime substrate, inflate migration scope, or lack proof that existing selector carrier/nested sink cannot close the defect.`
- dominance_verdict:
  - `C-prime dominates initial Option C on concept-count, public-surface, compat-budget, and migration-cost while preserving proof-strength for the observed Playground failure and leaving future selector builder work behind an explicit reopen bar.`

### Freeze Record

- adopted_summary:
  - `First implementation loop closes Playground render fanout by shell-zero-subscription region ownership, existing selector carrier dogfood, narrow nested dirty paths for inspector and runtimeEvidence, path registry same-source proof, and budgeted render fanout contract tests.`
- kernel_verdict:
  - `Ramanujan gate passed: removes public selector builder, default flattening, broad diagnostics lane, and unconditional performance matrix from first closure.`
  - `Kolmogorov gate passed: concept-count, public-surface, compat-budget, and migration-cost all improve over initial Option C.`
  - `Godel gate passed: no second host state model, no new public core root, no second diagnostics authority.`
- frozen_decisions:
  - `PlaygroundShell must have no fast workbench-state subscriptions.`
  - `Region containers own their own selectors and dispatches.`
  - `Use existing selector carrier/static-read paths for hot Playground selectors.`
  - `No `Logix.Select.*` or public selector builder in this plan.`
  - `Public selector builder requires a separate reopen/admission proposal.`
  - `Narrow nested dirty paths are the first move for `inspector.*` and `runtimeEvidence.*`.`
  - `Flattening state roots is allowed only after nested path proof fails or independent lifecycle is proven.`
  - `Diagnostics derive from existing traces first.`
  - `Performance matrix is only required if core selector internals change.`
- non_goals:
  - `No implementation code in the optimality loop.`
  - `No new public React hook family.`
  - `No Playground-specific public core API.`
  - `No React local state replacement for Logix workbench state.`
  - `No compatibility bridge.`
- allowed_reopen_surface:
  - `Public or toolkit selector builder if existing carrier paths cannot satisfy bounded fanout and type ergonomics.`
  - `New DebugSink aggregate diagnostic if existing traces cannot express required gates.`
  - `State flattening if nested dirty path proof fails with correct path usage.`
  - `Core selector graph/runtime store performance matrix if core internals change.`
- proof_obligations:
  - `Failing render fanout tests against current broad shell.`
  - `Shell-zero-subscription proof after refactor.`
  - `Static hot selector proof with declared reads.`
  - `Nested dirty path proof for inspector and runtimeEvidence lanes.`
  - `Path registry same-source proof or visible failure if fallback occurs.`
  - `Budgeted, warmup-normalized render fanout tests for tabs, file selection, host commands, and evidence lanes.`
- delta_from_previous_round:
  - `Initial broad core/API cutover replaced by bounded Playground-first closure with explicit reopen bars.`

## Consensus

- status: `achieved`
- reviewer_results:
  - A1: `无 unresolved findings`
  - A2: `无 unresolved findings`
  - A3: `无 unresolved findings`
  - A4: `无 unresolved findings`
- residual_risk:
  - `Current plan depends on existing selector carrier ergonomics being sufficient for Playground hot selectors. If implementation proves otherwise, selector builder must reopen separately under the frozen reopen bar.`

## Round 2

### Phase

- converge

### Input Residual

- Check whether the revised proposal and freeze record closed Round 1 findings.
- Check whether adopted `C-prime` is still dominated by a smaller or stronger candidate.

### Findings

- id: C1
  - severity: none
  - class: ambiguity
  - summary: `A1 returned no unresolved findings.`
  - evidence: `A1 confirmed selector identity law, public/internal boundary, nested dirty first, shell zero subscription, diagnostics layering, and budgeted proof are closed.`
  - status: closed
- id: C2
  - severity: none
  - class: ambiguity
  - summary: `A2 returned no unresolved findings.`
  - evidence: `A2 confirmed `Logix.Select.*` was removed, first-loop scope was compressed, nested dirty reuses existing capability, flattening is conditional, and diagnostics/perf matrix are gated.`
  - status: closed
- id: C3
  - severity: none
  - class: ambiguity
  - summary: `A3 returned no unresolved findings.`
  - evidence: `A3 confirmed current plan is not dominated and selector builder admission is gated.`
  - status: closed
- id: C4
  - severity: none
  - class: ambiguity
  - summary: `A4 returned no unresolved findings.`
  - evidence: `A4 confirmed `C-prime` closed the goal-function overreach and no smaller stronger candidate dominates it.`
  - status: closed

### Counter Proposals

- none

### Resolution Delta

- Consensus achieved.
- No reopen triggered.

## Supersession Delta

- superseded_by: `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`
- scope: `kernel selector law only`
- retained_scope: `Playground product witness for region ownership, render fanout, and workbench selector dogfooding`

### Updated Authority

- Playground proposal no longer owns public React read shape.
- Terminal public React read gate is `useSelector(handle, selector, equalityFn?)`.
- Public no-arg `useSelector(handle)` is outside the terminal host contract.
- Core selector law owns precision classification and route decision.
- React host consumes core route and must not keep a parallel eligibility decision once the route API exists.
- Selector fingerprint, with path-authority digest or epoch, owns topic identity.
- Dirty-side fallback and read-side broad / dynamic fallback reject under default dev/test policy when they affect host projections.

### Effect On This Ledger

- `C-prime` remains valid as a product cutover plan only where it does not conflict with T2.
- Any implementation step that touches selector route, selector fingerprint, path authority, dirty/read overlap, or fallback policy must follow the kernel T2 proposal and its SSoT cutover.
- Existing wording about current selector carriers is historical planning context, not final public API authority.
