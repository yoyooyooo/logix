# Tasks: Form Validation Bridge Cutover

**Input**: [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/142-form-validation-bridge-cutover/plan.md)

> 本文件只做薄索引。detailed implementation plan 待进入实施阶段后再生成。

## Planned Chunks

- [x] Chunk 1: Normalize decode facts
- [x] Chunk 2: Submit-only decode gate
- [x] Chunk 3: Path-first lowering and submit fallback
- [x] Chunk 4: Focused tests and typecheck

## Notes

- 零兼容、单轨实施
- 不保留 pre-submit structural decode route
- 当前已落：
  - `SchemaPathMapping` 不再从 `issues / errors` 多 vocabulary 猜 path
  - `form.validate()` 与 `validatePaths()` 不再触发 structural decode
  - `SchemaErrorMapping` 支持 path-first lowering + submit fallback
  - 默认 leaf 不再写 raw schema object
