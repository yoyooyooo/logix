# Tasks: Form Canonical Error Carrier Cutover

**Input**: [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/143-form-canonical-error-carrier-cutover/plan.md)

> 本文件只做薄索引。detailed implementation plan 待进入实施阶段后再生成。

## Planned Chunks

- [x] Chunk 1: Canonical leaf definition
- [x] Chunk 2: Reducer and command write path cleanup
- [x] Chunk 3: Error counting cleanup
- [x] Chunk 4: Focused tests and typecheck

## Notes

- 零兼容、单轨实施
- 不保留 dual-write 和旧 leaf 并存
- 当前已落：
  - canonical leaf guard 与 `Form.Error.leaf(...)`
  - string / raw object leaf 退出 canonical count
  - `$schema` residue 退出 canonical count
  - `setError(...)` 测试调用面切到 canonical leaf
  - focused suite 与 `pnpm typecheck` 已通过
