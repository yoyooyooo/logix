# PF-06 Refinement Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `proof-refinement-packet` |
| proof_id | `PF-06` |
| linked_collision | `COL-03` |
| linked_proposal | `docs/proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md` |
| owner | `coordination-main-agent` |
| execution_topology | `multi-agent` |
| status | `executed-passed` |
| decision_question | `如何以最小 proof packet 把 cleanup retirement 与 nested owner remap 收成 PF-06 executable evidence，并作为 COL-03 的直接 closure gate` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-E` |
| target_caps | `CAP-22`, `CAP-23`, `CAP-17` |
| related_projections | `PROJ-05`, `PROJ-03` |
| related_collisions | `COL-03` |
| required_prior_proof | `PF-05` |
| coverage_kernel | `collision-before-adoption`, `proof-before-authority`, `minimal-generator-first`, `no-hidden-gap` |
| non_claims | public surface, owner scope, exact read carrier, helper placement, broad control-plane expansion |

## Imported Frozen Law

- `field-only companion` 继续作为当前 owner scope
- `list().companion` 与 `root().companion` 继续关闭
- `replace(nextItems)` 继续按 roster replacement 解释
- active exit 后只允许残留 cleanup receipt
- `PF-05` 已覆盖 row identity continuity、`byRowId` continuity 与 reorder transition stability
- reopen only if a truly roster-owned soft fact witness appears

## Proof Target

### What `PF-06` Must Prove

- cleanup retirement is complete after active exit
- replace cleanup does not preserve old live head
- stale row routing does not recreate live truth
- nested owner remap follows the outer roster after reorder or replace

### What `PF-06` Does Not Need To Reprove

- canonical row identity theorem
- `byRowId` owner route baseline
- reorder continuity already covered by `PF-05`

### Close Predicate Contribution

If `PF-06` becomes executable and passes, `COL-03` may enter final closure check with:

- `PF-05` for row identity and `byRowId`
- `PF-06` for cleanup retirement and nested owner remap

## Witness Matrix

| case | setup | required invariant | failure signature |
| --- | --- | --- | --- |
| `active-exit cleanup` | hide or remove a row with live row-local contribution | `errors / ui / pending / blocking` retire together and only cleanup receipt remains | live row truth still readable or still affects submit / diagnostics |
| `replace cleanup` | replace the full roster after row-local facts were live | old roster retires completely and replacement does not inherit old live head | old row bundle survives or replacement forces roster-owned fact owner |
| `stale residue retirement` | write through an old row route after replacement | stale route fails closed and does not recreate live truth | old row write mutates current roster or recreates stale live head |
| `nested owner remap after outer reorder or replace` | nested child rows exist under a parent row that reorders or gets replaced | nested child owner follows current outer roster and old nested owner path retires | nested child truth leaks to sibling parent or old parent path remains live |

## Evidence Contract

### Required Fields

- `noLiveHead`
- `cleanup receipt`
- `staleRef`
- `nested ownerRef`

### Imported From `PF-05`

- `canonicalRowIdChainDigest`
- `ownerRef`
- `transition`

### Current Coverage

- `cleanup receipt`: covered by cleanup receipt witness
- `staleRef`: covered by state-level stale route fail-closed witness
- `nested ownerRef`: covered by state-level nested owner remap witness
- `noLiveHead`: covered by state-level live-head retirement witness

### Evidence Standard

State-level proof is acceptable for packet execution if it can deterministically show the four required fields or their exact semantic equivalents through existing witness surfaces. If not, only minimal observability surfacing may be added, and it must stay off the public surface.

## Execution Plan

### Reuse First

Reuse these existing witnesses and substrates:

- `packages/logix-form/test/Form/Form.CleanupReceipt.Witness.test.ts`
- `packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts`
- `packages/logix-form/src/internal/form/rowid.ts`
- `packages/logix-form/src/internal/form/arrays.ts`

### Minimal Execution Steps

1. Extend cleanup receipt witness so active exit proves only cleanup receipt remains and no live head survives.
2. Extend replace roster witness so stale row routes fail closed with explicit stale residue expectations.
3. Add or extend one nested remap witness that exercises outer reorder or replace and proves child owner remap follows the current parent roster.
4. Only if existing state surfaces cannot express `noLiveHead / staleRef / nested ownerRef`, add minimal internal observability surfacing through existing evidence or diagnostics substrate.

### Implementation Proof Boundary

This packet allows a focused implementation proof on test and internal evidence surfacing only. It does not authorize new public API, new owner scope, or a second host family.

## Execution Result

### Command

```bash
pnpm vitest run packages/logix-form/test/Form/Form.CleanupReceipt.Witness.test.ts packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts
```

### Result

- `3` test files passed
- `11` tests passed
- cleanup retirement passed through state-level `noLiveHead` and cleanup receipt evidence
- stale route fail-closed passed through replace roster witness
- nested owner remap passed through outer swap and outer replace witness
- companion row scope baseline remained stable under row-heavy pressure

## Escalation And Close Rule

### Close Rule

`PF-06` is considered executable when the focused witness set above runs through a deterministic route and proves:

- cleanup receipt is the only allowed residual
- stale routes cannot recreate live truth
- nested owner remap follows the current outer roster

That condition is now satisfied. `COL-03` may close.

### Escalation Bar

Escalation is allowed only if execution exposes a truly roster-owned soft fact witness that cannot be decomposed into field-local bundles without breaking owner binding, atomicity, diagnostics backlink, or measurable performance.

No ergonomics-only or implementation-friction-only argument can trigger reopen.

## Verdict And Next Action

### Verdict

`closeable-and-executed`

### Decision Summary

- current gap has shrunk from owner-scope debate to a single proof gate
- existing substrate is already strong enough to support focused packet execution
- state-level equivalents proved `noLiveHead`, `cleanup receipt`, `staleRef`, and `nested ownerRef`
- no irreducible roster-owned soft fact witness appeared
- `COL-03` is now ready to close

### Next Action

Close `COL-03`, then advance `PROP-001` on `PF-03 / PF-07` selector admissibility and projection-freeze readiness.

### Residual Risks

- stronger `pending / blocking / reason` proof for `CAP-22 / CAP-23` can still be added later
- selector admissibility remains the next unresolved axis for `PROP-001`
