# VOB-01 Form-state Reason-link Narrowing

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| owner | `coordination-main-agent` |
| status | `executed-partial` |
| decision_question | `能否把 real W5 extraction 的 synthetic 输入继续压缩到只剩 bundlePatchRef` |

## Touched Files

- [scenarioCarrierReasonLinkFixture.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts)
- [VerificationScenarioCarrierFormStateReasonLink.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts)

## Landed Step

- current retained fixture helper: `emitScenarioFormStateReasonLinkFixture`
- helper now derives:
  - `reasonSlotId` from Form-shaped state
  - `ownerRef`
  - `canonicalRowIdChainDigest`
  - fixed `retention=live`
- caller now only supplies:
  - `state`
  - `listPath`
  - `rowId`
  - `fieldPath`
  - `bundlePatchRef`

## What This Proves

- staged narrowing still holds
- `reasonSlotId` no longer needs to be synthetic
- the only remaining synthetic coordinate is `bundlePatchRef`

## What This Still Does Not Prove

- real runtime-derived `bundlePatchRef`
- actual Form-backed `W5` extraction path
- `CAP-15` exact closure

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/internal/observability/Observability.RuntimeEvidencePackage.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `5` test files passed
- `5` tests passed
- `packages/logix-core` typecheck passed

## Residual

- `bundlePatchRef` is the last remaining synthetic field
- next step must be a real runtime-owned extraction path for `bundlePatchRef`

## Next Action

Design the smallest failing test that replaces synthetic `bundlePatchRef` with one runtime-owned extraction path, even if it still stays fixture-scoped.
