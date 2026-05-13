---
title: RISK-01 Companion Soft Fact Boundary Pressure Packet
status: proof-refreshed
version: 2
---

# RISK-01 Companion Soft Fact Boundary Pressure Packet

## 目标

把 `RISK-01` 拆成 companion soft fact、sanctioned selector route、row-owner read 与 negative final-truth proof，验证 companion 作为最小生成元时不会扩张成第二 truth、render policy、remote IO 或 list/root companion baseline。

本页不承担 authority，不冻结 exact surface，不新增 public companion API。

## Source

- [frozen-api-shape-risk-lanes.md](./frozen-api-shape-risk-lanes.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [imp-001-companion-host-implementation-packet.md](./imp-001-companion-host-implementation-packet.md)
- [../../proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md](../../proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md)

## Scope

| field | value |
| --- | --- |
| risk_id | `RISK-01` |
| packet_id | `RISK-01-companion-soft-fact-boundary-pressure-packet` |
| packet_kind | `semantic + proof-refresh` |
| active_phase | `risk-lane` |
| target_scenarios | `SC-C`, pressure from `SC-D`, `SC-E`, `SC-F` |
| target_caps | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` |
| pressure_caps | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23` |
| target_projection | `PROJ-03`, supporting `PROJ-05`, `PROJ-06` |
| target_enablers | `IE-03`, `IE-06` |
| target_proofs | `PF-03`, `PF-05`, `PF-06`, `PF-07` |
| related_collisions | `COL-01`, `COL-02`, `COL-03`, `COL-04`, `COL-08` closed |
| public_surface_budget | no new public concept |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, pressure from `SC-D / SC-E / SC-F` |
| target_caps | `CAP-10..CAP-13`, pressure `CAP-19..CAP-23` |
| related_projections | `PROJ-03`, `PROJ-05`, `PROJ-06` |
| related_collisions | `COL-01`, `COL-02`, `COL-03`, `COL-04`, `COL-08` |
| required_proofs | `PF-03`, `PF-05`, `PF-06`, `PF-07` |
| coverage_kernel | `field(path).companion({ deps, lower })` emits only `availability / candidates`; `Form.Companion.*` reads through the single host selector gate |
| decision_policy | preserve minimal generator, no final truth owner, no host read family, no list/root baseline |
| non_claims | render policy, remote IO, final validity, public read carrier noun, exact internal landing path |
| generator_hypothesis | one field-local soft fact lane covers local derivation, availability, candidates, and sanctioned read without adding per-capability APIs |

## Current Evidence Inventory

| evidence | current state | implication |
| --- | --- | --- |
| authoring route | `Form.Companion.Authoring` proves `field(path).companion({ deps, lower })` and source-backed lowering | `CAP-10..CAP-12` have executable proof |
| startup cleanliness | source-less companion materializes without marking form dirty | companion writeback stays auxiliary |
| selector primitive | `Form.Companion.field` and `Form.Companion.byRowId` are opaque and non-executable | public read primitive does not leak raw landing path |
| host gate | React `useSelector` consumes companion descriptors through the canonical host gate | `CAP-13 / PF-07` remain covered |
| row-owner read | by-row selector keeps row companion after reorder | `CAP-21` pressure does not require a second read family |
| nested row write | nested companion writes to concrete nested row path | row-heavy pressure does not require list/root companion baseline |
| trial artifact | startup report exports form evidence contract artifact | verification can see companion contract without second evidence envelope |

## Gap Analysis

| gap id | gap | why it matters | expected closure |
| --- | --- | --- | --- |
| `R01-G1` | companion hidden / empty candidates had no explicit negative submit proof | soft facts could be mistaken as final validity | add proof that companion does not block submit or write canonical error |
| `R01-G2` | row replace / cleanup pressure is already covered elsewhere, but not repeated in companion packet | repeated test expansion would bloat this packet | link existing PF-05 / PF-06 and keep reopen bar |
| `R01-G3` | render policy remains tempting because availability looks UI-shaped | render policy must stay outside companion truth | record negative assertion |
| `R01-G4` | remote option search can be misread as candidates responsibility | remote IO must stay with source / Query owner | record negative assertion |

## Decision

Current frozen API shape survives `RISK-01` analysis.

Companion remains a minimal generator for local soft facts. It does not need `Form.Source`, a companion hook family, a list/root companion baseline, or a final-truth role.

After `R01-S1`, this packet closes `RISK-01` for the current matrix scope.

## Proof Refresh Result

| step id | result | evidence |
| --- | --- | --- |
| `R01-S1` | `passed` | companion with `availability.kind="hidden"` and empty candidates still lets submit pass, writes no canonical error, and keeps `$form.submitAttempt.blockingBasis="none"` |

Changed files:

- `packages/logix-form/test/Form/Form.Companion.Authoring.test.ts`

No public API file changed.

## Negative Assertions

- `availability` does not own final validity, submit blocking, or error precedence.
- `candidates` does not own remote search, remote IO, or option resource identity.
- companion `lower` remains synchronous and cannot write back.
- `Form.Companion.field(path)` and `Form.Companion.byRowId(listPath, rowId, fieldPath)` remain selector primitives, not host hooks or raw projection helpers.
- row-heavy companion pressure continues through field-local owner binding and sanctioned row-owner selector, not list/root companion baseline.
- companion artifact export remains verification material and cannot become a second evidence envelope.

## Close Predicate

`RISK-01` is closed for current matrix scope because all are true:

- field-local companion covers `CAP-10..CAP-13`.
- hidden availability and empty candidates do not affect submit final truth.
- companion selector primitives are opaque and non-executable.
- React host consumption stays behind `useSelector`.
- row-owner companion read survives reorder through `Form.Companion.byRowId`.
- existing row-heavy proofs keep list/root companion baseline rejected.
- source, final rule, submit, and verification lanes remain separate owners.

## Reopen Bar

Open a new collision or authority writeback only if implementation proves one of these:

- field-local companion cannot cover `SC-C / SC-D / SC-E` sanctioned read needs.
- final rule must directly read companion internal landing path.
- row-heavy proof requires list/root-level soft fact ownership.
- companion needs remote IO or async search ownership.
- `availability / candidates` cannot share one bundle without a new public concept.
- selector route must expose raw internal path or leave the canonical host gate.

## Validation Plan

Minimum targeted gates:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.Companion.Authoring.test.ts packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts packages/logix-form/test/Form/Form.Companion.Scenario.trial.test.ts packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx examples/logix-react/test/form-companion-host-gate.integration.test.tsx
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-react typecheck
pnpm -C examples/logix-react typecheck
```

## Validation Result

Ran:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.Companion.Authoring.test.ts packages/logix-form/test/Form/Form.Companion.RowScope.Authoring.test.ts packages/logix-form/test/Form/Form.Companion.Scenario.trial.test.ts packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx examples/logix-react/test/form-companion-host-gate.integration.test.tsx
```

Result:

- targeted RISK-01 gate: `6` files passed, `15` tests passed
- `packages/logix-form` typecheck passed
- `packages/logix-react` typecheck passed
- `examples/logix-react` typecheck passed

## Output Decision

This packet is consumed by [risk-lane-closure-check.md](./risk-lane-closure-check.md).

Reason:

- `RISK-01` current matrix surface risk is closed by proof refresh.
- `RISK-04` has since been closed by its own packet.
- `TASK-003` remains deferred.

## 当前一句话结论

`RISK-01` 当前不要求重开 frozen API shape；companion 继续是 field-local soft fact 最小生成元，公开读侧继续只走 `Form.Companion.*` selector primitive 和 core host gate。
