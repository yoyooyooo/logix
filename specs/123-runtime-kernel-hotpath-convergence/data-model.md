# Data Model: Runtime Kernel Hotpath Convergence

## 1. `HotpathZoneRecord`

| Field | Type | Description |
| --- | --- | --- |
| `zone` | string | kernel / shell / control plane |
| `codeRoots` | string[] | 主代码路径 |
| `steadyState` | boolean | 是否属于 steady-state |
| `allowed` | boolean | 是否允许进入 steady-state 主清单 |
| `notes` | string[] | 关键裁决说明 |

## 2. `EvidenceRule`

| Field | Type | Description |
| --- | --- | --- |
| `changeType` | string | 变更类型 |
| `requires` | string[] | baseline / diff / reopen 条件 |
| `route` | string[] | 证据落盘或背景入口 |
| `noGo` | string[] | 不构成硬结论的情况 |
