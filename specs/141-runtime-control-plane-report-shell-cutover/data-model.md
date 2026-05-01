# Data Model: Runtime Control Plane Report Shell Cutover

## VerificationControlPlaneReport

- role: control plane 的单一 top-level report shell
- key fields:
  - `kind`
  - `stage`
  - `mode`
  - `verdict`
  - `errorCode`
  - `summary`
  - `environment`
  - `artifacts`
  - `repairHints`
  - `nextRecommendedStage`

## VerificationControlPlaneRepairHint

- role: machine-localizable repair target
- machine core:
  - `code`
  - `canAutoRetry`
  - `upgradeToStage`
  - `focusRef`
- consumer fields:
  - `reason`
  - `suggestedAction`
- optional linking:
  - `relatedArtifactOutputKeys`

## VerificationControlPlaneFocusRef

- role: coordinate-first repair target
- fields:
  - `declSliceId`
  - `reasonSlotId`
  - `scenarioStepId`
  - `sourceRef`

## VerificationControlPlaneArtifactRef

- role: supporting artifact shell
- fields:
  - `outputKey`
  - `kind`
  - `file`
  - `digest`
  - `reasonCodes`

## Boundaries

- report shell 不拥有 domain payload exact shape
- `reasonSlotId / sourceRef` 在 report shell 中只承载 opaque stable id
- materializer payload exactness 继续由 domain SSoT 持有
