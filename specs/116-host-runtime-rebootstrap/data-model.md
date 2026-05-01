# Data Model: Host Runtime Rebootstrap

## 1. `HostPackageRole`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | 包名 |
| `primaryRole` | string | 主职责 |
| `publicEntries` | string[] | 公开入口 |
| `internalClusters` | string[] | internal 功能簇 |

## 2. `SharedControlPlaneContract`

| Field | Type | Description |
| --- | --- | --- |
| `surface` | string | 控制面接口 |
| `ownerPackage` | string | 拥有该 surface 的包 |
| `consumers` | string[] | 消费该 surface 的包 |

## 3. `HostReuseCandidate`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | 包名 |
| `path` | string | 可复用路径 |
| `kind` | enum | `protocol` / `helper` / `fixture` / `test` |
| `reuseMode` | enum | `keep` / `move` / `split` / `drop` |

## 4. `PackageTemplate`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | 包名 |
| `publicLayer` | string[] | 公开层 |
| `internalLayer` | string[] | internal 层 |
| `testLayer` | string[] | 测试层 |
| `specialDirs` | string[] | 特殊目录 |

## 5. `HostSurfaceContract`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | 包名 |
| `zone` | string | `host-runtime` / `trial-surface` / `test-consumer` / `observer-ui` |
| `publicEntry` | string | 当前主入口 |
| `controlPlane` | string[] | 当前包明确消费的 control plane surface |
| `owns` | string[] | 当前包承接的职责 |
| `excludes` | string[] | 当前包明确不承接的职责 |
