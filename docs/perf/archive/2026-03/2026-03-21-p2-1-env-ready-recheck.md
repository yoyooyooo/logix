# 2026-03-21 · P2-1 env-ready fresh reopen check（docs/evidence-only）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p2-1-env-ready-recheck`
- branch：`agent/v4-perf-p2-1-env-ready-recheck`
- 唯一目标：在环境就绪前提下，对 `P2-1` 做 fresh reopen check，确认 trigger 是否真实成立。
- 禁止切口：
  - 不直接重做 `p2-1 next-stage` 半成品。
  - 不回到 queue-side 微调。

## Perf Worktree 开线裁决

- Date: `2026-03-21`
- Base branch: `v4-perf`
- Base HEAD: `fc0b3e3e`
- Current-head triage: `clear_unstable / edge_gate_noise`（见 `docs/perf/06-current-head-triage.md`）
- Current routing: 默认不开新 runtime 主线，future-only 仅 watchlist（见 `docs/perf/07-optimization-backlog-and-routing.md`）

### Trigger

- Status: `不成立`
- Type: `none`
- Evidence:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.focused-tests.txt`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.probe-next-blocker.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.validation.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.evidence.json`

结论依据：

1. 环境已就绪，focused tests 全绿，`vitest` 可执行。
2. `probe_next_blocker --json` 命中 `externalStore.ingest.tickNotify` 的 threshold 失败，`failure_kind=threshold`，`first_fail_level=256`，`max_level=128`。
3. 该失败已在 current-head triage 中归类为 `edge_gate_noise`，且不对应 `P2-1` 的 converge/lanes 唯一最小切口；本轮仍不满足开线条件。

### Default Decision

- 默认裁决：`不开新的 perf worktree`

### Override

- 是否 override：`否`
- 原因：本轮虽非 environment 失败，但触发点不指向 `P2-1` 的唯一最小切口，且属于已知 `edge_gate_noise` 轨道。

### If Not Open

- 结论：`本轮不开新的 P2-1 扩面 worktree`
- 当前分类：`discarded_or_pending`（`docs_evidence_only_watchlist_hold`）
- Watchlist only:
  - `P2-1`（converge/lanes 扩面）
  - `R-2`（public API proposal）
- Reopen conditions:
  1. `probe_next_blocker --json` 出现非 environment 且非 edge-gate-noise 的真实 blocker，并能映射到 `P2-1` 的唯一最小切口。
  2. 或出现新的 clean/comparable 证据，明确指向 `converge/lanes` 稳定 residual。
  3. 或新增产品级 SLA，要求 `P2-1` 路径进入正式预算。

## 最小验证（fresh）

1. focused tests（通过）
- 命令：
  - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts`
- 结果：通过（`Test Files 2 passed`，`Tests 5 passed`）
- 证据：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.focused-tests.txt`

2. probe（blocked_threshold）
- 命令：
  - `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=blocked`，`failure_kind=threshold`，`blocker=externalStore.ingest.tickNotify`
- 证据：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.probe-next-blocker.json`

## 本轮落盘

- `docs/perf/archive/2026-03/2026-03-21-p2-1-env-ready-recheck.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.evidence.json`
