# 2026-03-19 · v4-perf 阶段收口

## 本轮目标

- 不再新开 worktree。
- 只回收当前仍值得吸收的既有 worktree tip。
- 把“已吸收 / 不吸收 / 当前 head 分类”统一落回母线。

## 已回收

### `agent/v4-perf-docs-refresh-wave2`

- 已通过 `8c745246` 回收到母线。
- 作用：把 wave2 已吸收实现线的总览口径回写到：
  - `docs/perf/README.md`
  - `docs/perf/07-optimization-backlog-and-routing.md`
  - `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`

### `agent/v4-perf-list-rowid-gate`

- 已通过 `523eff72` 回收到母线。
- 目标：收紧 `D-4 no-trackBy commit-time updateAll gate`。
- 代码落点：
  - `packages/logix-core/src/internal/state-trait/rowid.ts`
- 直接验证：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.rowid-validation.txt`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.rowid-perf.txt`
- 当前分类：
  - `accepted_with_evidence`
- 依据：
  - 语义守门 `23 tests` 全过。
  - focused perf 对目标路径给出正收益：
    - `ModuleRuntime.transaction.listConfigsGuard` no-overlap `p50 9.512ms -> 0.065ms`
    - `no-trackby-rowid-gate validate` 在 `rows=100/300/1000` 的 `p95` 分别约 `1.79x / 4.01x / 3.04x`

## 不回收

### stale / 已被覆盖

- `agent/v4-perf-motherline-sync-20260318`
  - 含旧的 `externalStore 默认 blocker` 叙事，已被后续 `2026-03-19` current-head 口径覆盖。
- `agent/v4-perf-p0-2plus-hot-context`
  - 母线已有等价提交 `b396498d`。
- `agent/v4-perf-p1-2-2c-module-source-tick`
  - 母线已有等价提交 `1a346e3b`。
- `agent/v4-perf-p1-6-owner-aware-resolve-v2`
  - 母线已有等价提交 `088860c0`，且后续继续细化。

### docs-only / rejected

- `agent/v4-perf-p1-2-2b-module-source-txn`
  - 保留失败结论，不回收代码。
- `agent/v4-perf-p2-2b-dispatch-plan-b`
  - 保留 rejected/docs-only 结论，不回收代码。

## 当前 head 分类

本轮收口期间，母线 `probe_next_blocker --json` 出现了同批次分裂：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-next-blocker.json`
  - `blocked`
  - blocker = `externalStore.ingest.tickNotify`
  - gate = `full/off<=1.25`
  - `first_fail_level=256`
  - `max_level=128`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-r1.json`
  - `clear`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-r2.json`
  - `clear`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-r3.json`
  - `clear`

结论：

- current-head 继续按 `clear_unstable` 处理。
- `externalStore.ingest.tickNotify` 当前更像 residual gate noise / edge gate noise。
- 不把这轮单次 `blocked` 直接升级成新的默认 runtime 主线。

## 收口结论

- 本轮不再新开 worktree。
- 母线已完成阶段性回收。
- 后续若继续推进，先从当前母线 fresh probe 开始，不沿用旧 worktree 的“待回收”状态。
