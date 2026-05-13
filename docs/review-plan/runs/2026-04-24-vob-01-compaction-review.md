# VOB-01 Compaction Review

## Meta

| field | value |
| --- | --- |
| artifact_kind | `compaction-review` |
| obligation_id | `VOB-01` |
| related_surface_candidate | `SURF-002` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `closed` |
| decision_question | `当前 VOB-01 proof ladder 是否足以升格 bundlePatchRef 为 reusable runtime-owned constructor law` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-15`, `CAP-18` |
| related_projections | `PROJ-04`, `PROJ-07` |
| related_collisions | `none open` |
| required_proofs | `PF-08` |
| coverage_kernel | `single truth`, `single authority`, `evidence boundary`, `fixture-local-until-promoted` |
| non_claims | public API, exact surface, compare truth, second report truth, Form authoring helper |
| generator_hypothesis | scenario carrier can continue as internal verification substrate while bundlePatchRef constructor law stays unpromoted |

## Ladder Summary

| step | ledger | result | remaining gap |
| --- | --- | --- | --- |
| minimal packet | `2026-04-24-vob-01-scenario-carrier-minimal-packet.md` | defined required reason-link row fields | no executable producer |
| feed contract | `2026-04-24-vob-01-reason-link-feed-contract.md` | internal `ScenarioCarrierEvidenceFeed` event can export JSON evidence | no producer path |
| producer helper | `2026-04-24-vob-01-runtime-owned-producer-helper-contract.md` | proof-kernel context can emit one reason-link feed | caller still supplies synthetic coordinates |
| real extraction plan | `2026-04-24-vob-01-real-w5-extraction-plan.md` | narrowed extraction strategy and reusable facts | `bundlePatchRef` missing |
| row-scoped narrowing | `2026-04-24-vob-01-row-scoped-reason-link-narrowing.md` | ownerRef and row-chain digest derived from row scope | reasonSlotId and bundlePatchRef still supplied |
| Form-state narrowing | `2026-04-24-vob-01-form-state-reason-link-narrowing.md` | reasonSlotId derived from Form-shaped state | bundlePatchRef still supplied |
| blocker decision | `2026-04-24-vob-01-bundle-patch-ref-blocker.md` | repo has no reusable runtime-owned bundlePatchRef constructor | constructor law still missing |
| Form-artifact extraction | `2026-04-24-vob-01-form-artifact-bundle-patch-ref-extraction.md` | no synthetic caller field remains at fixture scope | id basis remains Form artifact seed |

## Decision

Decision: `keep-fixture-local`.

The current ladder is enough to prove:

- `ScenarioCarrierEvidenceFeed` can carry one `reason-link` evidence row
- producer emission can stay inside runtime verification internals
- `reasonSlotId`, row-scoped `ownerRef`, and row-chain digest no longer require synthetic caller fields in the current fixture path
- `bundlePatchRef` can be derived from Form evidence-contract artifact seed at fixture scope

The current ladder is not enough to prove:

- reusable runtime-owned `bundlePatchRef` constructor law
- stable opaque-id contract for `bundlePatchRef`
- `Runtime.trial(mode="scenario")` production route
- compare admission
- total `CAP-15` exact closure

## Promotion Review

| promotion target | verdict | reason |
| --- | --- | --- |
| `promote-to-principle` | `rejected-for-now` | only one ladder exposes this pressure; no repeated cross-proposal collision yet |
| `promote-to-authority-request` | `rejected-for-now` | authority request would need a stable constructor law, and current id basis is still Form artifact seed |
| `convert-to-implementation-task` | `not-ready` | implementation task would still have to invent constructor semantics |
| `discard` | `rejected` | proof evidence is useful and test-backed |
| `keep-fixture-local` | `accepted` | current evidence is honest, bounded, and sufficient for the next narrower packet |

## Status Delta

| item | before | after |
| --- | --- | --- |
| `SURF-002` | `under-review` | `under-review` |
| `VOB-01` | `conditional` | `conditional` |
| `PF-08` | `executable` | `executable` |
| `CAP-15` | `partial` | `partial` |
| `CAP-18` | `partial` | `partial` |

## Global Closure Impact

Global API Shape Closure Gate remains open.

Blocking items:

- `SURF-002` remains under-review
- `VOB-01` remains conditional
- `CAP-15` exact backlink remains partial
- reusable `bundlePatchRef` constructor law is not proven

## Next Work Item

Open a narrower proof packet:

`VOB-01 bundlePatchRef constructor-law packet`

Scope:

- define the smallest runtime-owned constructor contract for `bundlePatchRef`
- keep it inside verification / evidence internals
- decide whether Form artifact seed is allowed input to the constructor
- prove non-empty `reasonSlotId` and deterministic `bundlePatchRef` output
- keep compare truth and public authoring surface out of scope

## Validation

This review is document-only. It reuses the verification recorded by the proof ledgers and does not add runtime code.
