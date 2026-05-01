# Boundary Map

| Capability | Layer | Entry | Notes |
| --- | --- | --- | --- |
| `errors / ui / touched / canSubmit` | `form-dsl` | `Form.make`, hooks, commands | 继续留在领域 DSL |
| `commands` | `form-dsl` | `Form.commands.make(...)` | 明确辅入口，不回 direct API |
| `computed / source / link / patchPaths / rowId` | `field-kernel` | `Form.Field.*`, `FieldKernel.from(...)` | 底层能力面 |
| `derived` authoring sugar | `form-dsl` | `$.derived(...)` | 退出顶层 barrel |
