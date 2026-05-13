# 171 Agent Live Runtime Bridge Batch 6 Plan Optimality Loop

## Meta

- `target`: `specs/171-agent-live-runtime-bridge`
- `targets`:
  - `specs/171-agent-live-runtime-bridge/spec.md`
  - `specs/171-agent-live-runtime-bridge/discussion.md`
  - `specs/171-agent-live-runtime-bridge/plan.md`
  - `specs/171-agent-live-runtime-bridge/implementation-details/security-budget.md`
  - `docs/ssot/runtime/02-hot-path-direction.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
- `source_kind`: `file-spec`
- `reviewers`: main agent synthesis plus parallel reviewer
- `round_count`: 1
- `challenge_scope`: `open`
- `consensus_status`: `consensus`

## Bootstrap

- `target_complete`: true
- `review_contract`:
  - `artifact_kind`: `ssot-contract`
  - `review_goal`: `design-closure`
  - `target_claim`: Active debug operations can enter 171 only through a minimal allowlist, explicit permission, no-mutation denial, bounded capture budgets, redaction, and disabled-path proof.
  - `non_default_overrides`:
    - `scope_fence`: challenge operation allowlist, P1/P2 split, permission model, local/browser/Node/Playground/cloud boundaries, redaction, budget thresholds, proof commands, and transaction-window IO law.
    - `stop_condition`: `consensus`
    - `write_policy`: planning artifacts and SSoT docs may be updated; implementation code is out of scope.
- `review_object_manifest`:
  - `authority_target`: `specs/171-agent-live-runtime-bridge/spec.md`
  - `bound_docs`: `02`, `09`, `security-budget`
  - `derived_scope`: Batch 6 security, budget, and debug operation safety
  - `allowed_classes`: operation allowlist, safety gate, budget law, redaction classes, proof commands, rejected operation list
  - `blocker_classes`: arbitrary state patch, time travel mutation, hidden mutation, undeclared dispatch, unbounded stream, transaction-window IO, cloud mutation without product protocol
  - `ledger_target`: this file
- `kernel_council`: `Ramanujan`, `Kolmogorov`, `Godel`
- `dominance_axes`: `concept-count`, `public-surface`, `compat-budget`, `migration-cost`, `proof-strength`, `future-headroom`
- `reopen_bar`: a later proposal must improve Agent repair proof without weakening no-mutation denial, disabled overhead, redaction, or transaction-window rules.

## Findings

- `F-B6-001`
  - `severity`: `blocker`
  - `summary`: P1 operation allowlist was still a candidate list.
  - `evidence`: `research.md` listed dispatch, wait, snapshot, profile, and export as candidates and left Q171-005 open.
  - `resolution`: adopt a minimal P1 allowlist with explicit gates: target discovery, bounded event-window capture, snapshot read, wait condition, evidence export, declared action dispatch, and local-only bounded runtime-profile summary. Deep CPU/heap profiling, time travel, arbitrary patch, eval, DOM mutation, and hidden mutation stay rejected or future.
  - `status`: `closed`
- `F-B6-002`
  - `severity`: `blocker`
  - `summary`: Permission and remote/cloud boundaries were too broad to protect mutation-capable operations.
  - `evidence`: Batch 3 froze cloud-compatible constraints, but Batch 6 still had to decide action dispatch and profile safety.
  - `resolution`: freeze local/browser/Playground dev-only opt-in rules, Node process/session scoping, remote/cloud explicit auth and audit, and remote/cloud observation-only P1. Remote mutation requires a future cloud product protocol.
  - `status`: `closed`
- `F-B6-003`
  - `severity`: `high`
  - `summary`: Performance budget owner and proof commands were open.
  - `evidence`: `plan.md` contained a command template and `security-budget.md` said Batch 6 must freeze thresholds.
  - `resolution`: owner is `02` plus 171 perf notes. Proof uses `pnpm perf collect`, `pnpm perf diff`, and `pnpm perf validate`. Disabled path must show structural no-op, no transaction IO, no capture buffer allocation, and no comparable p95 regression beyond max 1 percent or 0.05 ms.
  - `status`: `closed`
- `F-B6-004`
  - `severity`: `high`
  - `summary`: Redaction policy lacked classes and failure behavior.
  - `evidence`: NFR-007 required redaction or gaps, but classes were not frozen.
  - `resolution`: freeze redaction classes for secrets/config/env, user payload, host DOM/text, source snippets, stack/raw errors, network/process/tenant identifiers, and large or cyclic values. Omission emits redaction marker or evidence gap.
  - `status`: `closed`

## Adoption

- `adopted_candidate`: `C171-J Minimal Safe Operations With Budget Gates`
- `alias`: `Safety-Tiered Operation Allowlist`
- `summary`: Batch 6 admits only the operation kinds required for the Agent repair loop and proofs. All active operations pass core admission, capability checks, binding checks, and post-commit evidence drain. Disabled path remains structural no-op.
- `dominance_verdict`:
  - `concept-count`: better, because one allowlist and one admission taxonomy replace per-surface operation sets.
  - `public-surface`: same, because no public live command is added.
  - `compat-budget`: same, because forward-only internal gates avoid compatibility wrappers.
  - `migration-cost`: better, because unsafe operations are cut before implementation.
  - `proof-strength`: better, because every operation has permission, mutation, evidence, redaction, and budget rules.
  - `future-headroom`: better, because deep profiling and cloud mutation can reopen with product protocol evidence.

### Freeze Record

- P1 allowlist:
  - `target.discover`
  - `capture.eventWindow`
  - `snapshot.read`
  - `wait.condition`
  - `evidence.export`
  - `dispatch.declaredAction`
  - `profile.runtimeSummary` as local-only bounded summary
- P2 or future:
  - browser CPU profile integration
  - heap snapshot
  - remote/cloud mutation
  - long-running stream
  - cross-process aggregation
- Rejected:
  - arbitrary state patch
  - time travel mutation
  - hidden internal mutation
  - undeclared action dispatch
  - dynamic code eval
  - host DOM mutation through bridge
  - transaction-window IO
  - unbounded raw trace stream
- Mutation-capable operation requirements:
  - actor id
  - capability grant
  - target coordinate
  - manifest digest
  - action tag
  - payload schema ref or validator availability ref for non-void dispatch
  - binding status
  - tenant/session/process boundary when applicable
  - no transaction-window IO
  - `operation.denied` with no mutation on any precondition failure
- Budget defaults:
  - disabled path: structural no-op, no capture buffer, no serialization, no transport IO, no listener fanout inside transaction.
  - disabled p95 regression gate: max 1 percent or 0.05 ms over comparable baseline.
  - event-window default budget: 256 events per target/window; hard proof cap: 2048.
  - event payload inline summary: 4 KiB; larger content becomes artifact ref, degradation marker, or redaction marker.
  - snapshot inline preview: 64 KiB; larger content becomes artifact ref with budget marker.
  - profile runtime summary: max 5 seconds and sampled summary only; no heap or CPU trace in P1.
  - evidence export inline budget: 2 MiB; larger output must use artifact refs and budget markers.

## Proof Obligations

- `rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/before.<sha>.<envId>.default.json`
- `rtk pnpm perf collect -- --profile default --out specs/171-agent-live-runtime-bridge/perf/after.<sha-or-worktree>.<envId>.default.json`
- `rtk pnpm perf diff -- --before <before> --after <after> --out specs/171-agent-live-runtime-bridge/perf/diff.before__after.json`
- `rtk pnpm perf validate -- --report <report>`
- Contract proof must show unauthorized, stale, unsafe, validator-unavailable, and digest-mismatch operations return `operation.denied` before mutation.
- Evidence proof must show budget, sampling, dropped, degraded, and redaction markers where applicable.
