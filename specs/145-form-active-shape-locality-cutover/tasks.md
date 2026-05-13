# Tasks: Form Active Shape Locality Cutover

**Input**: [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/145-form-active-shape-locality-cutover/plan.md)

> 本文件只做薄索引。detailed implementation plan 待进入实施阶段后再生成。

## Planned Chunks

- [x] Chunk 1: Stable row locality
- [x] Chunk 2: Cleanup and remap receipts
- [x] Chunk 3: Active exit cleanup
- [x] Chunk 4: Focused tests and typecheck

## Notes

- 零兼容、单轨实施
- 不保留 index-first locality
- 当前已落：
  - exact runtime handle 新增 `insert / update / replace / byRowId.update/remove`
  - `RowIdStoreLike` 暴露 `getIndex`
  - reducer 已支持 `arrayInsert / arrayUpdate / arrayReplace`
  - `insert/update/replace` 对 values/errors/ui 已对齐
  - `byRowId` 通过 rowIdStore 与 trackBy fallback 路由到稳定 row locality
  - focused suite 与 `pnpm typecheck` 已通过
