# Root Surface Ledger: Query Logic Contract Cutover

## Keep On Package Root

- `Query.make`
- `Query.Engine`
- `Query.TanStack`

## Move Off Package Root

- surviving declaration helpers
  - move to `@logixjs/query/Fields`

## Remove From Package Root

- `Query.fields`

## Notes

- package root 只保留 program-first output 与 integration-layer 入口
- declaration helpers 仍可存在，但不再和 root surface 并列

## Freeze Decision

| Surface | Decision | Role |
| --- | --- | --- |
| `Query.make` | keep | default program kit |
| `Query.Engine` | keep | integration layer |
| `Query.TanStack` | keep | integration layer |
| `@logixjs/query/Fields` | move | expert helper submodule |
| root `Query.fields` | remove | forbidden default path |
