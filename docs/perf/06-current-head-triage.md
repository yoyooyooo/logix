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

1. current-head 已无默认 runtime blocker。
- `S-11` 的 real probe 在补齐 worktree 依赖后，对 remaining browser blocker 队列给出 `next_blocker: none`。
- 这意味着默认 browser/runtime 主线已经清空，不应再硬造新的 queue-side runtime worktree。

2. `txnLanes` 继续保持关闭结论，不再回到默认 blocker 队列。
- `S-10` 已证明 native-anchor 语义下 `urgent.p95<=50ms` 在 `mode=default/off` 都能稳定通过到 `steps=2000`。
- `S-11` 还额外暴露出旧 `-t "...(mode matrix)"` 命令会因为 Vitest regex 语义把目标测试记成 `skipped`；因此 `txnLanes` 更不应继续留在默认 probe 队列里。

3. remaining targeted gates 已清空。
- `externalStore.ingest.tickNotify`：targeted residual audit 已关闭，`S-11` real probe 再次通过。
- `runtimeStore.noTearing.tickNotify`：`S-4` 最小修复已吸收，`S-11` real probe 继续通过。
- `form.listScopeCheck`：`S-11` real probe 继续通过。

4. 剩余只保留 benchmark / 架构候选。
- benchmark 候选：`S-2`。`S-12` 已把 `watchers.clickToPaint` 收紧成同 sample phase evidence；后续只剩解释链 / 展示层语义，不再需要继续塞 runtime cut。
- 架构候选：`R-2`，只有在出现新的产品级 SLA 或新的 native-anchor 证据时，才讨论 `TxnLanePolicy` API vNext。

## 四分法裁决

### 1. 真实运行时瓶颈

- 当前没有默认 runtime 主线。
- `R-1` 已由 `S-10` 关闭，`S-11` 也没有识别出新的 current-head 第一失败项。

### 2. 证据语义错误 / benchmark 候选

- `watchers.clickToPaint`
- 原因：它仍更像 browser floor / suite 语义混入，而不是 current-head 的 runtime blocker。
- 裁决：`S-12` 已补齐同 sample phase evidence；若后续继续推进 perf，只做 `S-2` 的展示/汇总层收口，而不是先开 runtime 内核线。

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

- 不开新的 runtime 主线。
- 若 `probe_next_blocker` 为 `clear`，本轮应以 docs/evidence-only 收口，而不是继续向 `packages/logix-core/**` 下刀。

### 可并行副线 A

- `S-2`：`watchers.clickToPaint` 展示层 / 汇总层收口（phase evidence 已在 `S-12` 落地）。
- 说明：它会改变 benchmark 语义，应始终放在独立 worktree 中处理。

### 可并行副线 B

- `R-2`：`TxnLanePolicy` API vNext 收敛。
- 说明：这不是当前 blocker 的自然后继，只能在新 SLA / 新证据成立时单独立项。

### 健康检查

- current-head 只要发生实质性变化，就重新运行 `python3 fabfile.py probe_next_blocker`。
- 如果 real probe 再次出现 failure，先判断是 `environment` 还是 `suite`，不要把环境缺失误记成 runtime regression。

## 建议下一刀（只给一个）

- 当前没有默认 runtime 下一刀。

### 为什么是“没有”

1. `S-10` 已经关闭了旧的 `txnLanes` queue-side runtime 主线。
2. `S-11` 在独立 worktree 中对 remaining blocker 队列做 real probe 后，得到 `next_blocker: none`。
3. 因而 current-head 已经不再满足“必须立刻开新的 runtime worktree”这一前提。

### 如果必须继续做 perf

1. 先选 `S-2`：继续修 benchmark 解释链，而不是重开 runtime。
2. 只有在新的 clean/comparable native-anchor 证据再次出现后，才重新讨论 `txnLanes` 或 `R-2`。
3. 在没有新增证据之前，所有结论都以 docs/evidence-only 收口。
