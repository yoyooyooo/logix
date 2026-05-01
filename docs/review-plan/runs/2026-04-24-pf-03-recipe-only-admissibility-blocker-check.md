# PF-03 Recipe-only Admissibility Blocker Check

## Meta

| field | value |
| --- | --- |
| artifact_kind | `proof-blocker-check` |
| proof_id | `PF-03` |
| linked_proposal | `docs/proposals/logix-api/PROP-001-field-local-soft-fact-minimal-generator.md` |
| owner | `coordination-main-agent` |
| execution_topology | `multi-agent` |
| status | `resolved-by-reopen` |
| decision_question | `当前仓库是否已经存在不暴露 raw internal landing path 的 companion sanctioned selector recipe，从而允许 PF-03 进入 executable` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, `SC-D` |
| target_caps | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` |
| related_projections | `PROJ-03`, `PROJ-06` |
| related_collisions | `COL-04` |
| required_proofs | `PF-03`, `PF-07` |
| coverage_kernel | `minimal-generator-first`, `proof-before-authority`, `single authority`, `small public surface` |
| non_claims | public helper noun, public selector primitive, exact companion read carrier, exact landing path |

## Imported Frozen Law

- canonical host gate continues to be `useModule + useSelector(handle, selectorFn)`
- no companion-specific helper noun or selector primitive may be added in this lane
- companion read story must not require user code to depend on raw internal landing path
- `fieldValue(valuePath)` must not be expanded into companion read
- row-heavy sufficiency is already closed and no longer the active blocker

## Current Evidence

### Positive Evidence

- companion authoring and lowering are implemented and stable
- row-scoped and nested-row companion writeback behave correctly under reorder, replace, and byRowId pressure
- host gate can already consume form-owned selector primitives such as `Form.Error.field(path)`
- row identity and cleanup witnesses are executable

### Blocking Gap

- current companion reads in tests still rely on `state.ui...$companion`
- no sanctioned companion selector recipe exists that lets user code read companion facts without raw landing-path knowledge
- no public helper or selector primitive exists for companion facts
- current freezes explicitly forbid inventing such a helper or primitive inside this lane

## Decision

### Verdict

`blocked`

### Why Blocked

The host gate exists, but the admissibility contract does not. Current evidence proves authoring, lowering, and internal state landing. It does not prove a sanctioned companion read recipe that stays inside the canonical selector gate while keeping raw internal landing path out of user code.

### What This Means

- `PF-03` must not be promoted to `executable`
- `CAP-13` must not be promoted to `proven`
- `PROJ-03` remains under pressure on host-read admissibility through `COL-04`

## Accepted Status Changes

- `CAP-20 implementation_status -> implemented`
- `CAP-20 proof_status -> proven`
- `CAP-22 implementation_status -> implemented`
- `CAP-23 implementation_status -> implemented`
- `IE-05 implementation_status -> implemented`
- `CAP-13 proof_status -> conditional`
- `PF-03 gate_status -> blocked`

## Verification Used

```bash
pnpm vitest run packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts packages/logix-form/test/Form/Form.CleanupReceipt.Witness.test.ts packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx
```

Result:

- `3` files passed
- `14` tests passed

## Next Action

Open the smallest sanctioned companion selector recipe decision packet, or explicitly reopen the authority target that must own this read contract.

## Post Execution Note

This blocker has since been resolved by adopting:

- `Form.Companion.field(path)`

Current outcome:

- `PF-03` is now executable
- `CAP-13` is proven for sanctioned field-path companion reads
- the remaining open work moved from `PF-03` to `COL-04` row-owner projection
