# Root Export Ledger: Form Logic Authoring Cutover

## Keep On Package Root

- `Form.make`
- `Form.from`
- `Form.commands`
- `Form.FormView`
- `Form.Rule`
- `Form.Error`
- `Form.Field`
- `Form.Path`
- `Form.SchemaPathMapping`
- `Form.SchemaErrorMapping`

## Remove From Package Root

- root `rules`
- root `fields`
- root `list`
- root `node`

## Notes

- root barrel 只保留 default path、domain helpers 与 expert namespaces
- 小写 field-kernel 直通口全部退出 package root
