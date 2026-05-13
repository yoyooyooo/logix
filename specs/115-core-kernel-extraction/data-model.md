# Data Model: Core Kernel Extraction

## 1. `KernelZone`

| Field | Type | Description |
| --- | --- | --- |
| `zoneId` | string | 分层编号 |
| `path` | string | 目录或入口文件 |
| `role` | enum | `kernel` / `runtime-shell` / `observability` / `reflection` / `process` |
| `dependsOn` | string[] | 允许依赖的相邻 zone |

## 2. `KernelSupportMatrixEntry`

| Field | Type | Description |
| --- | --- | --- |
| `contractName` | string | 合同或能力名 |
| `coreStatus` | enum | `source-of-truth` / `adopted` / `n-a` |
| `coreNgStatus` | enum | `borrowed` / `legacy` / `frozen` / `removed` |
| `notes` | string | 说明 |

## 3. `ReuseCandidate`

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | 现有实现或测试路径 |
| `kind` | enum | `hot-path` / `diagnostics` / `test` / `helper` |
| `reuseMode` | enum | `keep` / `move` / `split` / `drop` |
| `ownerZone` | string | 目标 zone |

## 4. `PublicSurfaceMap`

| Field | Type | Description |
| --- | --- | --- |
| `publicEntry` | string | 公开入口 |
| `backingZone` | string | 对应 zone |
| `status` | enum | `keep` / `shrink` / `expert-only` |

## 5. `BoundarySurfaceContract`

| Field | Type | Description |
| --- | --- | --- |
| `publicEntry` | string | 对外边界合同所在入口 |
| `zone` | enum | `kernel` / `runtime-shell` / `observability` / `reflection` / `process` |
| `owns` | string[] | 当前入口明确承接的职责或模块族 |
| `excludes` | string[] | 明确不应由该入口承接的相邻职责 |

## 6. `LegacyRoutingSurface`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | legacy package 名称 |
| `status` | enum | `legacy` / `legacy-routing` |
| `sourceOfTruthPackage` | string | 当前唯一主线包 |
| `recommendedConsumerPackage` | string | 新 consumer 应指向的包 |
| `retainedEntryPoints` | string[] | 仍保留的 legacy 入口 |
| `supportedServiceIds` | string[] | support matrix 允许映射的 service ids |
| `notes` | string | 额外说明 |

## Relationship Notes

- `KernelZone` 决定目标目录拓扑
- `KernelSupportMatrixEntry` 裁决 `core` 与 `core-ng` 的关系
- `ReuseCandidate` 约束实现与测试的复用路径
- `PublicSurfaceMap` 把稳定公开面映射回 zone
- `BoundarySurfaceContract` 把第一层 cutover 的 public-surface 边界落到可测试常量
- `LegacyRoutingSurface` 把 `core-ng` 的 public meaning 收口为 legacy route / support matrix 输入
