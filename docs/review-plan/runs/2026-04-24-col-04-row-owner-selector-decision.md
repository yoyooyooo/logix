# COL-04 Row-owner Selector Decision

## Meta

| field | value |
| --- | --- |
| artifact_kind | `collision-decision` |
| collision_id | `COL-04` |
| owner | `coordination-main-agent` |
| status | `closed` |
| decision_question | `row-owner projection 是否需要第二 read family` |

## Decision

Adopt the smallest row-owner selector primitive in the same family:

- `Form.Companion.byRowId(listPath, rowId, fieldPath)`

Consumption stays fixed at:

- `useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))`

## Why This Closes COL-04

- row-owner projection remains inside the canonical host gate
- no second host hook family is added
- no raw internal landing path is exposed
- row-owner binding is resolved against current roster through canonical row identity

## Verification Used

```bash
pnpm vitest run packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts
```

Result:

- `3` files passed
- `13` tests passed

## Residual

- remaining active read-side pressure moves to `COL-05`
