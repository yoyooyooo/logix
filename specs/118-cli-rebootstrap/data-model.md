# Data Model: CLI Rebootstrap

## 1. `CommandSurface`

| Field | Type | Description |
| --- | --- | --- |
| `command` | string | 一级命令 |
| `purpose` | string | 主职责 |
| `inputs` | string[] | 输入类型 |
| `outputs` | string[] | 输出字段 |

## 2. `LegacyCommandDisposition`

| Field | Type | Description |
| --- | --- | --- |
| `legacyCommand` | string | 旧命令名 |
| `route` | enum | `archive` / `expert` / `drop` |
| `notes` | string | 去向说明 |

## 3. `CliReuseCandidate`

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | 可复用路径 |
| `kind` | enum | `helper` / `artifact` / `test` |
| `reuseMode` | enum | `keep` / `move` / `split` / `drop` |

## 4. `OutputContract`

| Field | Type | Description |
| --- | --- | --- |
| `field` | string | 输出字段 |
| `required` | boolean | 是否必需 |
| `description` | string | 字段含义 |

## 5. `ControlPlaneReport`

| Field | Type | Description |
| --- | --- | --- |
| `kind` | string | `RuntimeCheckReport` / `RuntimeTrialReport` / `RuntimeCompareReport` |
| `stage` | enum | `check` / `trial` / `compare` |
| `verdict` | enum | `pass` / `warn` / `fail` |
| `summary` | string | 当前阶段的人类可读摘要 |
| `artifacts` | object[] | 关联到旧 artifact 或新工件的摘要引用 |
| `repairHints` | string[] | 下一步修复提示 |
| `nextRecommendedStage` | enum | `check` / `trial` / `compare` / `done` |

## Relationship Notes

- `CommandSurface` 决定一级命令与底层执行器的映射
- `LegacyCommandDisposition` 决定旧命令是 `archive` 还是 `expert`
- `CliReuseCandidate` 约束 helper / artifact / test 的沿用路径
- `OutputContract` 固定 `check / trial / compare` 的主 artifact 字段
- `ControlPlaneReport` 把 `OutputContract` 具体落到新主 artifact
