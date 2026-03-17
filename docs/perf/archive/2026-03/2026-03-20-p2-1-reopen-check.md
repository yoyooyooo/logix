# 2026-03-20 · P2-1 fresh reopen check（docs/evidence-only）

## 目标与约束

- 基线：`P2-1A/P2-1B` 已吸收，`P2-1 next-stage` 已按 docs/evidence-only 收口。
- 唯一目标：判断当前母线是否满足重开 `P2-1` 下一扩面的条件。
- 禁止切口：
  - 不直接重做 `p2-1 next-stage` 半成品。
  - 不回到 queue-side 微调。

## Perf Worktree 开线裁决

- Date: `2026-03-20`
- Base branch: `v4-perf`
- Base HEAD: `2a3a99fe`
- Current-head triage: `clear_unstable / edge_gate_noise`（见 `docs/perf/06-current-head-triage.md`）
- Current routing: 默认不开新 runtime 主线，future-only 仅 watchlist（见 `docs/perf/07-optimization-backlog-and-routing.md`）

### Trigger

- Status: `不成立`
- Type: `none`
- Evidence:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.focused-tests.txt`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.probe-next-blocker.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.validation.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.evidence.json`

结论依据：

1. focused tests 命令未执行到测试逻辑，直接因 `vitest` 缺失失败。
2. `probe_next_blocker` 的失败类型是 `environment`，对应 `node_modules missing / vitest not found`。
3. 按 `09` 模板，environment 失败属于禁止开线场景。

### Default Decision

- 默认裁决：`不开新的 perf worktree`

### Override

- 是否 override：`否`
- 原因：无可用 trigger

### If Not Open

- 结论：`本轮不开新的 P2-1 扩面 worktree`
- 当前分类：`discarded_or_pending`（`docs_evidence_only_watchlist_hold`）
- Watchlist only:
  - `P2-1`（converge/lanes 扩面）
  - `R-2`（public API proposal）
- Reopen conditions:
  1. 先补齐运行环境并复跑最小验证，消除 `failure_kind=environment`。
  2. `probe_next_blocker --json` 出现非 environment 的真实 blocker，且失败不属于已知 suite/display drift。
  3. 或出现新的 clean/comparable 证据，明确指向 `converge/lanes` 稳定 residual。
  4. 或新增产品级 SLA，要求把当前未覆盖税点纳入正式预算。

## 最小验证（fresh）

1. focused tests（环境阻塞）
- 命令：
  - `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/observability/TxnLaneEvidence.Schema.test.ts`
- 结果：失败，`Command "vitest" not found`
- 证据：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.focused-tests.txt`

2. probe（环境阻塞）
- 命令：
  - `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=blocked`，`failure_kind=environment`
- 证据：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.probe-next-blocker.json`

## 本轮落盘

- `docs/perf/archive/2026-03/2026-03-20-p2-1-reopen-check.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.evidence.json`
