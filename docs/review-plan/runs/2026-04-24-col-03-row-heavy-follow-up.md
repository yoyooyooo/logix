# COL-03 Row-Heavy Follow-up

## Meta

| field | value |
| --- | --- |
| artifact_kind | `collision-follow-up` |
| collision_id | `COL-03` |
| linked_proposal | `docs/proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md` |
| owner | `coordination-main-agent` |
| execution_topology | `multi-agent` |
| status | `completed` |
| decision_question | `row-heavy pressure 是否已经逼出 list/root soft fact lane，或者 current field-local lane 仍可继续作为最小生成元候选` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, `SC-D` claim surface plus `SC-E` pressure surface |
| target_caps | `CAP-10`, `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23` |
| related_projections | `PROJ-03`, `PROJ-05` |
| related_collisions | `COL-03` |
| required_proofs | `PF-05`, `PF-06` |
| coverage_kernel | `minimal-generator-first`, `collision-before-adoption`, `proof-before-authority`, `no-hidden-gap` |
| decision_policy | `P0 hard laws -> concept-count -> public-surface -> generator efficiency -> proof-strength -> future-headroom` |
| generator_hypothesis | `one field-local soft fact lane can survive row-heavy owner remap without reopening list/root scope` |
| non_claims | exact public spelling, exact read carrier, runtime implementation details, helper placement |

## Imported Frozen Law

- `field-only companion` 仍是当前唯一 owner scope；`list().companion` 与 `root().companion` 继续关闭
- `availability / candidates` 仍是 day-one slot inventory
- `clear | bundle` 与 owner-local atomic commit 继续作为 baseline
- `reorder / replace / byRowId / nested list / cleanup` 继续按 row identity 与 cleanup law 解释
- `replace(nextItems)` 继续按 roster replacement 解释
- active exit 后只允许残留 cleanup receipt
- synthetic local id 不能成为 row-heavy 公开真相

Source:

- `specs/155-form-api-shape/challenge-s2-row-heavy-proof-pack.md`
- `docs/review-plan/runs/2026-04-22-form-api-shape-s1-r2-owner-binding-carrier.md`
- `specs/157-form-field-path/spec.md`
- `specs/157-form-field-path/plan.md`

## Pressure Decomposition

### Pressure Cases

| case | required invariant | failure signature |
| --- | --- | --- |
| `reorder` | field-local facts continue to resolve against current canonical row id chain | row-level facts drift to render order, index teaching, or stale owner |
| `replace` | old row companion truth retires with roster replacement; only cleanup receipt may remain | old bundle remains live, or replacement forces roster-level fact owner |
| `byRowId` | write-side and read-side keep hitting the same canonical row owner after reorder | byRowId loses canonical owner or demands a second read family |
| `cleanup` | hidden / removed / replaced rows stop contributing live truth | stale / cleanup residue becomes readable truth or submit-affecting truth |
| `nested-remap` | nested list items keep full outer row ownership chain | nested companion fact loses outer owner context or requires list/root aggregation |

### Minimal Close Predicate Restated

`COL-03` can close only if field-local lane remains owner-stable through `reorder / replace / byRowId / cleanup`, and no irreducible roster-owned soft fact witness appears.

## Proof Sufficiency Check

### `PF-05` Covers

- canonical row identity continuity
- `byRowId` owner route continuity
- reorder transition stability

Expected evidence:

- `canonicalRowIdChainDigest`
- `ownerRef`
- `transition`

Status:

- already strong enough for row identity and `byRowId` continuity
- not enough on its own to close `COL-03`

### `PF-06` Must Cover

- active exit cleanup
- replace cleanup correctness
- nested owner remap
- stale residue retirement

Expected evidence:

- `noLiveHead`
- `cleanup receipt`
- `staleRef`
- `nested ownerRef`

Status:

- currently the main unresolved proof gate
- still `planned` in the harness, so `COL-03` cannot close yet

### Uncovered Edges

- no executable proof yet for `CAP-22 active exit cleanup`
- no executable proof yet for `CAP-23 nested owner remap`
- no current witness proving a genuinely roster-owned soft fact is required

### Proof Gap Assessment

The gap is narrower than a new owner-scope search. Current evidence already sustains `field-only` as the best baseline. The missing part is proof closure on cleanup and nested remap.

## Alternative Test

### Surviving Alternatives

- `field-only`
- `list/root reopen` only as escalation surface

### Blocked Candidate

- `list/root companion baseline`

### Escalation Bar

Reopen is allowed only if a witness shows a truly roster-owned soft fact that cannot be decomposed into field-local bundles without breaking owner binding, atomicity, diagnostics backlink, or measurable performance.

Current result:

- no such irreducible witness has appeared

## Decision And Next Action

### Verdict

`needs-pf-06-refinement`

### Decision Summary

- keep `PROP-001` alive as the current minimal-generator candidate
- keep `COL-03` open
- do not open `list/root` scope
- do not open a broad dedicated proof-wave yet
- narrow the next step to `PF-06` refinement for cleanup and nested owner remap

### Next Action

Design the smallest `PF-06` refinement packet that can make cleanup and nested owner remap executable without changing owner scope or public surface.

### Residual Risks

- `PF-06` may still reveal an irreducible roster-owned soft fact witness later
- `CAP-22` and `CAP-23` remain the structural weak point
- sanctioned read admissibility and diagnostics closure remain separate follow-up axes through `PF-03 / PF-07`

## Post Execution Note

`PF-06` has since been executed through `docs/review-plan/runs/2026-04-24-pf-06-refinement-packet.md`.

Outcome:

- `COL-03` closure gate satisfied
- `field-only` remains the surviving baseline
- reopen bar remains unchanged
