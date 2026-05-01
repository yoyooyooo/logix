# Data Model: Form Field-Kernel Second Wave

## 1. `FormBoundaryRecord`

| Field | Type | Description |
| --- | --- | --- |
| `capability` | string | Form 能力 |
| `layer` | enum | `form-dsl` / `field-kernel` / `expert-direct-api` |
| `notes` | string | 说明 |
| `entry` | string[] | 对应作者面入口 |

## 2. `AuthoringSurfaceRecord`

| Field | Type | Description |
| --- | --- | --- |
| `entry` | string | 入口名 |
| `tier` | string | top-level / helper / direct-api |
| `recommendedUse` | string | 推荐使用层级 |
| `status` | string | keep / helper-only / legacy-exit |
