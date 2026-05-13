# COL-05 Evidence Envelope Decision

## Meta

| field | value |
| --- | --- |
| artifact_kind | `collision-decision` |
| collision_id | `COL-05` |
| owner | `coordination-main-agent` |
| status | `closed` |
| decision_question | `diagnostics helper 与 report materializer 是否会分叉出第二 report truth` |

## Decision

Keep one evidence envelope and one report truth.

Adopted rule:

- UI explain, Agent diagnostics, trial report, compare feed, and report materializer all stay subordinate to the same evidence envelope and `VerificationControlPlaneReport`

## Why This Closes COL-05

- `Form.ReasonContract.Witness` proves submit summary and compare feed stay on the same `submitAttempt` authority
- `useSelector(Form.Error.field(path))` proves UI explain reads `reasonSlotId / sourceRef / subjectRef` through one selector primitive
- `Runtime.trial` and companion trial witness prove trial report stays on `VerificationControlPlaneReport` and artifact-backed linking
- `VerificationControlPlaneContract` keeps one report shell and one `focusRef` coordinate contract
- no second diagnostics helper family or second materializer truth was introduced

## Verification Used

```bash
pnpm vitest run packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx packages/logix-form/test/Form/Form.ReasonContract.Witness.test.ts packages/logix-form/test/Form/Form.Companion.Scenario.trial.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/observability/TrialRunEvidenceDemo.regression.test.ts
```

Result:

- `5` files passed
- `13` tests passed

## Residual

- richer evidence-link exactness remains on `CAP-18 / PF-08`
- current active follow-up should move from collision closure to evidence-envelope deepening
