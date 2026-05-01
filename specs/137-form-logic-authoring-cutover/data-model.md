# Data Model: Form Logic Authoring Cutover

## 1. `FormSurfaceRecord`

| Field | Type | Description |
| --- | --- | --- |
| `entry` | string | 作者面入口 |
| `tier` | enum | `default` / `helper` / `expert` / `legacy` / `removed` |
| `owner` | string | 归属层 |
| `notes` | string | 说明 |

默认层必须包含且只包含：

- `Form.make`
- `Form.from(schema).logic`

验证锚点：

- `packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts`
- `packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`
- `packages/logix-form/test/Form/Form.LegacyTopLevelWarning.test.ts`

## 2. `FormCapabilityRecord`

| Field | Type | Description |
| --- | --- | --- |
| `capability` | string | Form 能力名 |
| `layer` | enum | `form-domain` / `shared-declaration` / `field-kernel` |
| `recommendedPath` | string | 推荐入口 |
| `notes` | string | 说明 |

验证锚点：

- `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- `packages/logix-form/test/Form/Form.ValidateOnStrategy.test.ts`
- `packages/logix-form/test/Form/Form.RowIdErrorOwnership.test.ts`
- `packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`
