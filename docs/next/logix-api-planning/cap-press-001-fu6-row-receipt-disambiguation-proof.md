---
title: CAP-PRESS-001-FU6 Row Receipt Disambiguation Proof
status: closed-implementation-proof
version: 1
---

# CAP-PRESS-001-FU6 Row Receipt Disambiguation Proof

## 目标

证明 row-scoped source receipt 在 reorder/remove 与 in-flight settle 交错时不会跨行写回，不需要新增 public source helper、public row receipt API 或第二 owner primitive。

本页只记录 pressure follow-up 结论，不冻结 exact public surface。exact source surface 继续看 [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)。

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `CAP-PRESS-001-FU6` |
| target_scenarios | `SC-B`, `SC-C`, supporting `SC-E` row identity pressure and `SC-F` evidence pressure |
| target_atoms | `CAP-06`, `CAP-07`, `CAP-09`, `CAP-18`, `CAP-19`, `CAP-20`, `CAP-21` |
| related_projection | `PROJ-02`, `PROJ-05`, partial `PROJ-07` |
| related_enablers | `IE-02`, `IE-05` |
| required_proof | `PF-02`, `PF-05`, `PF-08` |
| decision_policy | keep row source identity internal; reopen public API only if in-flight source writeback cannot stay rowId-gated |
| non_claims | no `Form.Source`, no `useFieldSource`, no public row receipt API, no row source helper family, no second row owner primitive |

## Pressure Question

`S6-row-source-disambiguation` asked whether two rows sharing the same source field pattern and resource can cross source receipts when one row reorders or is removed while source loading is still in flight.

## Implementation Delta

| file | change |
| --- | --- |
| `packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts` | added FU6 proof checks for in-flight row source writeback after reorder and after row removal |

No production code change was needed.

## Decision

`CAP-PRESS-001-FU6` closes without new public API.

Accepted:

- row-scoped source writeback is gated by internal row id, not current index.
- reorder while source is in flight preserves row ownership; settled data writes to the same business row after the row moves.
- removal while source is in flight drops the removed row's writeback; settled data does not cross into the remaining row.
- current `field(path).source(...)` shape remains sufficient for row-scoped source receipt disambiguation.
- `ownerRef + canonicalRowIdChainDigest` remains internal/evidence coordinate; no public row source receipt noun is admitted.

Rejected:

- adding public row source receipt identity
- adding `Form.Source`
- adding `useFieldSource`
- adding a row-scoped source helper family
- exposing row source owner internals in authoring
- using current row index as receipt identity

## Proof

| proof | result |
| --- | --- |
| reorder with in-flight source | two rows start source loading, rows swap before settle, each settled source result lands on the original row id |
| remove with in-flight source | removed row settles after removal, but its source result is dropped and does not overwrite the remaining row |
| public surface | both proofs use existing `form.list(... identity: trackBy ...)` plus `form.field("items.profileResource").source(...)` |

## Validation

Ran:

```bash
pnpm exec vitest run packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Result:

- targeted FU6 gate: `1` file, `3` tests passed

## Does Not Prove

- complete `IE-02` coverage for every remote source variant
- root compare productization beyond the frozen control-plane stage

## Follow-up Routing

| follow-up | status | route |
| --- | --- | --- |
| key canonicalization and same-key generation | `closed-implementation-proof` | `TASK-007` |
| root compare productization | `deferred` | `TASK-003`, explicit authority intake only |

## 当前一句话结论

FU6 proves row-scoped source receipt disambiguation can stay internal and rowId-gated. TASK-007 has since closed key canonicalization and same-key generation safety. Public source API stays unchanged.
