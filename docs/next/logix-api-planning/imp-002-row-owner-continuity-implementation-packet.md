---
title: IMP-002 Row Owner Continuity Implementation Packet
status: frozen
version: 1
---

# IMP-002 Row Owner Continuity Implementation Packet

## 目标

把 `CONV-001` 中 row owner continuity 切片转成实施包，覆盖 row identity chain、structural edit continuity、`byRowId` owner route、active exit cleanup、nested owner remap 与 host selector gate。

本页只承接实施切片，不冻结 exact surface。row identity owner chain 的 authority 继续由 `13 / runtime/06 / specs/149` 持有，React host selector gate 继续由 `runtime/10` 持有。

## Source

- [implementation-ready-conversion.md](./implementation-ready-conversion.md)
- [proposal-portfolio.md](./proposal-portfolio.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [../../review-plan/runs/2026-04-24-col-03-row-heavy-follow-up.md](../../review-plan/runs/2026-04-24-col-03-row-heavy-follow-up.md)
- [../../review-plan/runs/2026-04-24-col-04-row-owner-selector-decision.md](../../review-plan/runs/2026-04-24-col-04-row-owner-selector-decision.md)
- [../../review-plan/runs/2026-04-24-pf-06-refinement-packet.md](../../review-plan/runs/2026-04-24-pf-06-refinement-packet.md)

## Scope

| field | value |
| --- | --- |
| packet_id | `IMP-002` |
| status | `proof-refreshed` |
| owner_lane | active-shape / host |
| source_caps | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`, `CAP-25` |
| source_projection | `PROJ-05`, `PROJ-06` |
| source_collisions | `COL-03`, `COL-04` |
| proof_gates | `PF-05`, `PF-06`, `PF-07` |
| public_surface_budget | no new public concept |

## Required Implementation Outcomes

| outcome | requirement |
| --- | --- |
| row identity chain | list row identity stays on canonical row id chain |
| structural edits | reorder, swap, move, replace and remove preserve or retire the correct row truth |
| byRowId owner route | write side and read side hit the same canonical row owner after reorder |
| active exit cleanup | removed or replaced row live contribution exits and leaves cleanup receipt evidence |
| nested owner remap | nested row owner refs follow outer row reorder and retire on outer replacement |
| host read gate | row owner projection is consumed through `useSelector(handle, Form.Companion.byRowId(...))` |
| public surface | no synthetic local id family, no second read family, no list/root companion reopening |

## Suggested File Scope

| area | likely files | allowed edits |
| --- | --- | --- |
| Form row identity | `packages/logix-form/src/internal/form/arrays.ts`, `packages/logix-form/src/internal/form/rowid.ts` | only if `PF-05` or `PF-06` regresses |
| Form exact selector primitive | `packages/logix-form/src/Companion.ts`, `packages/logix-form/src/index.ts` | keep existing `Form.Companion.byRowId(listPath, rowId, fieldPath)` primitive aligned with `13` |
| React projection | `packages/logix-react/src/FormProjection.ts`, `packages/logix-react/src/internal/hooks/useSelector.ts` | ensure row-owner selector primitives still enter the canonical host gate |
| Form tests | `packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts`, `packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts`, `packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts` | keep `PF-05 / PF-06` executable |
| React tests | `packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx`, `packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx` | keep `PF-07` executable |
| Example integration | `examples/logix-react/test/form-companion-host-gate.integration.test.tsx` | proves exact `Form.Companion.byRowId` primitive passes through the React host gate |

Do not edit verification retained-harness or fixture internals in this packet unless row owner continuity can no longer be proven by current proof tests.

## Verification Artifact Consumption

| artifact area | decision |
| --- | --- |
| scenario carrier feed helpers | out of scope |
| expectation evaluator | out of scope |
| fixture adapter | out of scope |
| compare perf admissibility helper | out of scope |

## Proof Freshness Rule

Refresh `IMP-002` whenever any of these areas change:

- row identity store or `trackBy` semantics
- `fieldArray` structural edit semantics
- cleanup receipt semantics
- nested list owner remap
- `Form.Companion.byRowId` selector primitive
- React `useSelector` descriptor normalization

## Verification Plan

Run the row owner and cleanup proof samples:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts
```

Run the host selector gates:

```bash
pnpm vitest run packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx examples/logix-react/test/form-companion-host-gate.integration.test.tsx
```

Then run the package checks affected by Form / React surface:

```bash
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-react typecheck
pnpm -C examples/logix-react typecheck
```

If the implementation touches shared package exports, also run:

```bash
pnpm typecheck
```

## Verification Result

Last refreshed in this packet:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx examples/logix-react/test/form-companion-host-gate.integration.test.tsx
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-react typecheck
pnpm -C examples/logix-react typecheck
```

Result:

- `21` targeted tests passed
- `packages/logix-form` typecheck passed
- `packages/logix-react` typecheck passed
- `examples/logix-react` typecheck passed

## Implementation Decision

`IMP-002` does not need additional production code in this wave.

The existing implementation already provides:

- row identity continuity across reorder, swap, move and replace
- store-mode row id retirement on replacement
- `fieldArray(...).byRowId(rowId)` write-side owner routing
- cleanup receipt emission and live head retirement on remove / replace
- nested list owner remap through outer reorder and retirement through outer replacement
- `Form.Companion.byRowId(listPath, rowId, fieldPath)` read-side owner routing through the canonical React host gate

## Reopen Bar

Reopen API planning only if implementation proves one of these:

- row identity needs a public synthetic local id family
- structural edits create a second row truth separate from the canonical owner chain
- active exit cleanup cannot be expressed through current cleanup receipt and reason slot identity
- nested row remap cannot preserve owner binding without a list/root companion lane
- `byRowId` cannot be consumed through `useSelector(handle, selector)` without a second host read family

## Non-claims

- no new row public id family
- no second host read family
- no list/root companion baseline
- no verification carrier promotion
- no root compare productization

## 当前一句话结论

`IMP-002` 当前 proof 已刷新；本轮无需新增生产代码。后续只在 row identity、cleanup、nested owner remap 或 host selector gate regression 出现时重开。
