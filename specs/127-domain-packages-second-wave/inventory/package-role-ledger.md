# Package Role Ledger

| Package | Role | Package Shape | Retained Capabilities | Notes |
| --- | --- | --- | --- | --- |
| `@logixjs/query` | program-first | direct-package | `make / fields / Engine / TanStack` | root 不再额外暴露 `source` 短名 |
| `@logixjs/i18n` | service-first | direct-package | `I18n / I18nTag / I18nSnapshotSchema / Token` | service + token contract |
| `@logixjs/domain` | program-first | pattern-kit-wrapper | `@logixjs/domain/Crud.make(...)` | root package 只保留类型与薄 barrel；类型口径收敛到 `CrudProgram` |
