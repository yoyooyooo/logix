# Perf Docs（长期维护）

这里是性能维护专题区，目标是让后续 agent 可以直接拿结论继续推进，而不是从零分析。

注意：正式 perf 证据（PerfReport/PerfDiff）仍归档在 `specs/<id>/perf/`，本目录负责“结论、约束、路线、执行手册”。

## 当前主线（无存量用户）

- `05-forward-only-vnext-plan.md`
  - 在“零存量用户”前提下的唯一主线方案（破坏式收敛 + API vNext + 执行波次）。
- `06-current-head-triage.md`
  - 基于 current-head 证据的四分法裁决：真实瓶颈、伪影、门禁噪声与唯一下一刀。
- `07-optimization-backlog-and-routing.md`
  - 把识别结论收敛成可执行 backlog：收益/成本/冲突面/并行策略/worktree 需求。

## 专题导航（先读）

- `01-architecture-keep-vs-change.md`
  - 明确哪些架构/语义不建议改，哪些必须改。
- `02-externalstore-bottleneck-map.md`
  - `externalStore.ingest.tickNotify` 的热路径分解与已确认瓶颈。
- `03-next-stage-major-cuts.md`
  - 下一阶段定向大改（A/B/C/D）与 API forward-only 演进方案。
- `04-agent-execution-playbook.md`
  - 后续 agent 直接执行用：步骤、命令、门禁、回写要求。
- `06-current-head-triage.md`
  - current-head 的最新裁决页；开始新一轮 perf 工作前优先读它，而不是直接翻旧波次。
- `07-optimization-backlog-and-routing.md`
  - 真正的实施路由页：哪些做主线、哪些做副线、哪些能并行、哪些必须串行。

## 时间线记录（按日期回看）

- `2026-03-04-s2-kernel-perf-cuts.md`
  - S2 已完成切刀与验证记录。
- `2026-03-04-next-cut-analysis.md`
  - 本轮“下一刀”分析快照（时间点结论）。
- `2026-03-04-b1-externalStore-batched-writeback.md`
  - B-1：externalStore 写回批处理（in-flight batching）实现与证据路标。
- `2026-03-04-c1-ref-list-auto-incremental.md`
  - C-1：`Ref.list(...)` 自动增量（txn evidence -> changedIndices）实现记录。
- `2026-03-05-d1-dirtyset-v2.md`
  - D-1：DirtySet v2（TxnDirtyEvidence）+ RowId reconcile gate。
- `2026-03-05-d2-dirtyevidence-snapshot.md`
  - D-2：TxnDirtyEvidenceSnapshot（commit 热路径去 DirtySet rootIds；SelectorGraph/RowId 直接消费 dirtyPathIds）。
- `2026-03-05-e1-mutative-index-evidence.md`
  - E-1：mutative patchPaths 保留索引证据（array path -> listIndexEvidence，提升 `Ref.list(...)` 增量覆盖率）。
- `2026-03-05-f1-devtools-ring-buffer.md`
  - F-1：DevtoolsHub 事件窗口 O(1) ring buffer（去 `splice` trimming 抖动；full 诊断更稳）。
- `2026-03-05-g1-infer-replace-patches.md`
  - G-1：整状态替换推导 dirty evidence（`setState/state.update`/reducer 无 patchPaths 不再立刻 dirtyAll）。
- `2026-03-05-g2-infer-replace-if-empty.md`
  - G-2：整状态替换推导 if_empty（已有精确 dirty evidence 时跳过推导，避免纯 overhead）。
- `2026-03-05-h1-converge-offfast-perf-hints.md`
  - H-1：converge(off-fast-path) 负优化边界压榨：perf hint 跨 generation bump 保留 + 冷启动样本隔离；并记录 fast_full guard 的失败尝试与回滚。
- `2026-03-05-h2-negative-boundary-min-delta.md`
  - H-2：negativeBoundaries.dirtyPattern 增加 `minDeltaMs=0.1`（sub-ms 相对预算地板），让 gate 可复测可执行。
- `2026-03-06-i1-state-writeback-batched.md`
  - I-1：`$.state.update/$.state.mutate` 生产态批处理写回（microtask 合批 + in-flight drain），把 `watchers.clickToPaint` 的 `p95<=100ms` 档位从 256 提到 512。
- `2026-03-06-j1-txn-lanes-mode-matrix.md`
  - J-1：`txnLanes.urgentBacklog` 改成显式 `mode(default/off)` 轴，broad matrix 不再隐式测 forced-off。
- `2026-03-06-k1-react-strict-suspense-realpath.md`
  - K-1：`react.strictSuspenseJitter` 改成真实 state-level suspend + 单次 interaction 计时，移除旧的线性点击伪失败。
- `2026-03-06-l1-txn-lanes-initial-chunk-1.md`
  - L-1：`txnLanes` 在 `budgetMs<=1` 时把 non-urgent 首片缩到 1，`mode=default` 的 50ms 硬门从全灭提升到 `steps<=800` 可过。
- `2026-03-06-m1-react-bootresolve-optimistic-sync.md`
  - M-1：`suspend` 路径加入 optimistic sync fast-path，`react.bootResolve` 的 `suspend` 冷启动从 `~320ms` 级降到 `~17-19ms`。
- `2026-03-06-n1-react-defer-sync-warm.md`
  - N-1：`defer` 增加 render 前 sync-warm 预热，去掉同步模块的 provider preload gating fallback；`bootToReady` 从 `~345ms` 级降到 `~60ms`。
- `2026-03-06-o1-watchers-action-writeback-fusion.md`
  - O-1：纯 state action watcher 并回原 action txn，`watchers=512` 从 `~85-95ms` 级压到 `~50-55ms`。
- `2026-03-06-o2-watchers-direct-writeback.md`
  - O-2：纯 state action watcher 直接写 draft，`watchers=512` 进一步压到 `~36-43ms`，strict 下 `50ms` 线打穿到 `512`。
- `2026-03-06-s2-watchers-preclick-settle.md`
  - S-2 准备刀：watchers benchmark 在真正点击前先 settle 一帧，减少初始挂载噪声对 click→paint 的污染。
- `2026-03-06-s1-externalstore-residual-audit.md`
  - S-1：`externalStore.ingest.tickNotify` 的 broad `watchers=256` 单点红样本已被 5 轮 clean targeted audit 复核为 residual/noise，并以 docs/evidence-only 关闭。
- `2026-03-06-p1-txn-lanes-click-anchored.md`
  - P-1：`txnLanes.urgentBacklog` 改成 click-anchored 计时，去掉 timer 排队噪声；`mode=default, steps=2000` 已进 `50ms`。
- `2026-03-06-q1-converge-nearfull-slim-decision.md`
  - Q-1：`converge auto->full (near_full)` 改成 slim decision summary，`dirtyRootsRatio=1, steps=2000` 的 `auto<=full*1.05` 已回到门内。
- `2026-03-06-r1-txn-lanes-phase-split-failed.md`
  - R-1 失败试验：blind first-host-yield 的两阶段 backlog policy 在 `mode=default` 三档都回归，应改走 urgent-aware handoff。
