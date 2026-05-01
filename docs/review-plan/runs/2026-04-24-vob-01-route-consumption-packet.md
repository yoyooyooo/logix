# VOB-01 Route Consumption Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `proof-review` |
| obligation_id | `VOB-01` |
| related_surface_candidate | `SURF-002` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `closed-partial` |
| decision_question | `当前 Form-artifact reason-link route 是否已经消费 bundlePatchRef constructor contract` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-15`, `CAP-18` |
| related_projections | `PROJ-07` |
| related_collisions | `none open` |
| required_proofs | `PF-08` |
| coverage_kernel | `evidence boundary`, `single authority`, `fixture-local-until-promoted` |
| non_claims | public `Runtime.trial(mode="scenario")`, compare truth, report summary exactness, authoring surface |
| generator_hypothesis | the existing Form-artifact reason-link helper is a route-level consumer of the constructor, but still only at fixture scope |

## Evidence Reviewed

| evidence | result |
| --- | --- |
| `makeScenarioBundlePatchRef` | internal constructor exists and is deterministic |
| `emitScenarioFormArtifactReasonLinkFixture` | calls `makeScenarioBundlePatchRef({ bundlePatchPath })` |
| `VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts` | verifies emitted `bundlePatchRef` through proof-kernel evidence package |
| `ScenarioBundlePatchRef.contract.test.ts` | verifies deterministic output, seed distinction, domain prefix, and empty-seed failure |

## Decision

Decision: `route-consumption-proven-at-fixture-scope`.

This proves:

- the Form-artifact reason-link fixture route consumes the constructor
- the constructor output reaches `ScenarioCarrierEvidenceFeed`
- the path remains inside runtime verification internals
- no public authoring surface or compare truth was introduced

This does not prove:

- canonical `Runtime.trial(mode="scenario")` route
- compiled scenario plan consumption
- scenario fixture execution from `fixtures/env + steps + expect`
- compare-ready normalized summary
- final `CAP-15` closure

## Status Delta

| item | before | after |
| --- | --- | --- |
| `SURF-002` | `under-review` | `under-review` |
| `VOB-01` | `conditional` | `conditional` |
| `CAP-15` | `partial` | `partial` |
| `CAP-18` | `partial` | `partial` |
| route consumption | `missing` | `fixture-scope proven` |

## Closure Review

`SURF-002` cannot close yet.

Remaining blocker:

- no runtime-owned `ScenarioCompiledPlan + ScenarioRunSession` path consumes this feed from `fixtures/env + steps + expect`

## Next Work Item

Open `VOB-01 scenario compiled-plan carrier packet`.

Scope:

- define the smallest internal compiled-plan carrier object
- prove one scenario step can emit the existing `reason-link` feed
- keep compare and public trial facade out of scope
- reuse `makeScenarioBundlePatchRef`
- avoid introducing a second evidence envelope

## Validation

This packet reuses the tests from the constructor-law packet:

```bash
pnpm vitest run packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
pnpm -C packages/logix-core typecheck
```
