# Data Model: Query Logic Contract Cutover

## 1. `QuerySurfaceRecord`

| Field | Type | Description |
| --- | --- | --- |
| `surface` | string | Query 对外表面 |
| `tier` | enum | `default` / `integration` / `expert` / `removed` |
| `notes` | string | 说明 |

当前终局 ledger：

- `Query.make` -> `default`
- `Query.Engine` -> `integration`
- `Query.TanStack` -> `integration`
- root `Query.fields` -> `removed`
- `@logixjs/query/Fields` -> `expert`

验证锚点：

- `packages/logix-query/test/Query/Query.OutputModeBoundary.test.ts`
- `packages/logix-query/test/Query/Query.RootSurfaceBoundary.test.ts`
- `packages/logix-query/test/Query/Query.TraitsSubmoduleBoundary.test.ts`
- `packages/logix-query/test/Query/Query.ExpertTraitsWarning.test.ts`
- `packages/logix-query/test/Query.types.test.ts`

## 2. `QueryIntegrationRecord`

| Field | Type | Description |
| --- | --- | --- |
| `capability` | string | 集成能力名 |
| `role` | enum | `program-kit` / `integration-layer` / `helper` |
| `stateProjection` | boolean | 是否投影回模块 state |
| `notes` | string | 说明 |

验证锚点：

- `packages/logix-query/test/Engine.combinations.test.ts`
- `packages/logix-query/test/Query.controller.refreshAll.test.ts`
- `packages/logix-query/test/Query.invalidate.test.ts`
- `packages/logix-query/test/Query/Query.CacheReuse.test.ts`
- `packages/logix-query/test/Query/Query.Race.test.ts`
