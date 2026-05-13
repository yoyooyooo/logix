# VOB-01 Form-artifact BundlePatchRef Extraction

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| owner | `coordination-main-agent` |
| status | `executed-partial` |
| decision_question | `能否先用 Form evidence-contract artifact seed 落一条 fixture-local bundlePatchRef extraction path` |

## Touched Files

- [scenarioCarrierReasonLinkFixture.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts)
- [VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts)

## Landed Step

- current retained fixture helper: `emitScenarioFormArtifactReasonLinkFixture`
- helper now derives `bundlePatchRef` from:
  - Form evidence-contract artifact seed
  - `bundlePatchPath`
- emitted shape is:
  - `bundlePatch:<bundlePatchPath>`

## What This Proves

- the last synthetic field can be removed at fixture scope
- there is now one runtime-owned `reason-link` path with no synthetic caller fields
- this path can stay entirely inside verification internals

## What This Does Not Prove Yet

- stable global `bundlePatchRef` law
- deterministic opaque-id contract for `bundlePatchRef`
- compare truth admission
- production-ready scenario route

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/internal/observability/Observability.RuntimeEvidencePackage.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `6` test files passed
- `6` tests passed
- `packages/logix-core` typecheck passed

## Residual

- current `bundlePatchRef` is fixture-local and artifact-seed-backed
- next decision is whether to keep this as fixture-only or promote it into a reusable runtime-owned constructor law

## Next Action

Run one compaction review over the whole `VOB-01` ladder and decide whether the current fixture-local `bundlePatchRef` path is enough, or whether it must be promoted into a reusable constructor contract.
