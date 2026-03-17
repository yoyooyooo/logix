# 2026-03-20 · P1-3R fresh reopen check（docs/evidence-only）

## 目标与约束

- 基线：`P1-3R reopen-plan` 已定义唯一允许切口为 `batched accessor reuse`。
- 唯一目标：判断当前母线是否满足重开 `P1-3R` 条件。
- 本轮约束：
  - 禁止重做 `draft primitive`、`large-batch-only`、`raw direct fallback`
  - 禁止引入 batch 阈值分叉
  - 禁止改 public API
  - 仅执行最小验证命令，按结果做开线裁决

## Perf Worktree 开线裁决

- Date: `2026-03-20`
- Base branch: `v4-perf`
- Base HEAD: `e97ec6d3`
- Current-head triage: `clear_unstable / edge_gate_noise`（`docs/perf/06-current-head-triage.md`）
- Current routing: 默认不开新的 runtime 主线，watchlist only（`docs/perf/07-optimization-backlog-and-routing.md`）

### Trigger

- Status: `不成立`
- Type: `none`
- Evidence:
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.focused-tests.txt`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.probe-next-blocker.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.validation.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.evidence.json`

触发门判定：

1. 触发门 1（externalStore 主要固定税）本轮无法成立，`probe_next_blocker` 在第一个 suite 即因 environment 阻塞停止。
2. 触发门 2（最小语义切口）在母线代码形态上成立，`external-store.ts` 已存在 batched accessor reuse（历史提交 `71bb1b9a`）。
3. 触发门 3（两条最小语义门 + probe 全绿）本轮不成立，命中 `vitest` 缺失与 `node_modules missing`。

### Default Decision

- 默认裁决：`不开新的 perf worktree`

### Override

- 是否 override：`否`
- 原因：无可用 trigger

### If Not Open

- 结论：`本轮不开新的 P1-3R 实施线`
- 当前分类：`discarded_or_pending`（`docs_evidence_only_watchlist_hold`）
- Watchlist only:
  - `P1-3R`
  - `P2-1`
  - `R-2`
- Reopen conditions:
  1. 先修复环境并复跑最小验证，消除 `failure_kind=environment`。
  2. `probe_next_blocker --json` 出现非 environment 的真实 blocker，且失败不属于已知 suite/display drift。
  3. 在 clean/comparable 证据中再次确认 externalStore batched writeback 为 top 级固定税。
  4. 保持唯一允许切口，且继续满足无阈值分叉、无 draft primitive、无 direct fallback。

## 最小验证（fresh）

1. focused tests（环境阻塞）
- 命令：
  - `pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts test/internal/Runtime/ModuleAsSource.tick.test.ts`
- 结果：失败，`Command "vitest" not found`
- 证据：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.focused-tests.txt`

2. probe（环境阻塞）
- 命令：
  - `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=blocked`，`failure_kind=environment`
- 证据：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.probe-next-blocker.json`

## 母线状态核对

- `packages/logix-core/src/internal/state-trait/external-store.ts` 已包含唯一允许切口：
  - batched read 使用 `req.accessor.get(prevState)`（line 203）
  - batched write 使用 `request.accessor.set(draft, request.nextValue)`（line 213）
- 关联历史提交：`71bb1b9ad916d45566006266029f9158a6c362e6`（`perf(state-trait): reuse accessor in batched externalStore writeback`）

## 本轮落盘

- `docs/perf/archive/2026-03/2026-03-20-p1-3r-reopen-check.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.evidence.json`
