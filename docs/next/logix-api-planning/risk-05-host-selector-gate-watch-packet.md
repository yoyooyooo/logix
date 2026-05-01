---
title: RISK-05 Host Selector Gate Watch Packet
status: proof-refreshed
version: 2
---

# RISK-05 Host Selector Gate Watch Packet

## 目标

把 `RISK-05` 拆成 React host acquisition、dispatch、selector gate、selector helper adjunct 与 wrapper residue watch，确认当前 host surface 不需要新 wrapper family 或第二 host truth。

本页不承担 authority，不冻结 exact surface，不新增 host API。

## Source

- [frozen-api-shape-risk-lanes.md](./frozen-api-shape-risk-lanes.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)

## Scope

| field | value |
| --- | --- |
| risk_id | `RISK-05` |
| packet_id | `RISK-05-host-selector-gate-watch-packet` |
| packet_kind | `watch-only + proof-refresh` |
| active_phase | `risk-lane` |
| target_scenarios | `SC-A`, `SC-F` |
| target_caps | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26` |
| target_projection | `PROJ-06` |
| target_enablers | `IE-06` |
| target_proofs | `PF-07` |
| related_collisions | `COL-04`, `COL-05` closed |
| public_surface_budget | no new public concept |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-A`, `SC-F` |
| target_caps | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26` |
| related_projections | `PROJ-06` |
| related_collisions | `COL-04`, `COL-05` |
| required_proofs | `PF-07` |
| coverage_kernel | `useModule`, `useImportedModule`, `useDispatch`, `useSelector`, `fieldValue`, `rawFormMeta`, `Form.Error.*`, `Form.Companion.*` |
| decision_policy | keep one host law, helper adjunct only, no domain hook family |
| non_claims | `@logixjs/form/react`, package-local `useForm*`, wrapper/factory family, helper-side precedence |
| generator_hypothesis | existing host law covers acquisition and read projection while selector primitives cover Form-specific reads |

## Current Evidence Inventory

| evidence | current state | implication |
| --- | --- | --- |
| public reachability | wildcard and `ModuleScope` exports are absent; `useModuleList` absent | no old public wrapper route |
| keep surface | `useModule(Program)`, `useModule(ModuleTag)`, `useImportedModule`, and raw runtime selector route stay stable | host acquisition law remains single |
| legacy input guard | old module-object and impl input routes throw | stale routes do not revive canonical host truth |
| blueprint identity | `useModule(Program)` keeps blueprint identity separate from module id | local instance law remains explicit |
| dispatch | `useDispatch` stays stable and does not own acquisition | dispatch is adjunct only |
| selector | `useSelector(handle)` and `useSelector(handle, selector)` remain canonical read gate | no second read family |
| read helpers | `fieldValue` and `rawFormMeta` work only through `useSelector` | helper adjunct does not become route |
| Form primitives | `Form.Error.*` and `Form.Companion.*` pass through `useSelector` | domain primitives remain data-support |

## Gap Analysis

| gap id | gap | why it matters | expected closure |
| --- | --- | --- | --- |
| `R05-G1` | host lane was marked watch rather than active proof | final risk sweep needs current proof freshness | run targeted PF-07 host gate |
| `R05-G2` | repo-local wrappers may exist in demos or old tests | residue can become accidental teaching truth | keep negative assertion and public reachability guard |
| `R05-G3` | `fieldValue / rawFormMeta` can be over-taught | helper adjunct may become second read law | record helper adjunct boundary |
| `R05-G4` | domain selector primitives can be misread as host helpers | ownership must stay Form-owned | keep `Form.Error / Form.Companion` owner split |

## Decision

Current frozen API shape survives `RISK-05` analysis.

Host gate remains a watch lane. No production code, public surface, or authority writeback is required in this wave.

After `R05-S1`, this packet closes `RISK-05` for the current matrix scope.

## Proof Refresh Result

| step id | result | evidence |
| --- | --- | --- |
| `R05-S1` | `passed` | public reachability, acquisition, imported-child, dispatch, selector, read helper, Form error selector, and Form companion selector gates passed |

Changed files:

- no production or test file changed by `RISK-05`

## Negative Assertions

- `@logixjs/form/react` remains rejected.
- package-local `useForm*` and list wrappers remain residue.
- `fieldValue` and `rawFormMeta` are core-owned helper adjuncts only.
- `Form.Error.field` and `Form.Companion.*` are Form-owned selector primitives, not React-owned helpers.
- `useImportedModule` is a hook form of `parent.imports.get`, not an independent root lookup family.
- wrapper or factory family cannot become canonical route without separate toolkit intake.

## Close Predicate

`RISK-05` is closed for current matrix scope because all are true:

- acquisition stays on `useModule(ModuleTag)`, `useModule(Program, options?)`, and `useImportedModule(parent, ModuleTag)`.
- read projection stays on `useSelector`.
- dispatch stays adjunct and does not alter acquisition or read law.
- selector helpers are consumed only through `useSelector`.
- public reachability does not expose legacy wrapper routes.
- Form-specific selector primitives remain domain-owned.

## Reopen Bar

Open a new collision or authority writeback only if implementation proves one of these:

- canonical host law cannot cover domain selector primitive consumption.
- wrapper family deletes an existing boundary without adding second host truth.
- `fieldValue / rawFormMeta` must become an independent read family.
- Form-owned selector primitive must move into React-owned host helper.
- public reachability exposes a new wrapper route under the canonical package surface.

## Validation Plan

Minimum targeted gates:

```bash
pnpm vitest run packages/logix-react/test/PublicSurface/publicReachability.test.ts packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx packages/logix-react/test/Hooks/useModule.legacy-inputs.test.tsx packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx packages/logix-react/test/Hooks/useImportedModule.test.tsx packages/logix-react/test/Hooks/useDispatch.test.tsx packages/logix-react/test/Hooks/useSelector.test.tsx packages/logix-react/test/Hooks/useSelector.readQueryInput.test.tsx packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx
pnpm -C packages/logix-react typecheck
```

## Validation Result

Ran:

```bash
pnpm vitest run packages/logix-react/test/PublicSurface/publicReachability.test.ts packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx packages/logix-react/test/Hooks/useModule.legacy-inputs.test.tsx packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx packages/logix-react/test/Hooks/useImportedModule.test.tsx packages/logix-react/test/Hooks/useDispatch.test.tsx packages/logix-react/test/Hooks/useSelector.test.tsx packages/logix-react/test/Hooks/useSelector.readQueryInput.test.tsx packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx
```

Result:

- targeted RISK-05 gate: `10` files passed, `23` tests passed
- `packages/logix-react` typecheck passed

## Output Decision

This packet is consumed by [risk-lane-closure-check.md](./risk-lane-closure-check.md).

Reason:

- `RISK-05` current matrix surface risk is closed by proof refresh.
- `RISK-01..RISK-06` all have closure records.
- `TASK-003` remains deferred.

## 当前一句话结论

`RISK-05` 当前不要求重开 frozen API shape；React host law 继续由 canonical acquisition、dispatch 和 selector gate 组成，Form selector primitives 继续只作为 domain-owned data-support 被消费。
