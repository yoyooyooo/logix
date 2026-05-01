# VOB-01 Reason-link Feed Contract

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| owner | `coordination-main-agent` |
| status | `executed-partial` |
| decision_question | `能否先落一层最小 internal feed contract，而不碰公开 trial facade 与 compare truth` |

## Touched Files

- [scenarioCarrierFeed.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/scenarioCarrierFeed.ts)
- [evidenceCollector.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/evidenceCollector.ts)
- [ScenarioCarrierEvidenceFeed.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts)

## Landed Contract

- internal event type: `verification:scenario-carrier-feed`
- internal feed shell: `ScenarioCarrierEvidenceFeed`
- first row kind: `reason-link`
- collector can now record one feed packet into `EvidencePackage.events`
- summary export remains unchanged

## What This Proves

- we can land a runtime-owned feed contract without touching public `Runtime.trial`
- we can carry the minimal `reason-link` row fields as JSON-serializable evidence
- current change does not create compare truth or a second report truth

## What This Does Not Prove Yet

- `Runtime.trial(mode="scenario")` route
- `ScenarioCompiledPlan + ScenarioRunSession` wiring
- actual `W5` fixture execution through runtime-owned carrier
- any compare or diff substrate

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/internal/observability/Observability.RuntimeEvidencePackage.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `2` test files passed
- `2` tests passed
- `packages/logix-core` typecheck passed

## Residual

- feed contract exists, but no producer currently emits real `W5` row data
- next step is wiring one runtime-owned producer path through proof kernel or trial adapter

## Next Action

Design the smallest failing test that exercises one runtime-owned producer path for `W5 reason-link`, then wire it through `internal/verification/**`.
