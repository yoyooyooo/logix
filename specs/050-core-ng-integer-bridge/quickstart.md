# Quickstart: 050 Integer Bridge（怎么用）

## 1) 050 的核心目标是什么？

- 事务窗口内不再做字符串解析往返（join/split）。
- 执行 loop 只用 id/访问器表驱动，不出现半成品态默认化。
- 用 Node + Browser 证据门禁证明“纯赚且无回归”。

## 2) 050 与 039 的关系？

- 039 是“当前内核够硬”的整型化主线，已经包含关键 guardrails（split/join 禁区、recordPatch 零分配、pathAsArray 透传）。
- 050 把这些 guardrails 作为 core-ng 路线的显式目标与拆分 spec：便于在 core-ng 里复用同口径与证据门禁。

## 3) 下一步做什么？

- 按 `specs/050-core-ng-integer-bridge/tasks.md` 推进契约放宽与执行链路改造，并落盘证据。
- 证据口径以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT；交付结论必须 `profile=default`（或 `soak`），且 `pnpm perf diff` 满足 `comparable=true && regressions==0`。
- perf evidence 允许在 dev 工作区（git dirty）采集，但必须确保 `matrix/config/env` 一致，并在 diff 中保留 `git.dirty.*` warnings；若出现 `stabilityWarning` 或结论存疑，必须复测（必要时升级到 `profile=soak`）。
- 零分配收口与 diagnostics=off 全局闸门分别由 `specs/051-core-ng-txn-zero-alloc/`、`specs/052-core-ng-diagnostics-off-gate/` 收口（避免在 050 重复投入）。

## 4) 能做到全整型吗？

- 可以做到“热路径全整型”：converge 的 plan/exec loop 以 `FieldPathId/StepId` + TypedArray 驱动，事务窗口内禁止 `id→string→split` 与 `join→split` 往返。
- 做不到、也不应追求“全域全整型”：输入/显示/序列化边界仍会接收/输出字符串；`diagnostics=light/full` 才会 materialize 可读映射；动态/异常路径会显式降级 `dirtyAll=true`（且在 perf gate 覆盖场景中视为 FAIL）。

## 5) 当前证据结论（Node + Browser）

> 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true && summary.regressions==0`。

- Node `converge.txnCommit`：PASS（diff=0 回归）
  - `specs/050-core-ng-integer-bridge/perf/diff.node.372a89d7__worktree.darwin-arm64.default.json`
- Browser `converge.txnCommit`（converge-only）：PASS（diff=0 回归）
  - `specs/050-core-ng-integer-bridge/perf/diff.browser.converge.txnCommit.372a89d7__dev.darwin-arm64.default.json`
- 备注：上述对比均带 `git.dirty.*` 警告；如需更“干净”的证据，可在确认工作区可切换后再复测补齐。
