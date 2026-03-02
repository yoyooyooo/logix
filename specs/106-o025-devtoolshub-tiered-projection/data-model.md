# Data Model: O-025 DevtoolsHub 投影分层

## Entity: ProjectionTier

- **Values**: `light` | `full`
- **Rules**:
  - light 输出摘要
  - full 输出完整投影

## Entity: ProjectionSummary

- **Fields**:
  - `snapshotToken`
  - `summaryFields`
  - `degraded`
  - `reason`（当 `degraded=true` 时必填）
- **Validation Rules**:
  - `degraded=true` 时必须附带 `reason`

## Entity: ProjectionDegradeReason

- **Fields**:
  - `code`
  - `message`
  - `recommendedAction`
- **Validation Rules**:
  - code 稳定且可枚举
