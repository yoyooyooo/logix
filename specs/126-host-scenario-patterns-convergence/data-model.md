# Data Model: Host Scenario Patterns Convergence

## 1. `ScenarioAnchorRecord`

| Field | Type | Description |
| --- | --- | --- |
| `scenario` | string | 标准场景 |
| `primaryExample` | string | 主示例路径 |
| `relatedVerification` | string | 相关验证入口 |
| `role` | string | projection / example / verification |

## 2. `HostBoundaryRecord`

| Field | Type | Description |
| --- | --- | --- |
| `entry` | string | host API 或 package |
| `role` | string | projection / example / verification |
| `notes` | string | 边界说明 |
