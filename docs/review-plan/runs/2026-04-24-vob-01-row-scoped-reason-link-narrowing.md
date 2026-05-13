# VOB-01 Row-scoped Reason-link Narrowing

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| owner | `coordination-main-agent` |
| status | `executed-partial` |
| decision_question | `能否把 real W5 extraction 的 synthetic 输入收缩到只剩 bundlePatchRef` |

## Touched Files

- [scenarioCarrierReasonLinkFixture.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts)
- [VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts)

## Landed Step

- current retained fixture helper: `emitScenarioRowScopedReasonLinkFixture`
- helper now derives:
  - `ownerRef`
  - `canonicalRowIdChainDigest`
  - fixed `retention=live`
- caller now only supplies:
  - `reasonSlotId`
  - `listPath`
  - `rowId`
  - `fieldPath`
  - `bundlePatchRef`

## What This Proves

- staged narrowing is working
- row locality no longer needs to be synthetic
- next remaining synthetic coordinate is only `bundlePatchRef`

## What This Still Does Not Prove

- real runtime-derived `reasonSlotId`
- real runtime-derived `bundlePatchRef`
- actual Form-backed `W5` extraction path

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/internal/observability/Observability.RuntimeEvidencePackage.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `4` test files passed
- `4` tests passed
- `packages/logix-core` typecheck passed

## Residual

- `reasonSlotId` is still caller-supplied
- `bundlePatchRef` is still caller-supplied
- next honest step is to derive `reasonSlotId` from real Form state and leave `bundlePatchRef` as the last deferred field

## Next Action

Write the first Form-backed verification artifact that extracts `reasonSlotId` from real state and only keeps `bundlePatchRef` synthetic.
