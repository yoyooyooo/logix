# Expert Route Ledger: Form Logic Authoring Cutover

## Expert-Only Surfaces

- `$.fields(...)`
- `Form.Field.computed / link / source`
- top-level `Form.make({ fields })`
- direct field-kernel fragments

## Helper But Non-Canonical

- `$.rules(...)`
- `$.derived(...)`
- `Form.Rule.*`
- `Form.commands.make(...)`

## Notes

- helper 路由可以服务 canonical path
- expert route 可以保留，但不能回流成 day-one 主写法
- top-level `rules / derived` 已降级为 legacy route，并通过 diagnostics/artifact warnings 提示迁移到 `$.logic(...)`
