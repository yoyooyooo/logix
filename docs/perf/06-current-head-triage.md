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

- `docs/perf/2026-03-06-s10-txn-lanes-native-anchor.md`
- `docs/perf/2026-03-06-s11-post-s10-blocker-probe.md`
- `docs/perf/2026-03-14-c7-current-head-reprobe-clear.md`
- `docs/perf/2026-03-29-post-merge-big-cut-candidates.md`
- `docs/perf/2026-03-30-latest-main-quick-identify-reading.md`
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

## 当前结论摘要

1. current-head 已无默认 browser blocker，但 latest-main cheap-local 已重新识别出一个 node-side runtime 候选。
- `2026-03-30` 的 latest-main quick identify 在 `main@b4bc9e1d` 上继续给出 `probe_next_blocker = clear`。
- 同一轮 cheap-local 也证明：
  - merged 的 same-target fanout 收益继续保持
  - 当前 residual 更像 `dispatch` 专属入口壳，而不是 inner txn body 或 `txnQueue` 公共壳。

2. `txnLanes` 继续保持关闭结论，不再回到默认 blocker 队列。
- `S-10` 已证明 native-anchor 语义下 `urgent.p95<=50ms` 在 `mode=default/off` 都能稳定通过到 `steps=2000`。
- `S-11` 还额外暴露出旧 `-t "...(mode matrix)"` 命令会因为 Vitest regex 语义把目标测试记成 `skipped`；因此 `txnLanes` 更不应继续留在默认 probe 队列里。

3. remaining targeted gates 已清空。
- `externalStore.ingest.tickNotify`：targeted residual audit 已关闭，`S-11` real probe 再次通过。
- `runtimeStore.noTearing.tickNotify`：`S-4` 最小修复已吸收，`S-11` real probe 继续通过。
- `form.listScopeCheck`：`S-11` real probe 继续通过。

4. 剩余不再只保留架构候选。
- `S-14` 已把 `watchers.clickToPaint` 的旧 `clickToHandler` 再拆成 `clickInvokeToNativeCapture + nativeCaptureToHandler`，并确认 dominant phase 是页面外 click 注入税；`S-2` 整条 benchmark 解释链已收口，不再是待排期候选。
- `C-6` 已确认 `react.bootResolve.sync` 的旧“小固定税”主要来自 RAF 轮询地板；当前不再把它当作 runtime watchlist。
- `C-7` 又在 current-head 上重新执行了 `probe_next_blocker --json`，结果继续是 `clear`。
- 当前唯一 cheap-local 候选：`R-3 dispatch outer shell`
- 架构候选：`R-2`，只有在出现新的产品级 SLA 或新的 native-anchor 证据时，才讨论 `TxnLanePolicy` API vNext。

## 四分法裁决

### 1. 真实运行时瓶颈

- 当前没有默认 browser/runtime blocker。
- 但 latest-main cheap-local 已把当前最像真实 runtime 瓶颈的一刀收窄到 `dispatch` 专属入口壳。

### 2. 证据语义错误 / benchmark 候选

- `watchers.clickToPaint`
- 原因：它仍更像 browser floor / suite 语义混入，而不是 current-head 的 runtime blocker。
- 裁决：`S-12` / `S-13` 已补齐并前置 same-sample phase evidence，`S-14` 又把旧 `clickToHandler` 拆成 `clickInvokeToNativeCapture + nativeCaptureToHandler`；当前证据明确显示 dominant phase 是页面外 click 注入税（`~34-36ms / 64-66%`），页面内 `nativeCapture->handler` 基本为 `0ms`，后续禁止再用 `watchers.clickToPaint - watchers.clickToDomStable` 的跨 suite 聚合差值解释红样本。

### 3. 门禁 / tooling 注意项

- `txnLanes` 的旧 `-t "browser txn lanes: urgent p95 under non-urgent backlog (mode matrix)"` 命令依赖未转义括号的 regex，会把目标测试记成 `skipped`。
- `converge.txnCommit` 的 `reason=notApplicable` 已由 `S-3` 从真实性能失败视图剥离，不再是当前 blocker。
- 裁决：默认 blocker probe 不再包含 `txnLanes`；如未来重开，只能用 file-level 命令或显式转义 pattern。

### 4. 已解决 / 已清空项

- `txnLanes.urgentBacklog`：已由 `S-10` 关闭，不再作为默认 blocker。
- `externalStore.ingest.tickNotify`：已由 `S-1` residual audit 关闭，`S-11` real probe 再次通过。
- `runtimeStore.noTearing.tickNotify`：`S-4` 修复后继续保持通过。
- `form.listScopeCheck`：当前继续保持通过。
- `react.strictSuspenseJitter`：`S-5` 已关闭。
- `browser collect stabilization`：`S-6` 已关闭。

## 并行 Workstream 拆分建议

### 默认

- 当前默认不重开 browser blocker 路线。
- 这轮已经满足 latest-main cheap-local reopen 条件，允许继续推进一条更窄的 runtime probe 线：
  - `R-3 dispatch outer shell`
- 是否继续往实现线升级，取决于更窄 probe 是否继续证明主税点落在 `dispatch` 专属入口壳。

### 可并行副线 A

- 当前无默认 perf/tooling 副线；`S-2` 已由 `S-14` 完成 native-anchor pre-handler split 并关闭。
- 若 future diff/report 再次丢失 paired phase 首屏展示，或 `nativeCaptureToHandler` 再次出现稳定非零税点，再单开新的 tooling/evidence worktree。

### 可并行副线 B

- `R-2`：`TxnLanePolicy` API vNext 收敛。
- 说明：这不是当前 cheap-local 候选的自然后继，只能在新 SLA / 新证据成立时单独立项。

### 可并行副线 C

- `R-3`：`dispatch` 专属入口壳 cheap-local probe
- 说明：已由 `2026-03-30` latest-main quick identify 打开；当前优先级高于 `R-2`

### 健康检查

- current-head 只要发生实质性变化，就重新运行 `python3 fabfile.py probe_next_blocker`。
- 如果 real probe 再次出现 failure，先判断是 `environment` 还是 `suite`，不要把环境缺失误记成 runtime regression。

## 建议下一刀（只给一个）

- `R-3 dispatch outer shell`

### 为什么是它

1. `probe_next_blocker --json` 继续为 `clear`，所以不该回到 browser blocker 路线。
2. merged 的 same-target fanout 两条线在 HEAD 上继续保持 `1 / 1 / 1`，所以不该回头重开旧 fanout 候选。
3. node 微基线与 split probe 一起把当前税点收窄到：
   - `public dispatch`
   - 相对 `public setState` 的专属入口壳

### 当前执行门

1. 先保持在 cheap-local / node probe 范围，不直接跳到 focused/heavier。
2. 若更窄 probe 继续证明 `dispatch` 专属入口壳是主税点，才允许升级成新的 runtime 实施线。
3. 若更窄实现线只拿到微基线正向、route-level 不动，立即停线并回到 `dirty-evidence -> converge admission` 次选路线。
