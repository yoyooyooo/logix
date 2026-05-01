# PROJ-03 Freeze Record

## Meta

| field | value |
| --- | --- |
| artifact_kind | `freeze-record` |
| adopted_projection | `PROJ-03` |
| linked_proposal | `PROP-001` |
| owner | `coordination-main-agent` |
| status | `frozen` |

## Frozen Decision

`field-local soft fact lane` is now the planning baseline for:

- `CAP-10`
- `CAP-11`
- `CAP-12`
- `CAP-13`

with the adopted sanctioned read route:

- `useSelector(handle, Form.Companion.field(path))`

## Authority Writeback Required

`required`

Targets:

- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/ssot/form/05-public-api-families.md`

## Closed Collisions

- `COL-01`
- `COL-02`
- `COL-03`
- `COL-08`

## Remaining Risks

- `COL-04` remains open for row-owner projection under the same canonical selector gate
- exact landing path remains deferred
- diagnostics and evidence-envelope closure stay on later lanes

## Proof Obligations Satisfied

- `PF-03`
- `PF-05`
- `PF-06`
- `PF-07`
