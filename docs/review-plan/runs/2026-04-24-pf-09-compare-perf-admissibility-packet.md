# PF-09 Compare-perf Admissibility Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| proof_id | `PF-09` |
| obligation_id | `VOB-02` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `executed-partial` |
| decision_question | `compare / perf 能否复用 accepted fixture carrier 与稳定 digest，而不拥有 correctness truth` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-F` |
| target_caps | `VOB-02`, `CAP-18`, `CAP-25` |
| related_projections | `PROJ-07` |
| related_collisions | `COL-07` |
| required_proofs | `PF-09` |
| coverage_kernel | `verification boundary`, `evidence boundary`, `single truth`, `fixture-local-until-promoted` |
| non_claims | root `Runtime.compare`, benchmark truth, authoring semantics, report summary rewrite |
| generator_hypothesis | compare / perf can derive stable admissibility evidence from accepted fixture carrier without becoming correctness owner |

## Executed Step

Touched files:

- [comparePerfAdmissibilityFixture.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/comparePerfAdmissibilityFixture.ts)
- [VerificationComparePerfAdmissibilityEvidence.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationComparePerfAdmissibilityEvidence.contract.test.ts)

Landed contract:

- `makeComparePerfAdmissibilityEvidence`
- `compiledPlanDigest`
- `fixtureIdentityDigest`
- `evidenceDigest`
- `environmentFingerprint`
- `correctnessVerdict: "not-owned"`

## Proof Result

The targeted test proves:

- a compiled scenario fixture can produce repeatable admissibility evidence
- `compiledPlanDigest`, `fixtureIdentityDigest`, and `environmentFingerprint` are stable for identical inputs
- evidence digest can be derived from the existing evidence event stream
- the fixture explicitly records that correctness verdict is not owned by compare/perf
- no public Form API changes are needed

This packet does not prove:

- root `Runtime.compare` exact API
- real benchmark runner integration
- before/after perf evidence collection
- perf budget decision
- browser perf boundary

## Status Delta

| item | before | after |
| --- | --- | --- |
| `VOB-02` | `planned` | `executable-for-admissibility` |
| `PF-09` | `planned` | `executable-for-admissibility` |
| `PROJ-07` | `under-pressure` | `under-pressure`, because root compare/perf productization remains out of scope |
| `CAP-18` | `partial` | `partial-plus-admissibility-proof` |

## Verification Artifact Lifecycle

| artifact | lifecycle_state | cleanup trigger |
| --- | --- | --- |
| `comparePerfAdmissibilityFixture.ts` | `fixture-local` | promote only after runtime/09 accepts compare/perf admissibility substrate; delete if root compare design picks a different digest owner |
| `VerificationComparePerfAdmissibilityEvidence.contract.test.ts` | `retained-harness` | keep while `PF-09` is used as admissibility gate |

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationComparePerfAdmissibilityEvidence.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `5` test files passed
- `5` tests passed
- `packages/logix-core` typecheck passed

## Next Action

Run `PF-09` promotion-readiness review.

The review must decide whether `VOB-02` can be marked executable for current planning closure while leaving root `Runtime.compare` exact surface as a later authority task.
