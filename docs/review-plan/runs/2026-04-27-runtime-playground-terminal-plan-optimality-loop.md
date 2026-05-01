# Runtime Playground Terminal Plan Review Ledger

## Meta

- target: `docs/next/logix-api-planning/runtime-playground-terminal-proposal.md`
- targets:
  - `docs/next/logix-api-planning/runtime-playground-terminal-proposal.md`
- source_kind: file-plan
- reviewer_count: 3
- reviewer_model: gpt-5.5
- reviewer_reasoning: xhigh
- challenge_scope: open
- consensus_status: consensus-achieved

## Bootstrap

- target_complete: true
- alignment_gate:
  - policy: auto
  - status: inferred
  - resolved_points:
    - User requested one round of terminal, no-cost planning.
    - User explicitly allowed challenging existing implementation.
    - User explicitly invoked `$plan-optimality-loop`.
    - Scope includes whether non-UI trial/run can support docs playground.
  - open_questions: []
  - confirmation_basis: user request on 2026-04-27
- review_contract:
  - artifact_kind: implementation-plan
  - review_goal: implementation-ready
  - target_claim: Logix can support a pure runtime playground for non-UI Program examples while keeping verification trial inside the existing runtime control plane.
  - target_refs:
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
    - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
    - `packages/logix-core/src/Runtime.ts`
    - `packages/logix-sandbox/src/Client.ts`
  - non_default_overrides:
    - alignment_policy: auto
    - scope_fence: planning only, no implementation code changes
    - stop_condition: bounded-rounds
    - write_policy: update proposal and this ledger
- review_object_manifest:
  - source_inputs:
    - user request
    - current SSoT docs
    - current sandbox/runtime inspection
    - reviewer A1/A2/A3 challenge results
  - materialized_targets:
    - `docs/next/logix-api-planning/runtime-playground-terminal-proposal.md`
  - authority_target: `docs/next/logix-api-planning/runtime-playground-terminal-proposal.md`
  - bound_docs:
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
    - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
  - derived_scope:
    - pure runtime docs playground
    - sandbox browser execution
    - control-plane trial/check boundary
  - allowed_classes:
    - implementation-plan critique
    - SSoT consistency critique
    - public/internal boundary critique
    - proof obligation critique
  - blocker_classes:
    - second verification report authority
    - new core root noun without strict dominance proof
    - UI host deep trial as v1 blocker
    - implementation work in this loop
  - ledger_target: `docs/review-plan/runs/2026-04-27-runtime-playground-terminal-plan-optimality-loop.md`
- challenge_scope: open
- reviewer_set:
  - A1 structure purity
  - A2 token economy
  - A3 dominance alternatives and target-function challenge
- active_advisors:
  - A4 folded into A3
- activation_reason:
  - Open scope touches architecture, public contract, and long-term docs product direction.
- max_reviewer_count: 3
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
- stop_rule: one challenge round plus main-agent synthesis; consensus can be adopted with explicit residual risk.
- reopen_bar: only a strictly dominating candidate on dominance axes can reopen adopted decisions.
- ledger_path: `docs/review-plan/runs/2026-04-27-runtime-playground-terminal-plan-optimality-loop.md`
- writable: true

## Assumptions

- A1:
  - summary: Docs can use Run for example output and reserve Trial for diagnostics.
  - status: kept
  - resolution_basis: valid only for Logix Program examples; raw Effect examples only use Run.
- A2:
  - summary: current `Runtime.runProgram` implementation is stable enough to support terminal `Runtime.run` as the non-UI execution primitive.
  - status: kept
  - resolution_basis: current core tests cover basic run, args, scoped open, dispose, close timeout, error taxonomy, and transaction guard; browser wrapper proof remains required.
- A3:
  - summary: Browser worker can serialize useful non-UI results without exposing arbitrary object graphs.
  - status: kept
  - resolution_basis: kept only with JSON-safe projection, size budget, truncation, and serialization-failure proof.
- A4:
  - summary: Public sandbox root can remain narrow while apps/docs uses app-local adapters.
  - status: kept
  - resolution_basis: adopted candidate moves docs runner projection to app-local adapter and forbids public sandbox playground contract.

## Round 1

### Phase

- challenge

### Input Residual

- none

### Findings

- F1 `high` `invalidity`:
  - summary: Initial plan allowed both `Program + main` and `default Effect`, while Trial requires Program authority.
  - evidence: A1, A2, and A3 all flagged D3/D6 as a closure failure.
  - status: closed
- F2 `high` `ambiguity`:
  - summary: Initial `Program + main` wording risked becoming a new public authoring or CLI entry surface.
  - evidence: A3 noted `Runtime.runProgram(program, main, options)` accepts `main` as host callback, while `check/trial` accept Program.
  - status: closed
- F3 `high` `invalidity`:
  - summary: Initial named `PlaygroundRunResult` risked becoming a third transport/report contract.
  - evidence: A2 compared it with existing sandbox `RunResult`, CLI `CommandResult`, and control-plane artifact law.
  - status: closed
- F4 `medium` `controversy`:
  - summary: Worker action family `RUN_EXAMPLE / RUNTIME_CHECK / RUNTIME_TRIAL` duplicated CLI/control-plane stage vocabulary.
  - evidence: A1 and A2 both rejected long-lived uppercase action family.
  - status: closed
- F5 `medium` `ambiguity`:
  - summary: Default Trial panel on every docs example would increase UI and token noise, and raw Effect examples cannot produce Program trial reports.
  - evidence: A2 and A3 both recommended Source + Run by default, Check/Trial on demand.
  - status: closed
- F6 `medium` `invalidity`:
  - summary: V1 capability list was wider than proof plan.
  - evidence: A1 and A3 both required timeout, cleanup, serialization, budget, and same-source Trial proof.
  - status: closed
- F7 `medium` `ambiguity`:
  - summary: Shared runtime substrate wording was too wide and risked a playground-owned diagnostic kernel.
  - evidence: A1 required sharing only compile/import/worker/budget envelope, leaving diagnostic truth in core control plane.
  - status: closed
- F8 `medium` `ambiguity`:
  - summary: `Runtime.runProgram` and `Runtime.trial` names did not express that they are two running faces of the same temporary runtime session idea.
  - evidence: post-review naming discussion concluded that `runProgram` reads like production execution while `trial` reads like a result runner; terminal naming should be `Runtime.run / Runtime.trial / Runtime.check`.
  - status: closed

### Counter Proposals

- P1:
  - summary: Private docs runner adapter plus Program-only Trial.
  - why_better: removes public playground contract, preserves Program as authority, keeps Trial diagnostic-only, and lets docs show Run results.
  - overturns_assumptions:
    - A1 unrestricted
    - A3 unrestricted
    - A4 unrestricted
  - resolves_findings:
    - F1
    - F2
    - F3
    - F4
    - F5
    - F6
    - F7
  - supersedes_proposals:
    - initial two-lane plan with public-looking `PlaygroundRunResult`
  - dominance: dominates
  - axis_scores:
    - concept-count: lower
    - public-surface: lower
    - compat-budget: lower
    - migration-cost: similar
    - proof-strength: higher
    - future-headroom: higher
  - status: adopted
- P2:
  - summary: Keep raw Effect examples as smoke-only Run examples.
  - why_better: avoids fake or skipped Trial reports for non-Program examples.
  - overturns_assumptions:
    - A1 unrestricted
  - resolves_findings:
    - F1
    - F5
  - supersedes_proposals:
    - default Effect as first-class Logix runnable docs contract
  - dominance: dominates
  - axis_scores:
    - concept-count: lower
    - public-surface: same
    - compat-budget: lower
    - migration-cost: lower
    - proof-strength: higher
    - future-headroom: same
  - status: adopted

### Resolution Delta

- Initial plan rewritten around `private-docs-runner-program-only-trial`.
- Post-review naming amendment added `Runtime.run` as terminal result-face API, backed by current `Runtime.runProgram` implementation evidence.
- Named public `PlaygroundRunResult` removed.
- `main` demoted to app-local docs adapter convention.
- Check/Trial made on-demand diagnostics.
- Worker protocol recommendation compressed back to `COMPILE + RUN` plus private intent.
- Proof pack narrowed to core shape separation plus failure/budget proof.
- Hygiene items moved out of minimal proof pack.

## Adoption

- adopted_candidate: private-docs-runner-program-only-trial
- lineage:
  - initial two-lane Run/Trial proposal
  - A1 minimal axiom proposal
  - A2 app-local projection compression
  - A3 private docs runner and Program-only Trial dominance proposal
- rejected_alternatives:
  - `Runtime.playground`
  - `Runtime.trial` as example runner
  - public sandbox playground result contract
  - raw Effect examples as first-class Logix runnable docs examples
  - UI host trial as v1 milestone
- rejection_reason:
  - These alternatives increase concept count, public surface, or second-authority risk without improving proof strength for non-UI Program docs examples.
- dominance_verdict:
  - Adopted candidate dominates baseline on concept-count, public-surface, compat-budget, proof-strength, and future-headroom; migration cost is acceptable because the repo is forward-only.

### Freeze Record

- adopted_summary:
  - Use a private docs runner adapter for non-UI Logix Program examples. Run uses terminal `Runtime.run(Program, main, options)` and returns an app-local JSON projection. Current implementation evidence comes from `Runtime.runProgram`. Check and Trial use `Runtime.check/trial(Program)` and return `VerificationControlPlaneReport`.
- kernel_verdict:
  - Ramanujan: fewer public concepts than `Runtime.playground` or public sandbox playground contract.
  - Kolmogorov: one Logix docs entry convention and one app-local projection minimize docs and test branching.
  - Godel: avoids second report authority and keeps Program as the single verification entry.
- frozen_decisions:
  - `trial` remains diagnostic-only.
  - terminal runtime API naming is `Runtime.check / Runtime.trial / Runtime.run`.
  - current `Runtime.runProgram` should be renamed, replaced, or kept internal during cutover.
  - no `Runtime.playground` in v1.
  - Program is the only Logix docs verification entry.
  - `main` is app-local docs runner convention.
  - no named public `PlaygroundRunResult`.
  - sandbox public root remains unchanged.
  - Source + Run is default docs layout; Check/Trial are on demand.
  - raw Effect examples are smoke-only and do not show Trial.
- non_goals:
  - UI host deep trial
  - scenario runner productization
  - raw trace compare
  - public sandbox playground API
  - core or CLI entry shape that accepts “module with main”
- allowed_reopen_surface:
  - A future proposal may reopen public sandbox API only with strict dominance proof on all six axes.
  - Scenario or UI host support can reopen only after the relevant SSoT owner lands the capability.
- proof_obligations:
  - `Runtime.run` naming cutover proof or explicit internalization proof for `Runtime.runProgram`.
  - Browser Program Run projection proof.
  - Same-source Trial report proof.
  - Run projection versus Trial report shape separation proof.
  - timeout, close timeout, serialization, result budget, and log budget proof.
  - raw Effect cannot trigger Trial proof.
- delta_from_previous_round:
  - all reviewer high and medium findings addressed in proposal rewrite

## Round 2

### Phase

- converge

### Input Residual

- Round 1 findings F1-F7 plus post-review naming amendment F8 against adopted freeze record

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- A1: no unresolved findings; confirms Program-only Trial, app-local `main`, docs projection, narrow transport, and proof pack closure.
- A2: no unresolved findings; confirms contract compression and no directly dominating alternative.
- A3: no unresolved findings; confirms adopted candidate remains the strongest dominance candidate.
- Main-agent amendment: `Runtime.run` terminal naming integrated after converge; it does not reopen public surface because it replaces current `runProgram` naming rather than adding a new runtime family.

## Consensus

- reviewers:
  - A1: no unresolved findings after converge
  - A2: no unresolved findings after converge
  - A3: no unresolved findings after converge
- adopted_candidate: private-docs-runner-program-only-trial
- final_status: consensus achieved with residual implementation proof risk
- stop_rule_satisfied: true
- residual_risk:
  - Browser wrapper proof still needs implementation.
  - Docs UI density still needs design review before landing.
  - Program imports and mocked HTTP are intentionally deferred until baseline proof passes.
