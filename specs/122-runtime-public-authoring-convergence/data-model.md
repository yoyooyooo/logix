# Data Model: Runtime Public Authoring Convergence

## 1. `SurfaceRecord`

| Field | Type | Description |
| --- | --- | --- |
| `surfaceName` | string | API 或入口名 |
| `tier` | enum | `canonical` / `expert` / `legacy-exit` |
| `ownerPage` | string | 对应 docs 页面 |
| `implementationScope` | string | `kernel` / `canonical-example` / `deferred-user-docs` |

## 2. `PublicNarrativeRecord`

| Field | Type | Description |
| --- | --- | --- |
| `artifact` | string | docs/example/export/generator |
| `claims` | string[] | 对外叙事 |
| `matchesCanonical` | boolean | 是否匹配 canonical 主链 |
| `status` | string | `active` / `deferred` |
