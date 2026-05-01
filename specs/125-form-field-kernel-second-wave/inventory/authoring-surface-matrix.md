# Authoring Surface Matrix

| Entry | Tier | Recommended Use | Status |
| --- | --- | --- | --- |
| `Form.make` | top-level | Form DSL 主入口 | keep |
| `Form.from` | top-level | schema-scope 入口，承接 `$.rules / $.fields / $.derived` | keep |
| `Form.commands.make(...)` | helper | 作者面辅入口 | keep |
| `Form.Rule / Form.Error / Form.Path` | helper | 领域 helper | keep |
| `Form.Field.computed / link / source` | direct-api | field-kernel 直达 API | keep |
| `Form.computed / link / source` | top-level | 并行短名，不再保留 | remove |
| `Form.fields / Form.list / Form.node` | helper | field-kernel 组织入口 | helper-only |
| `Form.derived` | top-level | 退出顶层 barrel，迁到 `$.derived(...)` | legacy-exit |
| `FieldKernel.from(...)` | expert-direct-api | 底层直达 API | keep |
