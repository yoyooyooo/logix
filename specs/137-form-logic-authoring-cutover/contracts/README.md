# Contracts: Form Logic Authoring Cutover

## 1. Default Authoring Contract

- Form 只有一条默认作者面
- 这条路径固定为 `Form.make + Form.from(schema).logic(...)`
- `rules / derived / fields` 不再作为等权 day-one path 并列
- top-level `rules / derived` 已降级为 legacy route，并以 warning 提示迁回 `$.logic(...)`

对应 ledger：

- `form-surface-ledger.md`

## 2. Domain State Contract

- `values / errors / ui / $form` 继续属于 Form 领域层
- `validateOn / reValidateOn`、commands 继续属于 Form 领域协议
- `Form.commands.make(...)` 只停在 post-construction helper

## 3. Expert Boundary Contract

- direct `Form.Field.*` 只停在 expert route
- direct field-kernel fragments 只停在 expert route
- root 小写导出 `rules / fields / list / node` 退出 package root

对应 ledger：

- `root-export-ledger.md`
- `expert-route-ledger.md`

## 4. Docs Alignment Contract

- root exports、docs、examples、tests 必须共享同一套默认词汇
