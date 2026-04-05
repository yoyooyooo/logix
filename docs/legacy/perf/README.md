# Perf Docs（长期维护）

这里是性能维护专题区，目标是让后续 agent 可以直接拿结论继续推进，而不是从零分析。

注意：正式 perf 证据（PerfReport/PerfDiff）仍归档在 `specs/<id>/perf/`，本目录负责“结论、约束、路线、执行手册”。

## 当前路由快照（2026-03-30）

- 编号说明：`03/05` 沿用 major-cut 历史编号，`07` 使用 routing track 编号；存在同名如 `F-1`，排期与当前状态一律以 `07-optimization-backlog-and-routing.md` 为准。
- 当前没有默认 browser blocker：`probe_next_blocker --json` 在 `main@b4bc9e1d` 上继续为 `clear`，`#146/#148` merged 后的 same-target fanout 收益也继续保持。
- 当前最新的 cheap-local 实施候选已从“默认不开线”收敛到 `dispatch` 专属入口壳：
  - 读数锚点：`docs/perf/2026-03-30-latest-main-quick-identify-reading.md`
  - 当前唯一下一刀：`dispatch_outer_shell_probe`
- 已完成：`F-1`（perf `fabfile.py` router）、`S-2` 第一刀（watchers 双轨语义）、`S-12`（watchers paired phase evidence）、`S-13`（watchers phase display）、`S-14`（watchers native-anchor pre-handler split）、`S-4`（`RuntimeExternalStore delayed teardown` 最小修复）、`S-10`（`txnLanes` native-anchor benchmark cut）、`S-11`（post-S10 blocker probe）。
- 已关闭：`R-1` runtime 主线、`S-1` residual audit、`S-3` gate/applicability、`S-5` refresh unblock 审计、`S-6` collect 稳定化副线。
- 当前显式候选：
  - `R-3` latest-main 的 `dispatch` 入口壳 cheap-local probe
  - `R-2` 架构/API 候选
- 真正的排期与并行策略以 `07-optimization-backlog-and-routing.md` 为准。
- 执行协议以 `08-perf-execution-protocol.md` 为准：主会话保持干净，只做协调/审查/合流；每条实施线都在独立 `worktree/branch/subagent` 中推进，并在收口时相对主分支只保留 `1` 个最终 HEAD 提交。

## 当前主线（无存量用户）

- `2026-03-13-main-vs-effect-v4-final-comparison.md`
  - 当前阶段的分支级最终对比：明确提升 / 持平 / 小固定税 / 未收口项。
- `2026-03-14-d4-external-store-raw-direct-failed.md`
  - `externalStore` 的 raw-path 回退试探失败；browser targeted + soak 都没拿到稳定收益，当前不再继续调这条线。
- `2026-03-14-t1-txn-phase-gate-failed.md`
  - `txn-phase` 默认采样门收紧试探失败；只改善了局部 `full`，没有解决 `off` 主税点。
- `2026-03-14-u1-tickscheduler-start-immediately.md`
  - `scheduleTick` 的 detached fiber 改成 immediate start 后，`externalStore.ingest.tickNotify` 的 absolute/relative budgets 全部通过到 `watchers=512`。
- `2026-03-14-c3-bootresolve-readsync-scope-fastpath-failed.md`
  - `bootResolve.sync` 的 `readSync scope-make` fastpath 试探失败；`sync` 和部分 `suspend` 都变差。
- `2026-03-14-c4-bootresolve-phase-evidence.md`
  - `bootResolve.sync` 的 phase evidence 已补齐，当前最可信主税点收敛到 `provider.gating`。
- `2026-03-14-c5-provider-gating-idle-binding-failed.md`
  - `provider.gating` 里的 idle binding extra render 试探失败；现象存在，但去掉后没有形成稳定净收益。
- `2026-03-14-c6-bootresolve-observer-ready.md`
  - `bootResolve` 的真正问题是 RAF 轮询地板。切到 `MutationObserver` 后，`sync/suspend` 都回到 `~1ms` 级。
- `2026-03-14-c7-current-head-reprobe-clear.md`
  - 在 `U-1` 与 `C-6` 之后重新跑 `probe_next_blocker --json`，结果继续为 `clear`。
- `2026-03-30-latest-main-quick-identify-reading.md`
  - latest `main@b4bc9e1d` 的 cheap-local 起始盘面；确认 browser blocker 继续 `clear`，并把唯一下一刀收窄到 `dispatch` 专属入口壳。
- `2026-03-14-current-effective-conclusions.md`
  - 当前阶段唯一应继续采信的 perf 结论汇总；优先读这页，再回看 dated 记录。
- `2026-03-13-kept-vs-discarded-cuts.md`
  - 当前阶段保留刀与废弃刀清单，只看“哪些该留、哪些不该留”时优先读它。
- `05-forward-only-vnext-plan.md`
  - 在“零存量用户”前提下的唯一主线方案（破坏式收敛 + API vNext + 执行波次）。
- `06-current-head-triage.md`
  - 基于 current-head 证据的四分法裁决：真实瓶颈、伪影、门禁噪声与唯一下一刀；已吸收 `2026-03-30` latest-main addendum。
- `07-optimization-backlog-and-routing.md`
  - 把识别结论收敛成可执行 backlog：收益/成本/冲突面/并行策略/worktree 需求；当前默认主候选已切到 `R-3 dispatch outer shell`。

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
- `08-perf-execution-protocol.md`
  - 统一执行协议：主会话与实施线分工、独立 worktree/branch 纪律、成功/失败统一单提交收口。
- `09-worktree-open-decision-template.md`
  - 当 current-head 没有默认 blocker 时，用它裁决“要不要再开新的 perf worktree”，默认先判定为不开。

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
  - 历史 major-cut `F-1`：DevtoolsHub 事件窗口 O(1) ring buffer（去 `splice` trimming 抖动；full 诊断更稳）。
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
- `2026-03-06-f1-perf-fabfile.md`
  - routing `F-1`：落最小可用 perf `fabfile.py`；`07` 的任务路由已可直接被编排读取。
- `2026-03-06-s2-watchers-preclick-settle.md`
  - S-2 准备刀：watchers benchmark 在真正点击前先 settle 一帧，减少初始挂载噪声对 click→paint 的污染。
- `2026-03-06-s2-watchers-semantic-split.md`
  - S-2 第一刀：把 watchers benchmark 拆成 `clickToDomStable` 与 `clickToPaint` 双轨，分离 DOM 稳定与帧地板语义。
- `2026-03-06-s1-externalstore-residual-audit.md`
  - S-1：`externalStore.ingest.tickNotify` 的 broad `watchers=256` 单点红样本已被 5 轮 clean targeted audit 复核为 residual/noise，并以 docs/evidence-only 关闭。
- `2026-03-06-p1-txn-lanes-click-anchored.md`
  - P-1：`txnLanes.urgentBacklog` 改成 click-anchored 计时，去掉 timer 排队噪声；`mode=default, steps=2000` 已进 `50ms`。
- `2026-03-06-q1-converge-nearfull-slim-decision.md`
  - Q-1：`converge auto->full (near_full)` 改成 slim decision summary，`dirtyRootsRatio=1, steps=2000` 的 `auto<=full*1.05` 已回到门内。
- `2026-03-06-r1-txn-lanes-phase-split-failed.md`
  - R-1 失败试验：blind first-host-yield 的两阶段 backlog policy 在 `mode=default` 三档都回归，应改走 urgent-aware handoff。
- `2026-03-06-s4-runtime-external-store-delayed-teardown.md`
  - S-4：`RuntimeExternalStore delayed teardown` 最小修复已合回，`runtime-store-no-tearing` 不再按 evidence-only 关闭。
- `2026-03-06-s5-suspense-refresh-unblock.md`
  - S-5：`react.strictSuspenseJitter` 在主分支环境可直接跑通，按 docs/evidence-only 审计关闭。
- `2026-03-06-s10-txn-lanes-native-anchor.md`
  - S-10：`txnLanes.urgentBacklog` 改成 `nativeCapture -> MutationObserver DOM stable` 语义，并在 clean HEAD 复验后正式关闭 `R-1` queue-side runtime 主线。
- `2026-03-06-s11-post-s10-blocker-probe.md`
  - S-11：在独立 worktree 重新 probe current-head，确认 remaining blocker queue 全绿、默认 runtime 主线已清空，并把 `txnLanes` 从默认 blocker probe 队列移除。
- `2026-03-06-s12-watchers-paired-phase-evidence.md`
  - S-12：watchers 红样本改为同 sample phase evidence，自身即可解释超线主要落在 `clickToHandler / handlerToDomStable / domStableToPaintGap` 哪一段。
- `2026-03-06-s13-watchers-phase-display.md`
  - S-13：把 `watchers.phase.*Ms` 提升到 diff / triage / artifact report 首屏显示，并明确禁止再用跨 suite 聚合差值解释 watchers 红样本。
- `2026-03-06-s14-watchers-native-anchor-pre-handler-split.md`
  - S-14：把 `clickToHandler` 再拆成 `clickInvokeToNativeCapture / nativeCaptureToHandler` 两段，并确认 dominant phase 是页面外 click 注入税，而不是页面内 `nativeCapture->handler`。
- `2026-03-14-d4-external-store-raw-direct-failed.md`
  - D-4：把 raw external-store 写回临时退回 `main` 风格直写链路，但 browser targeted + soak 均未形成稳定收益，按 evidence-only 废弃。
- `2026-03-14-t1-txn-phase-gate-failed.md`
  - T-1：把默认 `txn-phase` 采样门收紧到 `traceMode=on`，但只改善局部 `full`，绝对预算仍未收口，按 evidence-only 废弃。
- `2026-03-14-u1-tickscheduler-start-immediately.md`
  - U-1：把 `scheduleTick()` 的 detached fiber 改成 immediate start，直接打穿 `externalStore` 的 `p95<=3ms` 与 soak `full/off<=1.25`。
- `2026-03-14-c3-bootresolve-readsync-scope-fastpath-failed.md`
  - C-3：把 `readSync` 的 `Scope.make()` 改成全局 `Effect.runSync`，但 `sync` 和 `suspend` 都没有形成净收益，按 evidence-only 废弃。
- `2026-03-14-c4-bootresolve-phase-evidence.md`
  - C-4：补 `bootResolve.sync` phase evidence。当前已确认 `provider.gating` 是最值得继续切的下一段。
- `2026-03-14-c5-provider-gating-idle-binding-failed.md`
  - C-5：验证 `useLayerBinding(enabled=false)` 的 extra render 是否是主税点，结果为否。
- `2026-03-14-c6-bootresolve-observer-ready.md`
  - C-6：把 `bootResolve` readiness 从 RAF 轮询改成 MutationObserver，确认此前的 `sync` 小税主要是测量伪影。
- `2026-03-14-c7-current-head-reprobe-clear.md`
  - C-7：重新跑 current-head blocker probe，确认当前仍无新的默认 runtime blocker。
