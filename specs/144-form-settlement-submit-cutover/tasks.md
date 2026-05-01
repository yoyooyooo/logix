# Tasks: Form Settlement Submit Cutover

**Input**: [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/144-form-settlement-submit-cutover/plan.md)

> 本文件只做薄索引。detailed implementation plan 待进入实施阶段后再生成。

## Planned Chunks

- [x] Chunk 1: Single submitAttempt path
- [x] Chunk 2: Decoded payload output-only
- [x] Chunk 3: Base-fact summary and clear triggers
- [x] Chunk 4: Focused tests and typecheck

## Notes

- 零兼容、单轨实施
- 不保留 second verdict tree
- 当前已落：
  - decode residue 显式阻塞 submit
  - submit gate 不再依赖 `errorCount` 对 `$schema` residue 的偶然行为
  - `handleSubmit` 只在 decode 成功时走 `onValid`
  - focused regression suite 与 `pnpm typecheck` 已通过
