# VOB-01 Verification Artifact Lifecycle Review

## Meta

| field | value |
| --- | --- |
| artifact_kind | `verification-artifact-lifecycle-review` |
| obligation_id | `VOB-01` |
| related_surface_candidate | `SURF-002` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `closed-partial` |
| decision_question | `当前 VOB-01 verification artifacts 应保留、泛化、降级还是删除` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-15`, `CAP-18` |
| related_projections | `PROJ-07` |
| related_collisions | `none open` |
| required_proofs | `PF-08` |
| coverage_kernel | `verification-artifact-lifecycle-required`, `fixture-local-until-promoted`, `single truth`, `verification boundary`, `evidence boundary` |
| non_claims | public `Runtime.trial(mode="scenario")`, compare truth, final exact surface, generalized implementation vocabulary |
| generator_hypothesis | proof code may grow tests and proof pressure, but lifecycle review must prevent scenario-local names from silently becoming final implementation law |

## Evidence Reviewed

| evidence | result |
| --- | --- |
| `2026-04-24-vob-01-bundle-patch-ref-constructor-law-packet.md` | internal constructor proven at fixture scope |
| `2026-04-24-vob-01-route-consumption-packet.md` | Form-artifact route consumes constructor at fixture scope |
| `2026-04-24-vob-01-compiled-plan-carrier-packet.md` | one compiled plan step can emit existing reason-link feed |
| `2026-04-24-vob-01-scenario-fixture-adapter-packet.md` | one `fixtures/env + steps + expect` fixture maps into `ScenarioCompiledPlan` at fixture scope |
| targeted contract tests | current proof ladder is executable and test-backed |
| `runtime/09` authority | scenario carrier vocabulary exists only inside verification control plane, not authoring surface |

## Wave Decision

Decision: `keep-fixture-local-with-retained-harness-slices`.

The current wave proves a narrow executable path:

- a structured fixture object compiles to one internal plan
- the compiled plan emits one reason-link evidence feed
- emitted feed stays inside the proof-kernel evidence package
- summary and compare truth remain untouched
- no public authoring surface is opened

The current wave still does not prove:

- complete scenario step language
- complete expectation evaluator
- compare-ready evidence summary
- public `Runtime.trial(mode="scenario")` facade
- final `CAP-15` exact backlink closure
- final internal vocabulary for all verification implementation modules

## Artifact Lifecycle Table

| artifact | lifecycle_state | naming decision | owner candidate | cleanup trigger |
| --- | --- | --- | --- | --- |
| `packages/logix-core/src/internal/verification/scenarioCarrierFeed.ts` | `retained-harness` | `ScenarioCarrierEvidenceFeed` may stay while tied to `VOB-01 / PF-08`; `makeScenarioBundlePatchRef` must not be reused as a general constructor law without authority review | `runtime/09` if promoted later | delete or demote if `SURF-002` is rejected; rename or move if promoted to generalized internal evidence substrate |
| legacy `packages/logix-core/src/internal/verification/scenarioReasonLinkProbe.ts` | `demoted-test-fixture` | current support lives in `packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts`; no production route may depend on the legacy vocabulary | `VOB-01` proof harness | delete or replace once a real scenario execution route owns reason-link emission |
| `packages/logix-core/src/internal/verification/scenarioCompiledPlanCarrier.ts` | `retained-harness` | `ScenarioCompiledPlan + ScenarioRunSession` matches `runtime/09` verification coordinate, but exact placement and final helper names stay under review | `runtime/09` | promote through authority request after expectation evaluator and report boundary are proven, or rewrite if final carrier differs |
| legacy `packages/logix-core/src/internal/verification/scenarioWitnessAdapter.ts` | `demoted-test-fixture` | current support lives in `packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts`; it covers one minimal proof path and must not become final compiler vocabulary by accretion | `VOB-01` proof harness | delete or generalize only after a dedicated compiler proposal and authority writeback |
| `packages/logix-core/src/internal/verification/evidenceCollector.ts` `recordScenarioCarrierEvidenceFeed` | `retained-harness` | method name stays acceptable only as a narrow feed recording seam | `runtime/09` | rename with feed if `SURF-002` promotes; remove if scenario carrier feed is replaced |
| VOB-01 contract tests | `retained-harness` | current test names use carrier / adapter / evaluation wording and keep proof trace in metadata | proof harness | keep until `VOB-01` closes, then compress to stable contract tests or demote fixtures with the implementation decision |

## Naming Guard

Before any new proof reuses these helpers, the next packet must restate:

- whether the reused helper is `fixture-local` or `retained-harness`
- whether scenario / fixture wording is an authority coordinate or local proof wording
- what would cause a rename, demotion, or deletion
- which test proves the reused helper still does not create compare truth or public authoring surface

## Status Delta

| item | before | after |
| --- | --- | --- |
| `SURF-002` | `under-review` | `under-review` |
| `VOB-01` | `conditional` | `conditional` |
| `CAP-15` | `partial` | `partial` |
| `CAP-18` | `partial` | `partial` |
| fixture adapter | `fixture-local structured adapter proven` | `fixture-local with cleanup trigger` |
| compiled-plan carrier | `retained-harness internal carrier proven` | `retained-harness pending authority review` |
| scenario feed | `retained-harness feed contract proven` | `retained-harness pending authority review` |

## Next Work Item

Open a narrow `VOB-01` expectation evaluator packet.

Scope:

- consume fixture `expect` against emitted evidence
- keep `expect` declarative
- do not create compare truth
- do not promote the fixture adapter to final compiler
- reuse only lifecycle-reviewed helpers

## Validation

This review is document-only. It relies on the executable proof recorded in the fixture adapter packet and keeps all artifact promotion deferred.
