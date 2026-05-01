# Data Model: Verification Proof Kernel Second Wave

## 1. `VerificationRouteLayer`

| Field | Type | Description |
| --- | --- | --- |
| `layer` | string | `proof-kernel` / `canonical-adapter` / `expert-adapter` / `public-facade` |
| `ownerFiles` | string[] | 当前层的 owner 文件 |
| `allowedResponsibilities` | string[] | 允许承接的职责 |
| `forbiddenResponsibilities` | string[] | 明确禁止承接的职责 |

## 2. `CanonicalAdapterSlice`

| Field | Type | Description |
| --- | --- | --- |
| `slice` | string | environment / report / artifact / error-mapping / route-entry |
| `currentLocation` | string | 当前实现所在文件 |
| `targetLocation` | string | 目标拆分落点 |
| `sharedExecutionAllowed` | boolean | 是否允许持有 shared execution 逻辑 |
| `notes` | string | 备注 |

## 3. `RouteContractGate`

| Field | Type | Description |
| --- | --- | --- |
| `gate` | string | contract test 或 grep gate 名称 |
| `protects` | string | 保护的边界 |
| `currentStatus` | string | active / missing / needs-tightening |
| `ownerFiles` | string[] | 被保护的路径 |

## 4. `DocsWritebackRecord`

| Field | Type | Description |
| --- | --- | --- |
| `file` | string | 需要回写的 docs 或 ledger |
| `role` | string | SSoT / legacy ledger / spec-local inventory |
| `changeRequired` | string | 需要同步的事实 |
| `gate` | string | 哪个验证证明回写完成 |
