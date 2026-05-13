---
title: RISK-04 Row Identity Active Exit Pressure Packet
status: proof-refreshed
version: 2
---

# RISK-04 Row Identity Active Exit Pressure Packet

## 目标

把 `RISK-04` 拆成 row identity、structural edit continuity、`byRowId` owner route、active exit cleanup 与 nested owner remap，验证 current frozen API shape 能否继续支撑 row-heavy 场景。

本页不承担 authority，不冻结 exact surface，不新增 public row API。

## Source

- [frozen-api-shape-risk-lanes.md](./frozen-api-shape-risk-lanes.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [imp-002-row-owner-continuity-implementation-packet.md](./imp-002-row-owner-continuity-implementation-packet.md)

## Scope

| field | value |
| --- | --- |
| risk_id | `RISK-04` |
| packet_id | `RISK-04-row-identity-active-exit-pressure-packet` |
| packet_kind | `implementation + proof-refresh` |
| active_phase | `risk-lane` |
| target_scenarios | `SC-E`, supporting `SC-F` selector pressure |
| target_caps | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23` |
| target_projection | `PROJ-05`, supporting `PROJ-06` |
| target_enablers | `IE-05`, supporting `IE-06` |
| target_proofs | `PF-05`, `PF-06`, supporting `PF-07` |
| related_collisions | `COL-03`, `COL-04` closed |
| public_surface_budget | no new public concept |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-E`, `SC-F` selector pressure |
| target_caps | `CAP-19..CAP-23` |
| related_projections | `PROJ-05`, `PROJ-06` |
| related_collisions | `COL-03`, `COL-04` |
| required_proofs | `PF-05`, `PF-06`, `PF-07` |
| coverage_kernel | `fieldArray(path).*` owns structural edits; `fieldArray(path).byRowId(rowId).*` owns identity write route; `Form.Companion.byRowId` owns sanctioned read primitive |
| decision_policy | preserve one row owner chain, no public synthetic local id, no second read family |
| non_claims | public row id family, list/root companion baseline, second row truth, host wrapper family |
| generator_hypothesis | existing fieldArray operations plus `byRowId` write/read primitives cover row-heavy continuity without new API |

## Current Evidence Inventory

| evidence | current state | implication |
| --- | --- | --- |
| byRowId after reorder | row identity proof sample updates the same business row after swap | `CAP-19`, `CAP-21` remain covered |
| byRowId after move | row identity proof sample updates the same business row after move | structural edit continuity stays on one owner chain |
| store-mode row id | store mode routes by rowIdStore and retires stale row ids on replace | no public synthetic id family needed |
| replace roster | replacement rows project new row ids and retire previous roster | replace is roster replacement |
| active exit cleanup | remove / replace writes cleanup receipt and clears live row heads | `CAP-22` remains covered |
| nested remap | nested row identities follow outer reorder and retire on outer replacement | `CAP-23` remains covered |
| host selector read | `Form.Companion.byRowId` reads row-owner companion through `useSelector` after reorder | no second host read family |

## Gap Analysis

| gap id | gap | why it matters | expected closure |
| --- | --- | --- | --- |
| `R04-G1` | row identity coverage is broad but spread across several proof files | risk lane needs one recovery packet | index the existing proof set and validation command |
| `R04-G2` | old row ids after replacement are dangerous stale write targets | could imply second row truth or compatibility shim | existing store-mode replace proof rejects stale old row update |
| `R04-G3` | cleanup receipt can be mistaken as second row truth | cleanup should be terminal evidence only | negative assertion and close predicate |
| `R04-G4` | row-owner read could tempt a new hook family | host gate already consumes selector primitive | keep `COL-04` closed |

## Decision

Current frozen API shape survives `RISK-04` analysis.

The row-heavy lane is already covered by existing proof. No production code change or public surface change is required in this wave.

After `R04-S1`, this packet closes `RISK-04` for the current matrix scope.

## Proof Refresh Result

| step id | result | evidence |
| --- | --- | --- |
| `R04-S1` | `passed` | row identity, cleanup, companion row scope, React companion selector, React error selector, and example host gate proofs all passed |

Changed files:

- no production or test file changed by `RISK-04`

## Negative Assertions

- Index and React key cannot become row truth.
- Cleanup receipt is terminal evidence, not a second live row owner.
- Store-mode replacement retires previous row ids and must not route later writes to old rows.
- Nested owner remap cannot require a separate nested row API.
- `Form.Companion.byRowId` remains a selector primitive behind `useSelector`, not a second read family.
- Row identity proof cannot reopen list/root companion baseline unless field-local owner binding fails.

## Close Predicate

`RISK-04` is closed for current matrix scope because all are true:

- reorder, swap, move, replace, and remove preserve or retire the correct row truth.
- `fieldArray(path).byRowId(rowId)` writes to the current canonical row owner.
- stale row ids after roster replacement do not route writes to new rows.
- active exit cleanup clears live row contributions and leaves cleanup receipt evidence.
- nested row owner refs follow outer reorder and retire on outer replacement.
- row-owner companion read continues through the canonical host selector gate.

## Reopen Bar

Open a new collision or authority writeback only if implementation proves one of these:

- row identity needs a public synthetic local id family.
- structural edits create a second row truth outside the canonical owner chain.
- cleanup cannot be represented by current cleanup receipt and reason slot identity.
- nested owner remap requires a new public nested row API.
- `byRowId` cannot be consumed through `useSelector(handle, selector)`.
- field-local companion owner binding fails under row-heavy pressure.

## Validation Plan

Minimum targeted gates:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx examples/logix-react/test/form-companion-host-gate.integration.test.tsx
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-react typecheck
pnpm -C examples/logix-react typecheck
```

## Validation Result

Ran:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx examples/logix-react/test/form-companion-host-gate.integration.test.tsx
```

Result:

- targeted RISK-04 gate: `6` files passed, `21` tests passed
- `packages/logix-form` typecheck passed
- `packages/logix-react` typecheck passed
- `examples/logix-react` typecheck passed

## Output Decision

This packet is consumed by [risk-lane-closure-check.md](./risk-lane-closure-check.md).

Reason:

- `RISK-04` current matrix surface risk is closed by proof refresh.
- `RISK-06` has since been closed by its own packet.
- `TASK-003` remains deferred.

## 当前一句话结论

`RISK-04` 当前不要求重开 frozen API shape；row-heavy 场景继续由 fieldArray structural edits、`byRowId` write/read route、cleanup receipt 与 nested owner remap 共同覆盖。
