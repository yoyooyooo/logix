# Root Surface Ledger: I18n Logic Contract Cutover

## Keep On Package Root

- `I18n`
- `I18nTag`
- `I18nSnapshotSchema`
- token contract exports

## Move Off Package Root

- surviving projection helpers
  - move to expert submodule or app-local helper

## Remove From Package Root

- package-root projection helpers
- package-root module helpers

## Notes

- root package 只保留 service-first surface
- projection 只允许停在 auxiliary or expert route

## Freeze Decision

| Surface | Decision | Tier |
| --- | --- | --- |
| `I18n` | keep | default |
| `I18nTag` | keep | default |
| `I18nSnapshotSchema` | keep | default |
| token contract exports | keep | default |
| surviving projection helpers | move | expert |
| package-root projection helpers | remove | removed |
| package-root module helpers | remove | removed |
