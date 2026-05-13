# PF-04 Rule-submit Backlink Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `proof-refinement-packet` |
| proof_id | `PF-04` |
| linked_projection | `PROJ-04` |
| linked_proposal | `docs/proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `executed-partial` |
| decision_question | `现有 final-truth state witness 是否足以把 PF-04 从 planned 推到 executable，并把 SC-D residual 收窄到 CAP-15 exact backlink` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17` |
| related_projections | `PROJ-04` |
| related_collisions | `none` |
| required_prior_proof | `PF-03`, `PF-07`, `PF-08 current floor` |
| coverage_kernel | `final-truth-explainability`, `single-truth`, `selector-gate-first`, `proof-before-authority` |
| non_claims | exact `reasonSlotId -> bundlePatchRef` feed, public scenario carrier, new diagnostics object, new companion lane |

## Imported Frozen Law

- final truth stays on `rule / submit`, not on companion
- host read side stays on the canonical selector gate
- submit summary and compare feed stay on the same submit authority
- startup report shell stays on one evidence envelope
- no second diagnostics truth, no second submit truth, no second read family

## What This Packet Proves

### Proven Now

- field, list.item, list, and root effectful rules all lower into the same submit blocking truth
- cross-row list uniqueness already lands on row-scoped errors with stable `$rowId`
- row-scoped field error can be projected as stable `subjectRef.kind="row"` under the canonical host gate
- submit summary and compare feed remain aligned on one `submitAttempt` authority
- `PF-04` now has a deterministic executable witness bundle

### Still Not Proven

- `reasonSlotId -> bundlePatchRef` exact backlink feed
- rule outcome to current live bundle head in scenario carrier form
- compare-ready `W5` carrier for `SC-D / SC-F`

## Witness Matrix

| witness | capability contribution | accepted evidence |
| --- | --- | --- |
| `Form.ListScopeUniqueWarehouse.test.ts` | `CAP-14` | cross-row duplicate errors land on `errors.items.rows[]` and keep stable `$rowId` |
| `Form.EffectfulRule.Submit.test.ts` | `CAP-16` | field-level async rule lowers into `submitAttempt.blockingBasis="error"` |
| `Form.EffectfulListItemRule.Submit.test.ts` | `CAP-14`, `CAP-16` | row-scoped async rule lowers into row error and submit blocking truth |
| `Form.EffectfulListRule.Submit.test.ts` | `CAP-14`, `CAP-16` | list-level async rule lowers into `$list` error and submit blocking truth |
| `Form.EffectfulRootRule.Submit.test.ts` | `CAP-16` | root-level async rule lowers into root error and submit blocking truth |
| `Form.ListCardinalityBasis.test.ts` | `CAP-14` | list cardinality basis still routes into the same submit truth |
| `Form.ReasonContract.Witness.test.ts` | `CAP-15`, `CAP-17` floor | submit summary and compare feed stay on one submit authority |
| `useSelector.formErrorDescriptor.test.tsx` | `CAP-14`, `CAP-17` floor | row-scoped final error projects stable `subjectRef.kind="row"` through the canonical host gate |

## Verification Used

```bash
pnpm vitest run packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts packages/logix-form/test/Form/Form.EffectfulRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListItemRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulRootRule.Submit.test.ts packages/logix-form/test/Form/Form.ListCardinalityBasis.test.ts packages/logix-form/test/Form/Form.ReasonContract.Witness.test.ts packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx
```

## Result

- `8` test files passed
- `12` tests passed
- no new surface or helper was added

## Status Delta

| id | from | to | basis |
| --- | --- | --- | --- |
| `CAP-14` | `partial` | `proven` | cross-row uniqueness, list cardinality, row-scoped final error, and submit blocking truth now form one executed bundle |
| `CAP-16` | `partial` | `proven` | field / list.item / list / root async rules all lower into the same submit lane |
| `PF-04` | `planned` | `executable` | witness bundle is now deterministic and already running green |

## Residual

- `CAP-15` stays `partial`
- current proof floor shows `submitAttempt` authority is stable, but it still stops at state truth
- exact backlink from rule outcome to current live evidence head remains tied to `CAP-18 / VOB-01`
- `SC-D` therefore stays `partially-covered`

## Verdict And Next Action

### Verdict

`executable-with-residual`

### Decision Summary

- `PF-04` no longer blocks planning closure as a missing proof gate
- `SC-D` residual has narrowed from broad final-truth uncertainty to one exact backlink gap
- the remaining open item is no longer rule-lane sufficiency
- the remaining open item is `CAP-15` exact backlink plus future `VOB-01` carrier work

### Next Action

Keep `SC-D` active, but narrow the cursor to `CAP-15 exact backlink beyond state truth`, and decide whether it should stay on `PF-04` or move under `VOB-01` scenario carrier work.
