# CLI Agent First Control Plane Review Ledger

## Meta

- target: `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- targets:
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - `specs/160-cli-agent-first-control-plane-cutover/spec.md`
  - `specs/160-cli-agent-first-control-plane-cutover/discussion.md`
- source_kind: `file-ssot-contract`
- reviewer_count: 4
- reviewer_model: `gpt-5.5`
- reviewer_reasoning: `xhigh`
- challenge_scope: `open`
- consensus_status: `converged`

## Bootstrap

- target_complete: yes
- alignment_gate:
  - policy: `auto`
  - status: `inferred`
  - resolved_points:
    - user explicitly invoked `plan-optimality-loop`
    - user explicitly requested subagents use `gpt-5.5 xhigh`
    - target is the CLI planning contract created for `160`
    - scope is planning and docs only
    - direct file edits and ledger write are allowed by task shape
  - open_questions: none
  - confirmation_basis: user asked to continue the interrupted CLI optimality loop
- review_contract:
  - artifact_kind: `ssot-contract`
  - review_goal: `zero-unresolved`
  - target_claim: `@logixjs/cli` should converge to an Agent First runtime control-plane route; public command surface remains `check / trial / compare`; input authority is `Program` and canonical evidence; output authority is `VerificationControlPlaneReport + artifact refs`; old IR, contract-suite, and transform toolbox narratives must be sunk or deleted.
  - target_refs:
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
    - `specs/160-cli-agent-first-control-plane-cutover/spec.md`
    - `specs/160-cli-agent-first-control-plane-cutover/discussion.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/01-public-api-spine.md`
    - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
  - non_default_overrides:
    - stop_condition: `consensus`
    - write_policy: edit target SSoT, `160` spec, discussion, required docs cross references, and ledger
    - scope_fence: no implementation code
- review_object_manifest:
  - source_inputs:
    - user request
    - current `packages/logix-cli` implementation survey
    - old `085` CLI spec as background
    - current runtime control-plane SSoT
    - DVTools CLI export loop SSoT
  - materialized_targets:
    - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
    - `specs/160-cli-agent-first-control-plane-cutover/spec.md`
    - `specs/160-cli-agent-first-control-plane-cutover/discussion.md`
  - authority_target: `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - bound_docs:
    - `docs/ssot/runtime/README.md`
    - `docs/ssot/runtime/09-verification-control-plane.md`
    - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
    - `examples/logix-cli-playground/tutorials/05-baseline-and-diff/README.md`
  - derived_scope: CLI Agent First control-plane planning docs
  - allowed_classes:
    - public command surface
    - Program entry authority
    - canonical evidence input
    - selection manifest hint
    - machine report and artifact refs
    - archived command disposition
    - proof pack and docs closure
  - blocker_classes:
    - implementation code edits
    - new authoring surface
    - second verification lane
    - second report protocol
    - second evidence envelope
    - compatibility shell for old CLI commands
  - ledger_target: `docs/review-plan/runs/2026-04-26-cli-agent-first-control-plane-optimality-loop.md`
- challenge_scope: `open`
- reviewer_set:
  - A1 structure purity
  - A2 compression and maintenance cost
  - A3 consistency and anti-second-system
  - A4 target function challenge
- active_advisors:
  - A4 target function challenge
- activation_reason: CLI scope includes public command surface, breaking strategy, Agent First target function, and long-term governance.
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
- stop_rule: consensus after adopted freeze and residual review
- reopen_bar: stronger alternative must improve proof strength without increasing public command count, compat budget, or second truth risk
- ledger_path: `docs/review-plan/runs/2026-04-26-cli-agent-first-control-plane-optimality-loop.md`
- writable: yes

## Assumptions

- A1:
  - summary: `check / trial / compare` is the minimal public command set for Agent First CLI.
  - status: adopted
  - resolution_basis: dominance table rejects no-CLI, single `verify --stage`, check/trial-only, and old toolbox commands
- A2:
  - summary: `describe` should not remain a public command but may survive as non-command discovery.
  - status: revised
  - resolution_basis: v1 discovery freezes to package-local static schema artifact; public `describe`, `--describe-json`, and `CliDescribeReport` are rejected
- A3:
  - summary: old `ir.*` helpers can be sunk without losing proof strength.
  - status: adopted
  - resolution_basis: helpers may survive only under public routes and may not retain command identity
- A4:
  - summary: CLI remains worth keeping as public binary instead of deleting public CLI entirely.
  - status: adopted-with-gate
  - resolution_basis: CLI existence gate added; public CLI must justify stable Agent/CI artifact contract

## Round 1

### Phase

- challenge

### Input Residual

- baseline `160` SSoT/spec freezes CLI as Agent First control-plane route but has not yet been challenged by reviewers

### Findings

| id | finding | resolution |
| --- | --- | --- |
| F1 | `--mode` conflicted between old `report|write` and new trial modes | global `--mode report|write` deleted; `--mode` only belongs to `trial startup|scenario` |
| F2 | `CommandResult` and `VerificationControlPlaneReport` both looked like output authority | `CommandResult` frozen as transport only; `primaryReportOutputKey` points to report artifact |
| F3 | discovery could become a fourth surface | v1 discovery frozen to package-local static schema artifact as derived mirror; no public `describe`, no `--describe-json`, no `CliDescribeReport` |
| F4 | input authority mixed entry, evidence, selection and `focusRef` | stage admissibility matrix added; input authority chain split from diagnostic coordinate chain |
| F5 | Agent closure proof was under-specified | golden closure proof added around `inputCoordinate`, repair hints, focusRef, artifact output keys and unique `nextRecommendedStage` |
| F6 | CLI existence and command-count dominance were assumed | existence gate and dominance table added |
| F7 | `compare` could be productized before core authority exists | compare authority precondition added |
| F8 | old `085` still teaches superseded toolbox API | `160` closure now requires superseded / negative-only banner or archive move |

### Counter Proposals

| id | proposal | verdict |
| --- | --- | --- |
| P1 | keep three commands with stronger gates | adopted |
| P2 | delete public CLI | rejected for v1 |
| P3 | collapse to `logix verify --stage ...` | rejected |
| P4 | expose only `check / trial` | rejected for v1 |
| P5 | keep public discovery command or flag | rejected |

### Resolution Delta

- Updated `docs/ssot/runtime/15-cli-agent-first-control-plane.md` with existence gate, command dominance, discovery boundary, output transport invariant, input matrix, mode law, compare precondition and reopen bar.
- Updated `specs/160-cli-agent-first-control-plane-cutover/spec.md` with TD-000, TD-007, TD-008, TD-009, TD-010, concept-family disposition, strengthened waves, new user scenario and expanded proof pack.
- Updated `specs/160-cli-agent-first-control-plane-cutover/discussion.md` with adopted freeze summary and rejected alternatives.

## Residual Review

### Phase

- residual

### Findings

| id | finding | resolution |
| --- | --- | --- |
| R1 | package-local schema artifact could become second command contract truth | schema artifact is now explicitly a derived mirror of SSoT/core schema, with no schema authority |
| R2 | selection manifest was still listed under input authority | selection manifest moved to hint-only sidecar; input authority chain excludes it |
| R3 | `check` input listed declaration artifact while matrix forbids raw declaration artifact authority | `check` input now says Program-derived declaration coordinate/static slice |
| R4 | Agent rerun input coordinate was missing | `CommandResult.inputCoordinate` added as locator/ref snapshot for same-stage rerun and upgrade-stage inheritance |
| R5 | `nextRecommendedStage` and `repairHints[].upgradeToStage` precedence was unclear | top-level `nextRecommendedStage` is now the only Agent scheduling authority |
| R6 | artifact key/ref namespace was ambiguous across DVTools, report, and CLI artifacts | `artifacts[].outputKey` is now the only artifact key namespace; refs are locators only |

### Resolution Delta

- Updated `15` with schema derived-mirror rule, hint sidecar split, `inputCoordinate`, rerun contract, next-stage precedence and artifact key namespace.
- Updated `160` with `inputCoordinate`, TD-009 Agent rerun/linking, TD-010 compare precondition numbering, FR-021 through FR-023 and proof P-020 through P-022.
- Updated `09` with next-stage precedence over hint-local upgrades.
- Updated `14` with DVTools artifact key namespace alignment.
- Added superseded banner to all Markdown files under `specs/085-logix-cli-node-only`.

### Targeted Re-Check

- B reviewer: consensus yes; schema artifact、selection manifest、Program-derived declaration slice 三项 residual 已清零。
- C reviewer: consensus yes; `inputCoordinate`、`nextRecommendedStage` precedence、artifact key namespace 三项 residual 已清零。

## Adoption

- adopted_candidate: three public commands `check / trial / compare` with CLI existence gate, transport-only `CommandResult`, `inputCoordinate`, derived schema discovery, Program/evidence input authority, hint-only selection manifest, single artifact key namespace, and control-plane report authority
- lineage: baseline `160` plus round-1 reviewer findings F1-F8
- rejected_alternatives: no public CLI; single `verify --stage`; check/trial-only; public discovery command or flag; old toolbox commands
- rejection_reason: rejected alternatives increase script drift, parameter ambiguity, Agent-owned compare truth, public surface count, or second truth risk
- dominance_verdict: adopted candidate has the best balance across concept-count, public-surface, compat-budget, proof-strength and future-headroom

### Freeze Record

- adopted_summary: CLI remains a public binary only as Agent First runtime control-plane route; public commands are `check / trial / compare`; output authority is `VerificationControlPlaneReport`; stdout authority is transport only; rerun closure is carried by `inputCoordinate`.
- kernel_verdict: stronger than baseline after adding existence gate, dominance table, stage input matrix, discovery freeze, rerun/linking contract and compare precondition.
- frozen_decisions:
  - no public `describe`
  - no public `--describe-json`
  - no `CliDescribeReport`
  - no global `--mode report|write`
  - `trial --mode startup|scenario` is the only mode grammar
  - `CommandResult.primaryReportOutputKey` points to the canonical report artifact
  - `CommandResult.inputCoordinate` carries rerun locator/ref snapshot and owns no input truth
  - package-local schema artifact is a derived mirror, not schema authority
  - selection manifest is hint-only sidecar
  - `focusRef` stays in diagnostic coordinate chain
  - top-level `nextRecommendedStage` is the only Agent scheduling authority
  - `artifacts[].outputKey` is the only artifact key namespace
  - compare requires core-owned compare authority
  - old `085` Markdown files are superseded / negative-only background
- non_goals:
  - implementation code edits in this review loop
  - writeback or transform product surface
  - CLI-owned Agent loop, memory, policy or repair decision
  - CLI-owned report, evidence, scenario or compare truth
- allowed_reopen_surface:
  - package-local static schema artifact fails Agent discovery
  - three command shape fails Agent self-verification
  - Program entry cannot express required verification input
  - canonical evidence cannot carry DVTools or CI evidence
  - stronger alternative improves proof strength without increasing public surface or second truth risk
- proof_obligations:
  - public command allowlist
  - Program entry acceptance and Module/Logic rejection
  - evidence and selection manifest contract
  - `CommandResult` transport exactness and `primaryReportOutputKey`
  - `CommandResult.inputCoordinate` same-stage rerun and upgrade inheritance
  - artifact key namespace using `artifacts[].outputKey`
  - `nextRecommendedStage` precedence over hint-local `upgradeToStage`
  - no `describe`, no `--describe-json`, no `CliDescribeReport`
  - `--mode report|write` zero acceptance
  - stage input admissibility matrix
  - compare authority precondition
  - Agent closure golden loop
  - all `085` Markdown files carry superseded / negative-only banner
- delta_from_previous_round: unresolved reviewer findings F1-F8 and residual R1-R6 resolved into docs and proof pack

## Consensus

- reviewers: round-1 plus residual review complete
- adopted_candidate: three-command Agent First route with strengthened gates, rerun coordinates and unified artifact linking
- final_status: consensus yes
- stop_rule_satisfied: yes
- residual_risk:
  - exact implementation of Program entry loader may require later proof
  - canonical evidence exact file shape remains owned outside CLI SSoT
  - compare closure depends on core-owned compare executor/input contract
