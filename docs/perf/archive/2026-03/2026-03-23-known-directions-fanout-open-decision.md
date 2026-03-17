# 2026-03-23 · known directions fanout open decision

## Perf Worktree 开线裁决

- Date: `2026-03-23`
- Base branch: `v4-perf`
- Base HEAD: `f8d015b5`
- Current-head triage: `默认 runtime 主线仍为空；今天的 form.listScopeCheck 单次 threshold 异常在单测复跑后未复现，当前仍按 gate 噪声处理。`
- Current routing: `P1-4F`、`P1-6''`、`N-3` 已进入 implementation-ready；`SW-N3` 处于 merged_but_provisional，待首轮正式可比工件；`R-2` 仍卡外部 SLA。`

### Trigger

- Status: `成立`
- Type: `known high-yield directions already implementation-ready`
- Evidence:
  - `docs/perf/2026-03-22-p1-4f-single-pulse-contract-freeze-v2.md`
  - `docs/perf/2026-03-22-p1-6pp-owner-resolve-engine-contract-freeze.md`
  - `docs/perf/2026-03-22-n-3-contract-freeze.md`
  - `docs/perf/2026-03-22-sw-n3-degradation-ledger-impl.md`
  - `python3 fabfile.py probe_next_blocker --json`

### Default Decision

- 默认裁决：`不开新的 perf worktree`

### Override

- 是否 override：`是`
- 原因：`07` 中已有已知高收益方向达到 implementation-ready，且用户明确要求先把已知方向消化。`

### Fanout 分组

#### Group A

- Worktree: `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-6pp-owner-resolve-impl-20260323`
- Branch: `agent/v4-perf-p1-6pp-owner-resolve-impl-20260323`
- Cut: `P1-6'' owner-aware resolve engine`
- Type: `implementation`
- Scope:
  - 改：`packages/logix-react/src/internal/provider/**`、`packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
  - 不改：`packages/logix-core/**`、public API

#### Group B

- Worktree: `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-4f-single-pulse-impl-20260323`
- Branch: `agent/v4-perf-p1-4f-single-pulse-impl-20260323`
- Cut: `P1-4F single pulse contract`
- Type: `implementation`
- Scope:
  - 改：`TickScheduler/RuntimeStore/RuntimeExternalStore/useSelector` 及其最小验证测试
  - 不改：`packages/logix-react/src/internal/provider/**`、public API

#### Group C

- Worktree: `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.sw-n3-evidence-20260323`
- Branch: `agent/v4-perf-sw-n3-evidence-20260323`
- Cut: `SW-N3 evidence closeout`
- Type: `implementation/evidence`
- Scope:
  - 改：`packages/logix-devtools-react/src/internal/state/**`、相关测试、`docs/perf/**`、`specs/103-effect-v4-forward-cutover/perf/**`
  - 不改：默认不改 `packages/logix-core/**`

#### Group D

- Cut: `N-3 runtime-shell attribution`
- Type: `implementation`
- Status: `queued_after_hot-core-conflict`
- 原因：`P1-4F` 与 `N-3` 都会进入 `packages/logix-core/src/internal/runtime/core/**` 的结构线，本轮按冲突域串行，不并行落代码。

#### Blocked

- Cut: `R2-U PolicyPlan contract reorder`
- Status: `not-opened`
- 原因：外部 `SLA-R2` 实值输入仍未提供，`Gate-A/B/E` 未满足。

### Fallback 说明

- 平台 `spawn_agent` 已尝试用于 `P1-6''`、`P1-4F`、`SW-N3` 三条线。
- 本轮主会话观察到 worker 长时间未形成可见落盘，随后执行 shutdown。
- 回退结论：
  - 先由主会话统一修正 `docs/perf/README.md` 与 `docs/perf/07-optimization-backlog-and-routing.md` 的状态漂移。
  - 后续实施线改为主会话最小本地动作接管，仍保持 worktree 隔离。

### 当前结论

- 本轮已正式进入 fanout。
- 当前可直接消费的 ready 方向为：`P1-6''`、`P1-4F`、`N-3`。
- `SW-N3` 当前优先目标不是再做新结构改造，而是把 `degradeRatio / degradeUnknownShare` 的首轮可比工件补齐。
- `R-2` 保持 watchlist only。

## 结果更新

- `P1-6''`：已在独立 implementation line 完成并 `accepted_with_evidence`
- `P1-4F`：已在独立 implementation line 完成并 `accepted_with_evidence`
- `SW-N3 evidence closeout`：已在独立 evidence line 完成并 `accepted_with_evidence`
- `N-3`：已在独立 implementation line 完成并 `accepted_with_evidence`
- 当前剩余 still-open 高收益方向收敛为：`P1-3R`、`P2-1`、`SW-N2`、`R-2`
