# CAP-15 Final Submit Linkage Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| target_capability | `CAP-15` |
| related_surface_candidate | `SURF-002` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `executed-partial` |
| decision_question | `能否把真实 Form submit reasonSlotId 连接到已被 runtime/09 接受的 scenario carrier evidence boundary` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-15`, `CAP-18` |
| related_projections | `PROJ-04`, `PROJ-07` |
| related_collisions | `none open` |
| required_proofs | `PF-04`, `PF-08` |
| coverage_kernel | `single truth`, `evidence boundary`, `proof-before-authority`, `fixture-local-until-promoted` |
| non_claims | new public submit API, public diagnostics helper, compare truth, full scenario compiler |
| generator_hypothesis | a fixture-local bridge can connect current submit summary reasonSlotId to the accepted scenario carrier feed without adding an explain object |

## Executed Step

Touched files:

- [scenarioCarrierReasonLinkFixture.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts)
- [VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts)

Landed contract:

- `emitScenarioFormSubmitLinkFixture`
- optional `evidenceFieldPath`
- row-scoped rule outcome guard
- array-aware fixture-local path reader

## Proof Result

The targeted test proves:

- a real Form submit produces `submit:1`
- a real row-scoped rule outcome exists for the selected row and field
- the fixture uses the same `submit:1` as the scenario carrier `reasonSlotId`
- bundle patch evidence is derived from a Form evidence-contract source seed
- emitted feed remains inside `EvidencePackage.events`
- `EvidencePackage.summary` remains untouched

This packet does not prove:

- final public scenario trial facade
- full submit evidence summary
- compare-ready normalized summary
- final implementation vocabulary for scenario carrier helpers
- all `CAP-15` variants across source / rule / submit combinations

## Status Delta

| item | before | after |
| --- | --- | --- |
| `CAP-15` | `partial` | `partial-plus-bridge-proof` |
| `CAP-18` | `partial` | `partial-plus-submit-link-proof` |
| `SC-D` | `partially-covered` | `partially-covered`, with exact backlink bridge now executable |
| `SURF-002` | `authority-linked boundary` | `authority-linked boundary with submit-link bridge evidence` |

## Verification Artifact Lifecycle

| artifact | lifecycle_state | cleanup trigger |
| --- | --- | --- |
| `emitScenarioFormSubmitLinkFixture` | `fixture-local` | demote or delete when final scenario extraction route owns submit linkage |
| `VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts` | `retained-harness` | keep while `CAP-15` remains partial |
| array-aware fixture path reader | `fixture-local` | delete if final extraction route uses typed state selectors |

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `7` test files passed
- `10` tests passed
- `packages/logix-core` typecheck passed

## Next Action

Run a `CAP-15 closure review`.

The review must decide whether the bridge proof is enough to mark `CAP-15` proven for current matrix scope, or whether source receipt identity / broader submit linkage still blocks `SC-D` from moving to covered.
