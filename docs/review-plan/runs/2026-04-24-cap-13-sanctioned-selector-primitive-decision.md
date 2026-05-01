# CAP-13 Sanctioned Selector Primitive Decision

## Meta

| field | value |
| --- | --- |
| artifact_kind | `reopen-decision` |
| target_cap | `CAP-13` |
| linked_collision | `COL-04` |
| linked_proposal | `docs/proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md` |
| owner | `coordination-main-agent` |
| execution_topology | `multi-agent` |
| status | `adopted` |
| decision_question | `在 recipe-only route 无法证明 companion selector admissibility 的前提下，最小 sanctioned reopen 应该落到哪里` |

## Decision

Adopt the smallest form-owned selector primitive:

- `Form.Companion.field(path)`

Consumption stays fixed at:

- `useSelector(handle, Form.Companion.field(path))`

## Why This Path

- it stays inside the canonical host gate
- it does not add a second host family
- it does not expand `fieldValue(valuePath)`
- it keeps owner in the Form domain, not in core helper space
- it closes the raw landing-path leak for sanctioned companion reads

## Explicit Rejections

- no companion public helper under `@logixjs/react`
- no companion host hook family
- no `fieldValue(valuePath)` expansion into companion reads
- no exact `ui` landing path authority
- no executable selector token outside `useSelector`

## Writeback Targets

- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/ssot/form/05-public-api-families.md`
- `specs/157-form-field-path/spec.md`
- `specs/157-form-field-path/plan.md`
- `specs/157-form-field-path/discussion.md`
- `specs/157-form-field-path/tasks.md`

## Verification Used

```bash
pnpm vitest run packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx
```

Result:

- `2` files passed
- `4` tests passed

## Residual

- row-owner projection through sanctioned selector route remains a separate open item under `COL-04`
