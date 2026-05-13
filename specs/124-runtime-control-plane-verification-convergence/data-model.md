# Data Model: Runtime Control Plane Verification Convergence

## 1. `VerificationStageRecord`

| Field | Type | Description |
| --- | --- | --- |
| `stage` | string | check / trial / compare |
| `modes` | string[] | 支持的 mode |
| `defaultUpgradeTo` | string | 默认升级方向 |
| `ownerPackage` | string[] | 对应入口包 |

## 2. `MachineReportField`

| Field | Type | Description |
| --- | --- | --- |
| `field` | string | 报告字段 |
| `required` | boolean | 是否必须 |
| `meaning` | string | 语义 |
| `currentStatus` | string | active / deferred / mismatch |

## 3. `PackageOwnershipRecord`

| Field | Type | Description |
| --- | --- | --- |
| `package` | string | owner package |
| `role` | string | contract / cli / harness / sandbox |
| `allowedSurface` | string[] | 允许暴露的 control-plane 面 |
