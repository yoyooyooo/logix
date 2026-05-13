# 171 Agent Live Runtime Bridge Batch 2 Plan Optimality Loop

## Meta

- `target`: `specs/171-agent-live-runtime-bridge`
- `targets`:
  - `specs/171-agent-live-runtime-bridge/spec.md`
  - `specs/171-agent-live-runtime-bridge/discussion.md`
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- `source_kind`: `file-spec`
- `reviewers`: `A1`, `A2b`, `A3`, `A3b`, `A4`
- `round_count`: 3
- `challenge_scope`: `open`
- `consensus_status`: `superseded-by-cli-owner-rewrite`

## Current Authority Override

本 ledger 记录 Batch 2 历史共识。它已被后续 CLI owner rewrite 重开，不再作为当前 public CLI surface authority。当前冻结结论以 `docs/ssot/runtime/15-cli-agent-first-control-plane.md`、`specs/171-agent-live-runtime-bridge/spec.md` 和本文件末尾 `Supersession` 为准：verification lane 是 `logix check / trial --mode startup / compare`，live lane 是 `logix live <task>`。Batch 2 的旧“空 live command set / live namespace 后置 / live output protocol 后置”只保留为 superseded history。

## Bootstrap

- `target_complete`: true
- `alignment_gate`:
  - `policy`: `auto`
  - `status`: `inferred`
  - `resolved_points`: user explicitly requested `$plan-optimality-loop`, asked to reopen subagents, and asked to continue until discussion points are converted into necessary planning artifacts.
  - `open_questions`: none
  - `confirmation_basis`: superseded Batch 2 basis. Batch 1 froze core live bridge first and conditional CLI live; Batch 2 focus was CLI live surface and command shape; write-back to `spec.md`, `discussion.md`, and this ledger was allowed.
- `review_contract`:
  - `artifact_kind`: `ssot-contract`
  - `review_goal`: `design-closure`
  - `target_claim`: Batch 2 must decide whether any public `logix live ...` command belongs in `171`, while preserving the existing CLI law that public verification routes are `check / trial / compare` and preventing a second live command truth, stdout envelope, evidence envelope, session truth, operation authority, or verification verdict.
  - `target_refs`: see `targets`
  - `non_default_overrides`:
    - `scope_fence`: challenge public CLI live namespace, P1 live command set, live output envelope, executable command discovery, exact rerun coordinate relationship, and CLI/core authority boundary; do not start implementation.
    - `stop_condition`: `consensus`
    - `write_policy`: main agent may update `spec.md`, `discussion.md`, and this ledger; implementation code is out of scope.
- `review_object_manifest`:
  - `source_inputs`: user request, Batch 1 ledger, `spec.md`, `discussion.md`, `15`, `09`, `14`
  - `materialized_targets`: `spec.md`, `discussion.md`, this ledger
  - `authority_target`: `spec.md`
  - `bound_docs`: `15-cli-agent-first-control-plane.md`, `09-verification-control-plane.md`, `14-dvtools-internal-workbench.md`
  - `derived_scope`: Batch 2 CLI Live Surface And Command Shape historical label; adopted target was C171-G zero public live commands with repo-internal bridge handoff. This was later superseded by public `logix live <task>`.
  - `allowed_classes`: superseded Batch 2 basis: public command surface, CLI reopen gate, live capability lowering, internal bridge transport, canonical evidence handoff, stdout envelope authority, discovery boundary, exact rerun coordinate boundary
  - `blocker_classes`: superseded Batch 2 basis except authority blockers. Current blockers remain CLI-owned report truth, CLI-owned evidence envelope, CLI-owned live session truth, command surface that bypasses `15`, and operation commands before safety. Public `logix live <task>` and `LiveCommandResult` have since been adopted through `15`.
  - `ledger_target`: this file
- `reviewer_set`: `A1`, `A2b`, `A3`, `A3b`, `A4`
- `kernel_council`: `Ramanujan`, `Kolmogorov`, `Godel`
- `dominance_axes`: `concept-count`, `public-surface`, `compat-budget`, `migration-cost`, `proof-strength`, `future-headroom`
- `stop_rule`: pass Ramanujan, Kolmogorov, and Godel gates before adoption; converge reviewers must report no unresolved findings after write-back.
- `reopen_bar`: a later public live CLI proposal must strictly improve at least one dominance axis without growing report/evidence/session authority, weakening `15`, adding a second stdout protocol, or bypassing Batch 6 operation safety.
- `ledger_path`: `docs/review-plan/runs/2026-05-01-171-agent-live-runtime-bridge-batch-2.md`
- `writable`: true

## Assumptions

- `A-B2-001`: A public `logix live ...` namespace should be frozen in `171`.
  - `status`: `overturned`
  - `resolution_basis`: reviewers found public live commands premature under current `15` law and weaker than repo-internal bridge transport plus canonical evidence handoff.
- `A-B2-002`: P1 live needs require public CLI verbs such as `status`, `list`, `inspect`, `events`, `snapshot`, `profile`, `dispatch`, and `export`.
  - `status`: `overturned`
  - `resolution_basis`: P1 needs lower to internal `LiveTarget`, `EvidenceWindow`, `ControlledOperation`, and `CanonicalEvidenceExport` capabilities.
- `A-B2-003`: `CommandResult` can serve as the live session envelope.
  - `status`: `overturned`
  - `resolution_basis`: `CommandResult` remains stdout transport for `check / trial / compare`; live transport may only use internal derived mirrors and durable canonical evidence handoff.
- `A-B2-004`: Public executable live command discovery should be added for Agent convenience.
  - `status`: `overturned`
  - `resolution_basis`: executable live discovery would reopen the `15` discovery boundary and create an additional public surface before proof.
- `A-B2-005`: `logix live export` can be frozen as a small safe public command even if the rest of live commands wait.
  - `status`: `deferred`
  - `resolution_basis`: it remains a possible future `15` reopen candidate only if internal bridge handoff proves insufficient.
- `A-B2-006`: Live session coordinates can become durable CLI rerun truth.
  - `status`: `overturned`
  - `resolution_basis`: durable handoff is canonical evidence package, target coordinates, artifact refs, evidence gaps, and budget markers; bridge session locators, if any, remain transport-local.

## Rounds

### Round 1 Challenge

Findings:

- `F-B2-001`
  - `severity`: `blocker`
  - `class`: `invalidity`
  - `summary`: Freezing public `logix live ...` commands conflicts with the current CLI SSoT.
  - `evidence`: `15-cli-agent-first-control-plane.md` freezes `logix check / trial / compare` as the only public routes and requires a reopen before adding command surface.
  - `status`: `closed`
- `F-B2-002`
  - `severity`: `blocker`
  - `class`: `invalidity`
  - `summary`: A public live command family would create stdout, session, operation, and discovery authority before core attachment and operation safety close.
  - `evidence`: Batch 1 deferred public CLI live; Batch 3 still owns attachment substrate and Batch 6 still owns controlled operation allowlist.
  - `status`: `closed`
- `F-B2-003`
  - `severity`: `high`
  - `class`: `ambiguity`
  - `summary`: The candidate command family mixed capability nouns with public CLI verbs.
  - `evidence`: `status/list/inspect`, `events/snapshot/profile`, `wait/dispatch`, and `export evidence` map to different runtime capabilities and safety gates.
  - `status`: `closed`
- `F-B2-004`
  - `severity`: `high`
  - `class`: `invalidity`
  - `summary`: Reusing `CommandResult` as a live session envelope would overload a stage stdout transport.
  - `evidence`: `15` defines CLI output around verification reports and artifact refs for `check / trial / compare`; live sessions are streaming or transport-local.
  - `status`: `closed`
- `F-B2-005`
  - `severity`: `high`
  - `class`: `controversy`
  - `summary`: Public executable live discovery would reopen a fourth public surface before dogfood proof.
  - `evidence`: `15` allows package-local static schema artifacts as derived mirrors and explicitly rejects executable public discovery in v1.
  - `status`: `closed`
- `F-B2-006`
  - `severity`: `medium`
  - `class`: `ambiguity`
  - `summary`: Exact rerun coordinates needed a boundary between live transport locators and durable evidence refs.
  - `evidence`: CLI rerun authority belongs to stage inputs, `CommandResult` locator snapshots, reports, and artifact refs; live session ids cannot become durable runtime truth.
  - `status`: `closed`

Counter proposals:

- `CP-B2-001`
  - `summary`: `C171-G Zero Public Live Commands, Internal Bridge Handoff`
  - `why_better`: preserves C171-E while removing unproved public CLI live commands, output protocol, command discovery, and session truth.
  - `overturns_assumptions`: `A-B2-001`, `A-B2-002`, `A-B2-003`, `A-B2-004`, `A-B2-006`
  - `resolves_findings`: `F-B2-001` to `F-B2-006`
  - `supersedes_proposals`: full public `logix live ...` command family
  - `dominance`: `dominates`
  - `axis_scores`:
    - `concept-count`: better
    - `public-surface`: better
    - `compat-budget`: better
    - `migration-cost`: better
    - `proof-strength`: better
    - `future-headroom`: better
  - `status`: `adopted`

Resolution delta:

- `spec.md` now adopts `C171-G`.
- `discussion.md` now records the rejected public command family, adopted candidate, frozen decisions, deferred public CLI shapes, and closed questions.
- Public `logix live ...`, public `logix live export`, executable live command discovery, public live stdout protocol, and public dispatch/profile/wait shapes remain deferred.

## Adoption

- `adopted_candidate`: `C171-G Zero Public Live Commands, Internal Bridge Handoff`
- `lineage`: synthesized from A1, A2, A3, and A4 Batch 2 reviews.
- `rejected_alternatives`:
  - full public `logix live ...` command family
  - public live `status/list/inspect` command subset
  - public live `events/snapshot/profile` command subset
  - public `logix live dispatch` or `wait`
  - public `logix live export` in `171`
  - `CommandResult` as live session envelope
  - executable live command discovery
- `rejection_reason`: each rejected alternative failed at least one of public-surface, proof-strength, concept-count, or Godel authority gates under current `15` law.
- `dominance_verdict`: superseded Batch 2 verdict. `C171-G` was considered dominant before the CLI owner rewrite; current dominance is recorded in `15` and the flat CLI ledger Round 2.

### Freeze Record

- `adopted_summary`: superseded Batch 2 summary. Current public live route is `logix live <task>`.
- `kernel_verdict`: superseded Batch 2 kernel verdict. Current kernel verdict accepts one `live` namespace because it avoids flat roots while preserving `15`, `09`, Workbench, and core authority boundaries.
- `frozen_decisions`:
  - Superseded: current public `logix live ...` command set is empty.
  - Superseded: Public CLI remains only `logix check / trial / compare`.
  - Candidate `status/list/inspect` shapes lower to `LiveTarget` discovery capabilities.
  - Candidate `events/snapshot/profile` shapes lower to `EvidenceWindow` capture capabilities.
  - Candidate `wait/dispatch` shapes lower to `ControlledOperation` variants; final allowlist is closed by Batch 6.
  - Superseded: Candidate `export evidence` lowers to repo-internal canonical evidence export handoff and does not become a public CLI command in `171`.
  - Superseded: Repo-internal live transport may use an internal envelope, but that envelope is a derived mirror and owns no report, evidence, session, or verdict truth.
  - `CommandResult` remains the stdout envelope for `logix check / trial / compare`; it is not a live session envelope.
  - Live transport durable output can only be canonical evidence package, selection or target coordinates, artifact refs, evidence gaps, and budget markers.
  - Superseded: Public live commands can reopen only through `15` rewrite plus dogfood, command-count, misuse, authority, output-protocol, and no-second-truth proof. The rewrite has since happened.
- `non_goals`:
  - public `logix live ...` namespace
  - public `logix live export`
  - public live output protocol
  - executable live command discovery
  - public dispatch/profile/wait command shapes
  - CLI-owned live session truth
  - CLI-owned evidence envelope
  - CLI-owned verification verdict
- `allowed_reopen_surface`:
  - Future `15` rewrite may reopen public live commands after internal bridge dogfood proves repo-internal transport insufficient.
  - A future public `logix live export` may be reconsidered only if it preserves canonical evidence authority and does not create a live session stdout truth.
  - Batch 6 may refine controlled-operation capability names and admission gates before any public command discussion.
- `proof_obligations`:
  - Internal bridge transport must prove it can satisfy P1 Agent discovery, capture, controlled operation, and export needs without a public command surface.
  - Canonical evidence export must prove durable handoff into `check / trial / compare`.
  - Text sweep must show no unconditional public CLI live command requirement remains active.
  - Any future public live CLI reopen must provide dogfood evidence, command-count proof, misuse proof, authority proof, output-protocol proof, and no-second-truth proof.
- `delta_from_previous_round`: Batch 2 replaces candidate public command family with `C171-G`; public `logix live ...`, `CommandResult` live envelope, and executable live discovery are removed from `171` authority.

## Round 2 Converge

### Phase

- `converge`

### Input Residual

- Verify whether `C171-G` write-back in `spec.md`, `discussion.md`, and this ledger resolves `F-B2-001` to `F-B2-006`.

### Findings

- `F-B2-CV-001`
  - `severity`: `medium`
  - `class`: `ambiguity`
  - `summary`: `spec.md` still described P1 live bridge capabilities as `commands`, which could be read as public CLI live commands.
  - `evidence`: A2b converge review found User Story 1 priority rationale used `snapshot, dispatch, profile, and evidence export commands` while FR-002 and FR-026 freeze an empty public CLI live command set.
  - `status`: `closed`
- `F-B2-CV-002`
  - `severity`: `low`
  - `class`: `ambiguity`
  - `summary`: `discussion.md` top review draft still said CLI could own an independent live lane without marking it historical.
  - `evidence`: A2b converge review found the pre-Batch-2 `target_claim` near the top of `discussion.md` could confuse later readers despite later C171-G sections.
  - `status`: `closed`

### Counter Proposals

- `CP-B2-CV-001`
  - `summary`: Keep C171-G and rewrite stale wording to capability-first and historical-draft wording.
  - `why_better`: improves proof-strength without changing public surface, concept count, or adopted authority law.
  - `overturns_assumptions`: none
  - `resolves_findings`: `F-B2-CV-001`, `F-B2-CV-002`
  - `supersedes_proposals`: none
  - `dominance`: `partial`
  - `axis_scores`:
    - `concept-count`: same
    - `public-surface`: same
    - `compat-budget`: same
    - `migration-cost`: same
    - `proof-strength`: better
    - `future-headroom`: same
  - `status`: `adopted`

### Resolution Delta

- `spec.md` now says P1 follow-on shape is `bridge capabilities`, not commands.
- `discussion.md` now marks the top review contract as historical and changes the CLI lane text to future public CLI live reopen after `15` rewrite and proof gate.
- A1, A3, A3b, and A4 reported no content-level unresolved findings before this cleanup; A2 timed out and is treated as stale.
- A2b and A3b residual converge confirmed `F-B2-CV-001` and `F-B2-CV-002` are closed.

## Round 3 Residual Converge

### Phase

- `converge`

### Input Residual

- Verify whether `F-B2-CV-001` and `F-B2-CV-002` rewrites fully close stale public live command wording.

### Findings

- none

### Counter Proposals

- none

### Resolution Delta

- A2b and A3b residual converge reviewers returned `无 unresolved findings`.
- Remaining `logix live ...`, public live command, and `CommandResult` hits are classified as rejected, deferred, conditional reopen, historical candidate, or `check / trial / compare` stdout transport context.
- No reviewer found a proposal that directly dominates `C171-G`.

## Consensus

- `reviewers`: `A1`, `A2b`, `A3`, `A3b`, `A4`
- `adopted_candidate`: `C171-G Zero Public Live Commands, Internal Bridge Handoff`
- `final_status`: `consensus`
- `stop_rule_satisfied`: true
- `residual_risk`:
  - controlled-operation allowlist remains Batch 6.
  - performance budget and proof commands remain a later planning closure item.

## Supersession

`C171-G` 是 Batch 2 历史共识，不再是当前 CLI surface authority。用户随后明确要求 public CLI 必须提供 runtime/server communication 能力。`15-cli-agent-first-control-plane.md` 已重开并采纳 `Public Live Namespace Contract`：

```text
verification roots:
  logix check
  logix trial --mode startup
  logix compare

live root:
  logix live <task>
```

仍保留的 Batch 2 约束：

- flat root live commands 仍拒绝。
- `CommandResult` 仍不是 live session envelope。
- live commands 仍不能拥有 report、stage、verdict、session、runtime identity、operation authority 或 evidence envelope。
- live durable handoff 仍只能是 canonical evidence package、target coordinates、artifact refs、evidence gaps 和 budget markers。

被替换的 Batch 2 结论：

- `current public logix live command set is empty`
- live output protocol 后置
- public `logix live` namespace 后置
