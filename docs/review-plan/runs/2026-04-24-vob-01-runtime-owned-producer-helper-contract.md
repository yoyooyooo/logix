# VOB-01 Runtime-owned Producer Helper Contract

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| owner | `coordination-main-agent` |
| status | `executed-partial` |
| decision_question | `能否先把 reason-link feed 从裸 collector 调用推进到 runtime-owned verification helper` |

## Touched Files

- [scenarioCarrierReasonLinkFixture.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts)
- [VerificationScenarioCarrierReasonLinkFeed.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts)

## Landed Step

- current retained fixture helper: `emitScenarioCarrierReasonLinkFixture(input)`
- helper reads collector from proof-kernel Effect context
- helper emits one `ScenarioCarrierEvidenceFeed` packet
- proof-kernel context can now drive a producer path without direct test-side access to collector

## What This Proves

- the first producer step is now runtime-owned
- the helper sits inside `internal/verification/**`, not in Form and not in public Runtime surface
- proof-kernel context is already enough to carry one reason-link packet

## What This Does Not Prove Yet

- real `W5` scenario data extraction from Form runtime
- `ScenarioCompiledPlan + ScenarioRunSession` execution path
- `Runtime.trial(mode="scenario")` facade
- compare truth or diff substrate

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/internal/observability/Observability.RuntimeEvidencePackage.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `3` test files passed
- `3` tests passed
- `packages/logix-core` typecheck passed

## Residual

- producer helper still consumes fixture input, not real runtime-derived `W5` coordinates
- next step is to replace synthetic fixture input with one runtime-owned extraction path

## Next Action

Design the smallest failing test that extracts one real `W5` reason-link row from a Form-backed runtime path through verification internals.
