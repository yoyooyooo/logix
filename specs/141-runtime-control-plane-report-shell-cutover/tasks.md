# Tasks: Runtime Control Plane Report Shell Cutover

**Input**: [plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/plan.md)
**Detailed Plan**: [2026-04-16-runtime-control-plane-report-shell-cutover.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-16-runtime-control-plane-report-shell-cutover.md)

> 本文件只做薄索引、状态与验收入口，不复制 detailed implementation steps。

## Chunks

- [x] Chunk 1: Core contract shell
- [x] Chunk 2: CLI shared adapter
- [x] Chunk 3: Stage emit paths
- [x] Chunk 4: Cross-contract lock
- [x] Chunk 5: Thin index self-check

## Order

1. Chunk 1
2. Chunk 2
3. Chunk 3
4. Chunk 4
5. Chunk 5

## Verification

- [quickstart.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/141-runtime-control-plane-report-shell-cutover/quickstart.md)

## Notes

- 零兼容、单轨实施
- 禁止 dual-write、shadow path、旧 shell 并存
- 当前已落：
  - `VerificationControlPlaneReport` 单一 payload kind
  - coordinate-first `focusRef`
  - `relatedArtifactOutputKeys`
  - `artifact.role` 删除
  - CLI check/trial/compare emit path 对齐
- public `Runtime.trial` 已切到 canonical shell
- rich report consumer 已分流：
  - public consumer 改用 canonical shell
  - internal detail consumer 改用 `trialRunModule`
