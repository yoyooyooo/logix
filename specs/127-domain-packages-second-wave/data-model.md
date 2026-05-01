# Data Model: Domain Packages Second Wave

## 1. `PackageRoleRecord`

| Field | Type | Description |
| --- | --- | --- |
| `package` | string | 包名 |
| `role` | enum | service-first / program-first |
| `retainedCapabilities` | string[] | 保留能力 |
| `packageShape` | string | direct-package / pattern-kit-wrapper |

## 2. `AdmissionRecord`

| Field | Type | Description |
| --- | --- | --- |
| `candidate` | string | 领域包候选 |
| `allowed` | boolean | 是否准入 |
| `requiredRole` | string | 允许的角色 |
| `rejectionReason` | string | 拒绝原因 |
