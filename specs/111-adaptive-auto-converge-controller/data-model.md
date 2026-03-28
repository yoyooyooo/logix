# Data Model: Adaptive Auto-Converge Controller

## Readiness

- current mode: `planning_active`
- implementation mode: `shadow_code_poc_ready`

## Entities

### AdaptiveConvergeControllerState

- `controllerStateVersion`
- `moduleId`
- `envBucket`
- `bands`
- `shadowEnabled`
- `explorationEnabled`
- `lastUpdatedAt`

### ConvergeBandKey

- `moduleId`
- `envBucket`
- `stepCountBand`
- `dirtyRootRatioBand`
- `cacheStateClass`

### ConvergeBandState

- `bandKey`
- `sampleCount`
- `fullCostEstimate`
- `dirtyCostEstimate`
- `confidence`
- `safetyMargin`
- `fallbackShare`
- `generationVersion`
- `cooldownState`
- `lastShadowDecisionAt`

### ExplorationRecord

- `bandKey`
- `candidateMode`
- `cooldownState`
- `rollbackReason`
- `accepted`
- `recordedAt`

### ShadowDecisionSummary

- `requestedMode`
- `executedMode`
  - current shadow-only candidate mirrors live `executedMode`
  - allowed values in the current proven boundary: `full | dirty`
- `bandKey`
- `fullCostEstimate`
- `dirtyCostEstimate`
- `fallbackReason`
- `controllerStateVersion`
- `shadowDecision`

## Lifetime Rules

- per-band state only lives in the current runtime instance
- generation bump lowers confidence instead of mutating live decision
- exploration records never count as accepted evidence by themselves
