# Data Model: Docs Full Coverage Roadmap

## 1. `DocsCoverageRecord`

| Field | Type | Description |
| --- | --- | --- |
| `docPath` | string | docs 页面路径 |
| `primaryOwnerSpec` | string | 主要 owner spec id |
| `relatedSpecs` | string[] | 相关依赖 specs |
| `coverageNote` | string | 覆盖说明 |

## 2. `SpecGroupEntry`

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | spec id |
| `dir` | string | spec 目录 |
| `status` | enum | `draft` / `planned` / `active` / `done` / `frozen` |
| `dependsOn` | string[] | 依赖成员 |
| `scope` | string | 职责说明 |

## 3. `CoverageBaseline`

| Field | Type | Description |
| --- | --- | --- |
| `specId` | string | existing coverage spec |
| `role` | string | 该 spec 在 docs 覆盖中的角色 |
| `coveredPages` | string[] | 已承接页面 |

## Relationship Notes

- `DocsCoverageRecord` 由 `120/spec-registry.md` 承接
- `SpecGroupEntry` 由 `120/spec-registry.json` 承接
- `CoverageBaseline` 用于区分 existing coverage 与 second-wave specs
