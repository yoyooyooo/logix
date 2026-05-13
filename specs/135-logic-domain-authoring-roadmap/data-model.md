# Data Model: Logic Domain Authoring Convergence Roadmap

## 1. `SpecGroupEntry`

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | member spec 编号 |
| `dir` | string | member spec 目录 |
| `status` | enum | `draft / planned / active / done` |
| `dependsOn` | string[] | 依赖的 spec 编号 |
| `scope` | string | 一句话 primary scope |

## 2. `RoutingRecord`

| Field | Type | Description |
| --- | --- | --- |
| `topic` | string | 争议或工作主题 |
| `primaryOwner` | string | primary owner spec |
| `relatedSpecs` | string[] | 相关依赖 spec |
| `note` | string | 路由说明 |
