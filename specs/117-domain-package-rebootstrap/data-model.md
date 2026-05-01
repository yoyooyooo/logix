# Data Model: Domain Package Rebootstrap

## 1. `DomainPackageRole`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | 包名 |
| `primaryMode` | enum | `program-first` / `service-first` / `pattern-kit` / `domain-layer` |
| `publicEntries` | string[] | 公开入口 |
| `legacyEntries` | string[] | 旧入口 |

## 2. `DomainReuseCandidate`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | 包名 |
| `path` | string | 可复用路径 |
| `kind` | enum | `protocol` / `helper` / `fixture` / `test` |
| `reuseMode` | enum | `keep` / `move` / `split` / `drop` |

## 3. `DomainTemplate`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | 包名 |
| `publicLayer` | string[] | 公开层 |
| `internalLayer` | string[] | internal 功能簇 |
| `specialDirs` | string[] | 特殊目录，如 `react/` |

## 4. `BoundaryNote`

| Field | Type | Description |
| --- | --- | --- |
| `topic` | string | 边界主题 |
| `sourceDoc` | string | 来源文档 |
| `effectOnPackage` | string | 对该包的影响 |

## 5. `DomainSurfaceContract`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | 对应包名 |
| `primaryMode` | enum | `program-first` / `service-first` / `pattern-kit` / `domain-layer` |
| `primaryEntry` | string | 当前主入口 |
| `auxiliaryEntries` | string[] | 辅入口 |
| `legacyEntries` | string[] | 已降到 legacy/helper/expert 的旧入口 |
