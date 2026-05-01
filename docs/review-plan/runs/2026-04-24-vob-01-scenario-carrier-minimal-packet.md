# VOB-01 Scenario Carrier Minimal Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `proof-planning-packet` |
| obligation_id | `VOB-01` |
| linked_caps | `CAP-15`, `CAP-18` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `planned` |
| decision_question | `为了闭合 CAP-15 exact backlink，VOB-01 的最小 scenario carrier packet 应该长成什么样` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-15`, `CAP-18` |
| related_projections | `PROJ-04`, `PROJ-07` |
| related_collisions | `none` |
| required_prior_proof | `PF-04 executable floor`, `PF-08 startup evidence floor`, `TRACE-S4 scenario execution carrier law` |
| coverage_kernel | `verification-boundary`, `single-truth`, `evidence-boundary`, `planning-before-exact` |
| non_claims | public API change, compare truth substrate, exact internal type shape, perf truth, new diagnostics object |

## Imported Frozen Law

- scenario execution carrier owner is runtime control plane
- `ScenarioExecutionCarrier = ScenarioCompiledPlan + ScenarioRunSession`
- carrier only produces `ScenarioCarrierEvidenceFeed`
- compare truth stays out of this packet
- benchmark reuse is execution-carrier reuse only
- no Form route reopen, no host law reopen, no second evidence envelope

## Packet Goal

Define the smallest runtime-owned carrier slice that can prove:

- `reasonSlotId -> current live evidence head`
- with enough local coordinates to explain row-scoped final truth
- without promoting new public nouns or compare truth

## Required Feed Fields For This Slice

### Required

- `reasonSlotId`
- `bundlePatchRef`
- `ownerRef`
- `transition`
- `retention`

### Required When Row-scoped

- `canonicalRowIdChainDigest`

### Optional In This Slice

- `sourceReceiptRef`
- `derivationReceiptRef`
- `witnessStepId`

## Existing Reuse Landing

### Stable Half

- [trialRunModule.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/observability/trialRunModule.ts)
- [proofKernel.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/proofKernel.ts)
- [proofKernel.types.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/proofKernel.types.ts)

### Run-local Half

- [runSession.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/runSession.ts)
- [evidence.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/evidence.ts)
- [evidenceCollector.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/evidenceCollector.ts)

## Minimal Implementation Landing

1. keep `Runtime.trial` public facade unchanged
2. add runtime-owned scenario plan/session substrate under `packages/logix-core/src/internal/verification/**`
3. let carrier emit `ScenarioCarrierEvidenceFeed` only
4. allow Form domain to supply declaration anchors and fixture read points only
5. keep compare and diff logic out of this slice

## Acceptance Gate

This packet is complete only when one scenario fixture can deterministically emit:

- one `reason-link` row
- carrying `reasonSlotId`
- pointing at a `bundlePatchRef`
- with `ownerRef`
- and, when row-scoped, `canonicalRowIdChainDigest`

without:

- changing public `Runtime.trial` surface
- adding compare result truth
- adding Form-side helper nouns

## Rejected Alternatives

- solve `CAP-15` by extending state truth
  - rejected because the required live-head coordinates do not belong there
- solve `CAP-15` by adding a host diagnostics helper
  - rejected because it grows a second explanation surface
- solve `CAP-15` together with compare truth substrate
  - rejected because it widens scope and mixes owners

## Next Action

Draft the first implementation-ready proof for a runtime-owned scenario carrier that emits one `reason-link` row for `W5 rule-submit-backlink`.
