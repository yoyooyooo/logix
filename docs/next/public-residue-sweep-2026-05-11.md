# Public Residue Sweep 2026-05-11

This sweep records the 200 docs/examples public residue gate.

## Public Recipe Rule

Public recipe files and example demos must teach the single React host gate:

- `fieldValue(path)` and `fieldValues(paths)` for core-owned selector inputs
- `Form.Error.field(path)`, `Form.Companion.field(path)`, and `Form.Companion.byRowId(...)` as Form-owned selector primitives
- `useSelector(handle, selector)` as the only public read gate

They must not teach `useForm*`, `useField*`, `useCompanion`, `useFormSelector`, `@logixjs/form/react`, `Form.Source`, whole-state selector reads, or runtime topic key vocabulary.

## Allowlist Buckets

- `public recipe`: user-facing README, Agent guidance, and active examples. Old hook families and internal runtime nouns are violations here.
- `internal-only`: SSoT, standards, specs, and tests may mention internal runtime nouns when the line explicitly says they stay internal or do not enter public authoring.
- `negative-only`: pressure packets, risk notes, and exact-surface pages may mention removed forms only as forbidden shapes or residue, not as available routes.

## Playground Boundary

Playground is product witness and projection. It may consume runtime truth, control-plane reports, and project metadata, but it does not own selector law, runtime truth, diagnostic authority, or public authoring routes.
