# Data Model: I18n Logic Contract Cutover

## 1. `I18nSurfaceRecord`

| Field | Type | Description |
| --- | --- | --- |
| `surface` | string | I18n 对外表面 |
| `tier` | enum | `default` / `auxiliary` / `expert` / `removed` |
| `notes` | string | 说明 |

当前终局 ledger：

- `I18n / I18nTag / I18nSnapshotSchema / token contract exports` -> `default`
- package-root projection 或 module helpers -> `removed`
- surviving projection helpers -> `expert`

验证锚点：

- `packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts`
- `packages/i18n/test/I18n/I18n.RootSurfaceBoundary.test.ts`
- `packages/i18n/test/I18n/I18n.DriverLifecycleBoundary.test.ts`
- `packages/i18n/test/I18n/ReadySemantics.test.ts`
- `packages/i18n/test/I18n/I18n.ServiceIsolation.test.ts`
- `packages/i18n/test/Token/MessageToken.test.ts`

## 2. `DriverLifecycleRecord`

| Field | Type | Description |
| --- | --- | --- |
| `signal` | string | driver 生命周期信号 |
| `owner` | enum | `shared-declaration` / `service-layer` / `expert-route` |
| `effect` | string | 对运行时的影响 |
| `notes` | string | 说明 |

验证锚点：

- `packages/i18n/test/I18n/I18n.DriverLifecycleBoundary.test.ts`
- `packages/i18n/test/I18n/ReadySemantics.test.ts`
- `packages/i18n/test/I18n/I18n.ServiceIsolation.test.ts`
