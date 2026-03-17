# 2026-03-22 · React controlplane Stage G6 ControlplaneKernel v1（accepted_with_evidence）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.react-controlplane-stage-g6-kernel-v1`
- branch：`agent/v4-perf-react-controlplane-stage-g6-kernel-v1`
- 唯一目标：在 `G5 kernel v0` 基线上，把所有 `config snapshot confirm` 触发统一纳入 owner ticket 规则
- 写入范围：
  - `packages/logix-react/src/internal/provider/**`
  - `packages/logix-react/test/RuntimeProvider/**`
  - `docs/perf/**`
  - `specs/103-effect-v4-forward-cutover/perf/**`
- 禁区：
  - 不改 `packages/logix-core/**`
  - 不改 public API

## 实施摘要

1. `ControlplaneKernel v1` 统一入口
- 新增 `requestConfigConfirm(ownerKey, cause, currentFingerprint)`，覆盖 `boot-confirm`、`ready-confirm`、`config-boot-owner-lock`、`neutral-settled-refresh-allowed` 四类触发。
- 保留 `G5` 语义：`neutral-settled-refresh-allowed + same fingerprint` 直接 `skip`。
- `commitTicket` 改为返回结构化结果，显式区分 `ticket-committed` 与 `ticket-expired`。

2. RuntimeProvider 全触发接线
- 原先只在 `config + ready + neutral-settled-refresh-allowed` 路径取 ticket。
- 本轮扩展为 phase-machine 所有 `action=run` 的 config snapshot confirm 都走 kernel ticket。
- shadow stale 事件新增过期 reason 码：`staleReason=kernel-ticket-expired`，`reasonCode=react.controlplane.kernel.ticket.expired`。

3. phase-trace 断言扩面
- 在 `dedupes configLane ready refresh...` 用例中补齐：
  - `runtime.layer-bound + config` 的 `resolve-commit` 计数稳定为 1
  - `ownerKey + epoch` 唯一键计数稳定为 1
- 新增 `ControlplaneKernel v1` 规则用例，覆盖过期 ticket 回写 reason。

## 最小验证命令与结果

```bash
pnpm --filter @logixjs/react typecheck:test
pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks
python3 fabfile.py probe_next_blocker --json
```

结果：

1. `typecheck:test`：通过
2. `runtime-bootresolve-phase-trace`：通过（`8 tests passed`）
3. `probe_next_blocker --json`：
- 首轮 `r1`：`status=blocked`，`failure_kind=threshold`，异常点为 `form.listScopeCheck / auto<=full*1.05 / first_fail_level=10`
- 复跑 `r2`：`status=clear`，`threshold_anomalies=[]`

## 裁决

- 结果分类：`accepted_with_evidence`
- accepted_with_evidence：`true`
- 结论依据：
  - G6 唯一目标已落地，`config snapshot confirm` 全触发路径统一纳入 owner ticket 规则
  - phase-trace 锚点满足“同 ownerKey 同 epoch commit 唯一”与“过期 ticket reason 码”
  - 最小验证链路通过，probe 首轮波动在既有 gate 噪声口径内，复跑同口径恢复 `clear`

## 证据工件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.probe-next-blocker.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.summary.md`
