# Docs Examples Exports Matrix

| Artifact Type | Path | Expected Narrative | Status |
| --- | --- | --- | --- |
| SSoT | `docs/ssot/runtime/01-public-api-spine.md` | canonical public spine | `active` |
| SSoT | `docs/ssot/runtime/03-canonical-authoring.md` | `Program.make(Module, config)` 唯一装配入口 | `active` |
| SSoT | `docs/ssot/runtime/05-logic-composition-and-override.md` | `logics: []` canonical，expert 边界单独标记 | `active` |
| examples | `examples/logix/**` 中 canonical 场景 | canonical 或明确 expert | `active` |
| examples | `examples/logix-react/**` 中 canonical 内核 examples | canonical 或明确 expert | `active` |
| exports | `packages/logix-core/src/index.ts` | 导出 `Program`，不鼓励第二装配心智 | `active` |
| user-docs | `apps/docs/content/docs/**` | 对外用户文档后续统一收口 | `deferred` |
