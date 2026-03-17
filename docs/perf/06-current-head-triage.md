# 06 · Current-Head Triage（识别优先）

本文件是 current-head 的四分法裁决页。

目标不是统计谁红得最多，而是回答五个更重要的问题：
- 现在是否还存在默认 runtime 主线
- 哪些更像 benchmark / 计时语义问题
- 哪些只是 gate / tooling 表达问题
- 哪些已经被 targeted 复核或 blocker probe 清空
- 后续还剩哪些值得单开 worktree 的方向

## 前提

1. `S-10` 已把 `txnLanes.urgentBacklog` 改成 `nativeCapture -> MutationObserver DOM stable` 语义，并在 clean-head verify 后关闭了 `R-1` queue-side runtime 主线。
2. `S-11` 在独立 worktree 中重新执行了 `probe_next_blocker`，目标不是继续砍内核，而是确认 `S-10` 之后 current-head 是否还存在新的默认 browser/runtime blocker。
3. 本页优先采信 `S-10` 的 targeted 收口证据、`S-1/S-4/S-7` 的 targeted audit，以及 `S-11` 的 real probe；旧 broad residual 只作为背景，不再单独驱动新 runtime 线。

## 当前证据锚点

- `docs/perf/archive/2026-03/2026-03-06-s10-txn-lanes-native-anchor.md`
- `docs/perf/archive/2026-03/2026-03-06-s11-post-s10-blocker-probe.md`
- `docs/perf/archive/2026-03/2026-03-14-c7-current-head-reprobe-clear.md`
- `docs/perf/2026-03-19-current-probe-stability-v2.md`
- `docs/perf/archive/2026-03/2026-03-19-current-head-reprobe-post-p1-2-2c.md`
- `docs/perf/archive/2026-03/2026-03-19-current-head-reprobe-wave5.md`
- `docs/perf/archive/2026-03/2026-03-20-externalstore-threshold-localize-v3.md`
- `docs/perf/archive/2026-03/2026-03-21-externalstore-threshold-localize-v4.md`
- `docs/perf/2026-03-20-r2-public-api-proposal.md`
- `docs/perf/2026-03-21-r2-public-api-staging-plan.md`
- `docs/perf/archive/2026-03/2026-03-23-current-head-probe-refresh-and-state-trait-gate-audit.md`
- `docs/perf/2026-03-19-v4-perf-stage-closeout.md`
- `docs/perf/archive/2026-03/2026-03-19-list-rowid-gate.md`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.recheck.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.confirm.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r3.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r4.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r5.json`
- `python3 fabfile.py probe_next_blocker`
- `python3 fabfile.py probe_next_blocker --json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r3.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r4.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r5.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r3.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r4.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r5.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave5.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave5.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave5.r3.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave5.r4.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave5.r5.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-externalstore-threshold-localize-v3.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-externalstore-threshold-localize-v3.probe-wave.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-externalstore-threshold-localize-v3.focused-wave.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.probe-wave.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.probe-mixed-scan.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.focused-wave.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r3.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r4.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r5.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r6.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r7.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-current-head-probe-refresh.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-state-trait-single-field-gate-audit.evidence.json`
- `docs/perf/archive/2026-03/2026-03-20-p2-1-reopen-check.md`
- `docs/perf/archive/2026-03/2026-03-21-p2-1-env-ready-recheck.md`
- `docs/perf/archive/2026-03/2026-03-20-p1-3r-reopen-check.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p2-1-reopen-check.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p2-1-env-ready-recheck.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.focused-tests.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-3r-reopen-check.validation.json`
- `docs/perf/archive/2026-03/2026-03-20-p0-1plus-dispatch-shell-recheck.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.wave5.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-v4-perf-stage-closeout.probe-r3.json`

## 当前结论摘要

1. current-head 当前 blocker plane 为 `clear`，保留 soft watch，不再维持 `clear_unstable`。
- `2026-03-22` 的 `D-5-min` 已把 `externalStore.ingest.tickNotify / full/off<=1.25` 重分层为 `gateClass=soft`，`probe_next_blocker --json` 只把 `hard` 阈值异常当 blocker。
- 当前默认 blocker plane 已清空；历史 `clear/blocked` 摆动样本继续作为 pre-D-5 的背景证据保留。

2. `txnLanes` 继续保持关闭结论，不再回到默认 blocker 队列。
- `S-10` 已证明 native-anchor 语义下 `urgent.p95<=50ms` 在 `mode=default/off` 都能稳定通过到 `steps=2000`。
- `S-11` 还额外暴露出旧 `-t "...(mode matrix)"` 命令会因为 Vitest regex 语义把目标测试记成 `skipped`；因此 `txnLanes` 更不应继续留在默认 probe 队列里。

3. remaining targeted gates 里，`externalStore` 仍保留 clear/blocked 摆动。
- `externalStore.ingest.tickNotify`：历史 targeted residual audit 已关闭，但 `stage-closeout` 同批次 probe 再次出现 `blocked + clear + clear + clear` 摆动；继续归入 residual gate noise，不单开新的 runtime 线。
- `2026-03-20-externalstore-threshold-localize-v3` 在 fresh wave（5 轮）里再次出现 `2 blocked + 3 clear`，失败仍集中在 `full/off<=1.25` 的 `first_fail_level=128`；本轮按 `edge_gate_noise` 收口并保持 docs/evidence-only。
- `2026-03-21-externalstore-threshold-localize-v4` 在同一批次里再次同时出现 `blocked(first_fail_level=128)` 与 `clear`；`probe-wave` 出现 `5 clear`，`probe-mixed-scan` 2 轮就出现 `clear + blocked(first_fail_level=256)`，focused 7 轮失败层级在 `128/256/512` 漂移；本轮继续按 `edge_gate_noise` 收口并保持 docs/evidence-only。
- `2026-03-21-r2-gate-c-stability-recheck` 在 `agent/v4-perf-r2-gate-c-stability-recheck` 上复核 7 轮，结果 `4 clear + 3 blocked`；`blocked` 全部仍是 `externalStore.ingest.tickNotify / full/off<=1.25`，失败层级在 `128/256`。该漂移不足以单独阻塞 `R-2 Gate-C`。
- `runtimeStore.noTearing.tickNotify`：`S-4` 最小修复已吸收，最新 `probe-r1/r2/r3` 继续通过。
- `form.listScopeCheck`：最新 `probe-r1/r2/r3` 继续通过。
- `2026-03-23-current-head-probe-refresh-and-state-trait-gate-audit` 再次确认 current-head `probe_next_blocker=clear`；`StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off` 的 isolated replay 5 轮全过，`multi-8 ratio` 维持在 `0.968 ~ 1.008`，当前只按 full-suite 负载敏感 gate 噪声处理。

4. list/rowid 的 `D-4` 已吸收；剩余默认只保留架构候选。
- `2026-03-19-list-rowid-gate.md` 已把 `no-trackBy commit-time updateAll gate` 收口到母线，并补齐 focused rowid perf 与语义守门。
- `S-14` 已把 `watchers.clickToPaint` 的旧 `clickToHandler` 再拆成 `clickInvokeToNativeCapture + nativeCaptureToHandler`，并确认 dominant phase 是页面外 click 注入税；`S-2` 整条 benchmark 解释链已收口，不再是待排期候选。
- `C-6` 已确认 `react.bootResolve.sync` 的旧“小固定税”主要来自 RAF 轮询地板；当前不再把它当作 runtime watchlist。
- `C-7` 又在 current-head 上重新执行了 `probe_next_blocker --json`，结果继续是 `clear`。
- `C-8(v2)` 在独立 worktree 上做了稳定性审计，出现 `4 clear + 1 blocked`，该轮分类为 `clear_unstable`。
- `C-9` 在 `post-p1-2-2c` 独立 worktree 上重新执行 fresh reprobe，连续 5 轮 `probe_next_blocker --json` 全部 `clear`，分类更新为 `clear_stable`。
- `C-10(wave5)` 在当前母线 HEAD（含 reactbridge cleanup）独立 worktree 上 fresh 连跑 5 轮，`r1~r5` 全部 `clear`，`clear_stable` 结论再次确认。
- `C-11(stage-closeout)` 在当前母线阶段收口时又记录到 `1 blocked + 3 clear`；因此对外只保留 `clear_unstable`，不再写成稳定清空。
- `C-12(externalstore-threshold-localize-v3)` 在独立 worktree fresh 复核后确认 `5 轮中 2 blocked`，且失败仍是同一阈值切口；本轮不保留实现改动，仅保留 docs/evidence-only。
- `C-13(p2-1 fresh reopen check)` 在 `agent/v4-perf-p2-1-reopen-check` 上执行最小验证时命中 `failure_kind=environment`，触发器不成立，按 docs/evidence-only 收口，`P2-1` 继续仅保留 watchlist。
- `C-14(p1-3r fresh reopen check)` 在 `agent/v4-perf-p1-3r-reopen-check` 上执行最小验证时命中 `failure_kind=environment`，触发器不成立，按 docs/evidence-only 收口，`P1-3R` 继续仅保留 watchlist。
- `C-15(p0-1plus dispatch-shell fresh recheck)` 在 `agent/v4-perf-p0-1plus-dispatch-shell-recheck` 上完成 5 轮同口径重采样，`dispatch.p95` 与 `residual.avg` 相对 `P0-1+` 锚点未恶化，`probe_next_blocker` 继续 `clear`；本轮按 docs/evidence-only 关闭，不新开实现线。
- `C-16(externalstore-threshold-localize-v4)` 在 `agent/v4-perf-externalstore-threshold-localize-v4` 上 fresh 复核后再次观察到同批次 `blocked/clear` 并存与失败层级漂移；当前继续维持 `clear_unstable + edge_gate_noise`，本轮不保留实现改动，仅保留 docs/evidence-only。
- `C-17(p2-1 env-ready fresh reopen check)` 在 `agent/v4-perf-p2-1-env-ready-recheck` 上确认环境已就绪（focused tests 全绿），但 `probe_next_blocker` 命中 `externalStore.ingest.tickNotify` 的 threshold 失败（`first_fail_level=256`）；该失败仍归类 `edge_gate_noise` 且不映射到 `P2-1` 唯一最小切口，本轮继续 docs/evidence-only，`P2-1` 维持 watchlist。
- `C-17(R2 Gate-C stability recheck)` 在 `agent/v4-perf-r2-gate-c-stability-recheck` 上完成 7 轮复核。相对 `v4-perf@fc0b3e3e` 的单点 `blocked`，当前结果是 `4 clear + 3 blocked`；阻塞切口未变化且与 `TxnLanePolicy` public surface 无直接相关。裁决更新为 `Gate-C 可比性通过`，`R-2` 继续 watchlist（等待 Gate-A/B；触发口径见 `docs/perf/2026-03-21-r2-gate-ab-trigger-scout.md`）。
- `C-18(p1-3r env-ready impl-check v2)` 在 `agent/v4-perf-p1-3r-env-ready-impl-check-v2` 上先补齐环境并复跑 reopen-plan 的最小验证。focused tests 全绿且 `probe_next_blocker --json` 为 `clear`；但 reopen-plan 的 trigger1（externalStore batched writeback 再次成为 top 固定税）仍无法成立，因此本轮继续 docs/evidence-only，`P1-3R` 维持 watchlist。
- `C-20b(state-trait single-field gate audit refresh)` 在母线对 `StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off` 做 current-head refresh：新的 `probe_next_blocker --json` 仍为 `clear`，isolated replay 5 轮全过，`multi-8 ratio` 维持在 `0.968 ~ 1.008`。当前继续判定为 full-suite 负载敏感 gate 噪声，不触发 `SW-N2` 实现线。
- 架构候选：`R-2`，只有在出现新的产品级 SLA 或新的 native-anchor 证据时，才讨论 `TxnLanePolicy` API vNext；触发门以 `docs/perf/2026-03-20-r2-public-api-proposal.md` 为基线，分阶段 gate 与开线判定以 `docs/perf/2026-03-21-r2-public-api-staging-plan.md` 为执行口径。

## 四分法裁决

### 1. 真实运行时瓶颈

- 当前没有默认 runtime 主线。
- `R-1` 已由 `S-10` 关闭，`S-11` 也没有识别出新的 current-head 第一失败项。
- `externalStore.ingest.tickNotify` 的 latest split 仍按 residual gate noise 处理。

### 2. 证据语义错误 / benchmark 候选

- `watchers.clickToPaint`
- 原因：它仍更像 browser floor / suite 语义混入，而不是 current-head 的 runtime blocker。
- 裁决：`S-12` / `S-13` 已补齐并前置 same-sample phase evidence，`S-14` 又把旧 `clickToHandler` 拆成 `clickInvokeToNativeCapture + nativeCaptureToHandler`；当前证据明确显示 dominant phase 是页面外 click 注入税（`~34-36ms / 64-66%`），页面内 `nativeCapture->handler` 基本为 `0ms`，后续禁止再用 `watchers.clickToPaint - watchers.clickToDomStable` 的跨 suite 聚合差值解释红样本。

### 3. 门禁 / tooling 注意项

- `txnLanes` 的旧 `-t "browser txn lanes: urgent p95 under non-urgent backlog (mode matrix)"` 命令依赖未转义括号的 regex，会把目标测试记成 `skipped`。
- `converge.txnCommit` 的 `reason=notApplicable` 已由 `S-3` 从真实性能失败视图剥离，不再是当前 blocker。
- `externalStore.ingest.tickNotify` 的历史 clear/blocked 摆动已由 `D-5-min` 从 blocker plane 移到 soft watch；当前只保留观测，不再直接指向新的 runtime 实现线。
- `StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off` 当前只在 full-suite 下出现过单点失败；最新 isolated replay 5 轮全过，`multi-8<=1.08` 没有复现越门。当前只允许把它视作 `SW-N2` 的 watch gate，不得直接当作新的 runtime blocker。
- `externalStore.ingest.tickNotify` 在 `2026-03-20-externalstore-threshold-localize-v3` 的 fresh wave 中仍是 `clear/blocked` 摆动，失败层级保持 `128`；判定继续归入 `edge_gate_noise`，不触发 runtime 实现线。
- `externalStore.ingest.tickNotify` 在 `2026-03-21-externalstore-threshold-localize-v4` 的 fresh probe 中再次出现同批次 `blocked/clear` 并存，且 `first_fail_level` 在 `128/256/512` 之间漂移；判定继续归入 `edge_gate_noise`，不触发 runtime 实现线。
- `externalStore.ingest.tickNotify` 在 `2026-03-21-r2-gate-c-stability-recheck` 的 7 轮复核中仍是 `4 clear + 3 blocked`，失败层级在 `128/256`；用于更新 `R-2 Gate-C` 判定，不触发新的 runtime 实施线。
- `C-13` 的两条最小验证命令均因 `node_modules` 缺失导致 `vitest` 不可执行；本次 `blocked` 归类为 `environment`，不能作为重开 `P2-1` 的触发器。
- `C-17` 已确认 `P2-1` reopen check 的环境阻塞解除；当前阻塞转为 `externalStore` 的 threshold 摆动，继续归类 `edge_gate_noise`，不能作为 `P2-1` 的唯一触发器。
- `C-14` 的两条最小验证命令均因 `node_modules` 缺失导致 `vitest` 不可执行；本次 `blocked` 归类为 `environment`，不能作为重开 `P1-3R` 的触发器。
- `C-15` 显示 dispatch-shell 单次 400 迭代样本会受并行负载扰动；后续若重开该线，默认以“同口径 5 轮中位数 + probe 状态”作为是否触发实现线的唯一门。
- 裁决：默认 blocker probe 不再包含 `txnLanes`；如未来重开，只能用 file-level 命令或显式转义 pattern。

### 4. 已解决 / 已清空项

- `txnLanes.urgentBacklog`：已由 `S-10` 关闭，不再作为默认 blocker。
- `externalStore.ingest.tickNotify`：已由 `S-1` residual audit 关闭，`S-11` real probe 再次通过。
- `runtimeStore.noTearing.tickNotify`：`S-4` 修复后继续保持通过。
- `form.listScopeCheck`：当前继续保持通过。
- `react.strictSuspenseJitter`：`S-5` 已关闭。
- `browser collect stabilization`：`S-6` 已关闭。
- `D-4 list-rowid gate`：已吸收到母线，并完成 focused evidence 收口。

## 并行 Workstream 拆分建议

### 默认

- 不开新的 runtime 主线。
- 若 `probe_next_blocker` 为 `clear`，本轮应以 docs/evidence-only 收口，而不是继续向 `packages/logix-core/**` 下刀。
- 是否允许继续开新的 perf worktree，统一按 `docs/perf/09-worktree-open-decision-template.md` 裁决；当前默认答案应为“不开”。

### 可并行副线 A

- 当前无默认 perf/tooling 副线；`S-2` 已由 `S-14` 完成 native-anchor pre-handler split 并关闭。
- `D-4 list-rowid gate` 已收口，不再占 future-only 名额。
- 若 future diff/report 再次丢失 paired phase 首屏展示，或 `nativeCaptureToHandler` 再次出现稳定非零税点，再单开新的 tooling/evidence worktree。

### 可并行副线 B

- `R-2`：`TxnLanePolicy` API vNext 收敛。
- 说明：这不是当前 blocker 的自然后继，只能在新 SLA / 新证据成立时单独立项。

### 健康检查

- current-head 只要发生实质性变化，就重新运行 `python3 fabfile.py probe_next_blocker`。
- 如果 real probe 再次出现 failure，先判断是 `environment` 还是 `suite`，不要把环境缺失误记成 runtime regression。
- 若 `probe_next_blocker` 的 `blocker.failure_kind=environment`，本轮自动判定为 trigger 不成立，只允许 docs/evidence-only 收口与 watchlist 维持，不开新实施线。
- 当前最新母线阶段收口批次应按“blocker plane clear + soft watch retained”解读；默认不开新的 runtime 实施线。
- 若后续 fresh reprobe 连续稳定 `clear`，再恢复 `clear_stable` 口径；若再次扩大为连续 `blocked`，再恢复“fresh probe 优先”的前置门并按同口径重判。

## 建议下一刀（只给一个）

- 当前没有默认 runtime 下一刀。

### 为什么是“没有”

1. `S-10` 已经关闭了旧的 `txnLanes` queue-side runtime 主线。
2. `S-11` 在独立 worktree 中对 remaining blocker 队列做 real probe 后，得到 `next_blocker: none`。
3. 因而 current-head 已经不再满足“必须立刻开新的 runtime worktree”这一前提。

### 如果必须继续做 perf

1. 先做 clean/comparable evidence audit，不要在没有新证据时重开新的 code cut。
2. 只有在新的 native-anchor 证据再次显示页面内 `nativeCapture->handler` 存在稳定税点，或出现新的产品级 SLA 时，才重新讨论 `S-2` 重开或推进 `R-2`。
3. 在没有新增证据之前，所有结论都以 docs/evidence-only 收口。
4. `2026-03-14 / C-7` 已再次验证 `status=clear`；当前默认不再重开任何 perf 实施线。
