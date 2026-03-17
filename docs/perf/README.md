# Perf Docs（长期维护）

这里是性能维护专题区，目标是让后续 agent 可以直接拿结论继续推进，而不是从零分析。

注意：正式 perf 证据（PerfReport/PerfDiff）仍归档在 `specs/<id>/perf/`，本目录负责“结论、约束、路线、执行手册”。

## 机制入口

当前 perf 优化按一套独立机制运行：

1. 识别
2. 消费
3. `worktree + subagent` 实施
4. 回收母线

固定入口约定：

- `docs/perf/README.md`：总览入口，给新会话当前盘面与高收益方向
- `docs/perf/06-current-head-triage.md`：current-head 分类与 blocker 口径
- `docs/perf/07-optimization-backlog-and-routing.md`：唯一任务源与消费入口
- `docs/perf/08-perf-execution-protocol.md`：实施 / 回收协议
- `docs/perf/09-worktree-open-decision-template.md`：`probe_next_blocker=clear` 后的开线裁决模板
- `specs/<id>/perf/*`：evidence / artifact store，只存工件，不负责路由与选线

不要把 `specs/<id>/perf/*` 当成新的路由入口，也不要从 evidence 目录反推“下一刀”。
默认在开任何新 worktree 前，先让母线恢复 clean；主会话若因 routing/docs/evidence 协调产生临时改动，应先尽快收口并提交，再让子线继承新的母线 HEAD。

`$logix-perf-cut-loop 实施高收益方向` 的默认行为：

1. 先消费 `07` 中 still-open 的高收益方向
2. 默认尽可能多开 `subagent + worktree`
3. 低冲突方向并行，高冲突方向串行
4. 若 `07` 暂时没有 still-open 高收益方向，则自动切回并行 docs-only scout 模式，先识别新的方向

## 当前状态

- motherline：`v4-perf`
- current-head：`clear`
- 默认 blocker plane：`clear`
- 默认 soft watch：`externalStore.ingest.tickNotify / full/off<=1.25 @ gateClass=soft`
- `2026-03-22` 已完成 `D-5-min Diagnostics Cost-Class Protocol + Gate Plane Split`：`RuntimeDebugEventRef` / `DevtoolsHub.exportBudget` 已带 `costClass/gateClass/samplingPolicy`，`probe_next_blocker` 只把 `hard` 阈值异常当 blocker，`externalStore.ingest.tickNotify / full/off<=1.25` 已移入 soft watch（见 `docs/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.md`）
- 当前默认不开新的 perf worktree；`2026-03-23` 的 fanout 开线裁决已归档到 `docs/perf/archive/2026-03/2026-03-23-known-directions-fanout-open-decision.md`
- 当前 phase 的内部方向已全部收口；当前只剩外部阻塞的 `R-2` public API proposal watchlist（唯一候选：`R2-U PolicyPlan contract reorder`）
- `2026-03-23` post-fanout 识别、`SW-N2 gate comparability`、`current-head probe refresh + StateTrait gate audit`、`react controlplane full phase-machine nextcut scout` 已全部归档到 `archive/2026-03/`；这些路径已完成当前 phase 终局裁决，不再保留在顶层默认阅读面
- `2026-03-23` 的 `current phase terminal closeout` 已完成：`P1-3R`、`P2-1`、`SW-N2`、`P0-3/N-0`、更大的 `react controlplane phase-machine` 已按当前 phase 终局关闭；`R-2` 改写为 `external_blocked`；当前 phase 内部方向已全部消费完毕（见 `docs/perf/2026-03-23-current-phase-terminal-closeout.md`）
- `R-2` 已完成 Gate-C 独立稳定性复核：相对 `v4-perf@fc0b3e3e` 的单点 `blocked`，当前 7 轮 `probe_next_blocker --json` 为 `4 clear + 3 blocked`，阻塞仅来自 `externalStore.ingest.tickNotify / full/off<=1.25`（`first_fail_level=128/256`）并维持 `edge_gate_noise` 判定；`Gate-C` 当前可比性已满足，`No-Go` 由 `Gate-A/B` 未触发决定
- `2026-03-22` 已完成 docs-only `R-2 API unify scout`，唯一建议下一刀为 `R2-U PolicyPlan contract reorder`：把 runtime/provider 双族 override 收敛为 `profile + binding` 单一 public contract，并把覆盖解析前移到编译期，降低热路径结构税（见 `docs/perf/2026-03-22-r2-api-unify-direction-scout.md`）
- `2026-03-22` 的 `R2-U` design package + trigger bundle v1 已完成 docs/proposal-only 收口：当前仍 `implementation-ready=false`，剩余阻塞只剩外部 `SLA-R2` 实值输入（见 `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`、`docs/perf/2026-03-22-r2-u-trigger-bundle-v1.md`）
- `react controlplane phase-machine` 当前已完成 Stage G implementation-ready 定义，G1/G2 已实施并 `accepted_with_evidence`
- `react controlplane phase-machine` 的 `G3 owner-lane phase contract normalization` 已完成实施并 `accepted_with_evidence`
- `2026-03-21` 的 `Stage G3 impl recheck` 结果为 `failure_kind=environment`，该次尝试按 docs/evidence-only 收口且不保留代码改动
- `2026-03-21` 的 `Stage G4 env-ready v2` fresh 复核已完成，最小验证链路可复现，按 docs/evidence-only 收口（见 `docs/perf/archive/2026-03/2026-03-21-react-controlplane-phase-machine-stage-g4-env-ready-v2.md`）
- `2026-03-21` 的 `Stage G5` 已落盘 implementation-ready 设计包，唯一最小切口为 `controlplane kernel v0 (neutral-settle no-refresh)`，保持不改 public API 且不触 `packages/logix-core/**`（见 `docs/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-design-package.md`）
- `2026-03-21` 的 `Stage G5 kernel v0` 已在独立 worktree 完成同口径复验，最小验证链路全绿且 `probe_next_blocker --json` 为 `status=clear`，本轮从 `merged_but_provisional` 升级为 `accepted_with_evidence`（见 `docs/perf/2026-03-21-react-controlplane-phase-machine-stage-g5-kernel-v0-evidence.md`）
- `2026-03-22` 的 `Stage G6 kernel v1` 已完成实施并 `accepted_with_evidence`：`config snapshot confirm` 全触发路径统一纳入 owner ticket 规则，phase-trace 断言补齐“同 ownerKey+epoch 单次 commit”与“过期 ticket reason 码”；`probe_next_blocker` 首轮命中既有阈值噪声，复跑恢复 `status=clear`（见 `docs/perf/2026-03-22-react-controlplane-stage-g6-kernel-v1.md`）
- `2026-03-22` 的 `post-G6` 识别已收口唯一下一刀：`P1-6'' owner-aware resolve engine`（`ControlplaneKernel v2` 设计提案，docs-only），并明确当前 `externalStore/form` 波动属于 gate 噪声，不作为该线收益归因（见 `docs/perf/2026-03-22-identify-react-controlplane-next-cut-post-g6-owner-resolve.md`）
- `2026-03-22` 的 `P1-6''` design package 已完成 docs/proposal-only 收口：设计缺口已被收敛到 `OwnerResolveRequested` 合同、stale/commit reason 矩阵、四入口 phase-trace 字段集与断言矩阵（见 `docs/perf/2026-03-22-p1-6pp-owner-resolve-engine-design-package.md`）
- `2026-03-22` 的 `P1-6''` contract freeze 已完成：当前已提升为 `implementation-ready=true`，后续可直接按冻结合同与验证矩阵开独立 implementation line（见 `docs/perf/2026-03-22-p1-6pp-owner-resolve-engine-contract-freeze.md`）
- `2026-03-23` 的 `P1-6''` implementation line 已在独立 worktree 完成并 `accepted_with_evidence`：四入口 owner resolve 合同、reasonCode、ticket/epoch/readiness 已统一进入 phase-trace 主链路，最小验证与 `probe_next_blocker` 全绿（见 `docs/perf/archive/2026-03/2026-03-23-p1-6pp-owner-resolve-engine-impl.md`）
- `react controlplane phase-machine` 当前无新增强触发 blocker，回到常规 watchlist
- `2026-03-21` 已基于 `G1~G5` 的 accepted 盘面重新识别 react controlplane 下一线方向：Top1 为 `Stage G6 ControlplaneKernel v1`，Top2 为 `P1-6'' owner-aware resolve engine`（见 `docs/perf/2026-03-21-identify-react-controlplane-next-cut-post-g5.md`）
- `2026-03-20` 的 `P2-1 fresh reopen check` 结果：trigger 不成立（`failure_kind=environment`），按 docs/evidence-only 收口
- `2026-03-21` 的 `P2-1 env-ready fresh reopen check` 结果：环境已就绪，focused tests 全绿；`probe_next_blocker` 命中 `externalStore.ingest.tickNotify` 的 threshold 失败（`first_fail_level=256`），该失败归类 `edge_gate_noise` 且不映射 `P2-1` 唯一最小切口，继续 docs/evidence-only 收口
- `2026-03-20` 的 `P1-3R fresh reopen check` 结果：trigger 不成立（`failure_kind=environment`），按 docs/evidence-only 收口
- `2026-03-21` 的 `P1-3R env-ready impl-check v2` 结果：环境已就绪，focused tests 全绿且 `probe_next_blocker=clear`；但 reopen-plan 的 trigger1 仍不成立，本轮继续 docs/evidence-only，`P1-3R` 维持 watchlist
- `2026-03-21` 的 `P1-4B-min RuntimeExternalStore module pulse hub` 已完成实施并 `accepted_with_evidence`：同 module 的 module/readQuery bridge pulse 在 lowPriority 路径完成 module 级收敛，最小验证链路与 `probe_next_blocker` 全绿（见 `docs/perf/2026-03-21-p1-4b-module-pulse-hub-impl.md`）
- `2026-03-22` 的 `P1-4D-min remove LOGIX_CROSSPLANE_TOPIC dual path` 已发起实施尝试；因环境阻塞（`node_modules missing`）导致 `tsc/vitest` 不可用，最小验证链路不可比。该次尝试已回滚实现并按 docs/evidence-only 收口（见 `docs/perf/2026-03-22-p1-4d-min-single-path-cleanup.md`）
- `2026-03-22` 的 cross-plane docs-only scout 线已完成：现行代码基线已满足 single-path，`P1-4D` 的结构收益面不足以继续作为唯一下一刀；下一线改为 `P1-4F-min core->react single pulse contract`，聚焦“topic listener fanout 之后的 bridge 侧重复调度与 selector shouldNotify 扇出税”（见 `docs/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.md`）
- `2026-03-22` 的 `P1-4F` implementation-ready 检查已按 docs/evidence-only 收口：初始 blocker 收敛为 selector interest contract、readQuery activation retain 生命周期、`useSelector` 单订阅路径合同（见 `docs/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.md`）
- `2026-03-22` 的 `P1-4F` contract freeze v2 已完成：当前已提升为 `implementation-ready=true`，后续可直接按冻结的 C1/C2/C3 合同与验证矩阵开 implementation line（见 `docs/perf/2026-03-22-p1-4f-single-pulse-contract-freeze-v2.md`）
- `2026-03-23` 的 `P1-4F` implementation line 已在独立 worktree 完成并 `accepted_with_evidence`：selector interest refCount、readQuery activation 生命周期与单订阅路径已落地，core/react 验证矩阵与 `probe_next_blocker` 全绿（见 `docs/perf/archive/2026-03/2026-03-23-p1-4f-single-pulse-impl.md`）
- `2026-03-20` 的 `P0-1+ dispatch-shell fresh recheck` 结果：未识别新可归因 residual，按 docs/evidence-only 收口并关闭
- `2026-03-21` 的 `P0-2 operation-empty-default-next` 复核结果：未识别遗漏的最小代码切口，最小验证与 `probe_next_blocker` 全绿，按 docs/evidence-only 收口
- `2026-03-21` 的 `N-1 runtime-shell.freeze nextwide` 实施试探结果：同机对照未形成新增硬收益，且 `resolve-shell` 与 `dispatch/residual` 出现回退；已回滚实现并按 docs/evidence-only 收口（见 `docs/perf/archive/2026-03/2026-03-21-n-1-runtime-shell-freeze-nextwide.md`）
- `2026-03-21` runtime-shell post-ledger 复核：下一线从 `freeze` 切换为 `ledger.attribution-nextcut`，目标是把 nextwide 收敛到单一最小切口候选并提供可复现归因闭环（见 `docs/perf/2026-03-21-identify-runtime-shell-nextwide.md`）
- `2026-03-22` runtime-shell post N-2 scout 完成：唯一推荐下一刀为 `N-3 runtime-shell.resolve-boundary-attribution-contract`，优先统一归因协议、shell 复用口径与 `snapshot/noSnapshot` 边界，再决定是否进入 `noSnapshot` 压缩实现线；默认不改 public API（见 `docs/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.md`）
- `2026-03-22` 的 `N-3` contract freeze 已完成：当前已提升为 `implementation-ready=true`，后续可直接按冻结的 boundary decision 合同、reason taxonomy、ledger v1.1 字段分层与 focused validation matrix 开独立 implementation line（见 `docs/perf/2026-03-22-n-3-contract-freeze.md`）
- `2026-03-23` 的 `N-3` implementation line 已在独立 worktree 完成并 `accepted_with_evidence`：runtime-shell ledger 已新增统一 `RuntimeShellBoundaryDecision` 合同、summary attribution 与 schema/example 同口径更新，最小验证与 `probe_next_blocker` 全绿（见 `docs/perf/archive/2026-03/2026-03-23-n-3-runtime-shell-impl.md`）
- `2026-03-22` 的 `SW-N2 Static FieldPathId table and stable anchor plumbing` 最小切口尝试已按 docs/evidence-only 收口：实现与测试改动已回滚，`typecheck:test` 通过、`probe_next_blocker=clear`，`pnpm -C packages/logix-core test` 在 clean 状态未全绿，未满足 `accepted_with_evidence`（见 `docs/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor-impl-check.md`）
- `2026-03-22` 已完成 state-write post SW-N2 识别线：唯一建议下一刀为 `SW-N3 Degradation-Ledger + ReducerPatchSink contract`，优先把 `customMutation/dirtyAll` 降级流转从“隐式推导尾部成本”改为“跨入口可归因、可约束、可门禁”的统一协议；`SW-N2` 继续保留 watchlist（见 `docs/perf/2026-03-22-identify-state-write-next-cut-post-sw-n2.md`）
- `2026-03-22` 的 `SW-N3` design package 已完成 docs/proposal-only 收口：当前仍 `implementation-ready=false`，后续必须先冻结 `StateWriteIntent` 合同、`ReducerPatchSink` 决策矩阵、`state:update` / devtools / perf 指标词表与 focused validation matrix，再决定是否开 implementation line（见 `docs/perf/2026-03-22-sw-n3-degradation-ledger-design-package.md`）
- `2026-03-22` 的 `SW-N3` contract freeze 已完成：当前已提升为 `implementation-ready=true`，后续可直接按冻结合同与验证矩阵开独立 implementation line（见 `docs/perf/2026-03-22-sw-n3-contract-freeze.md`）
- `2026-03-22` 的 `SW-N3` implementation line 已完成最小数据面接线与验证，当前按 `merged_but_provisional` 收口：`stateWrite` 已进入 `state:update` slim meta 且最小验证链路通过，但尚未产出 before/after 的正式收益工件（见 `docs/perf/2026-03-22-sw-n3-degradation-ledger-impl.md`）
- `2026-03-23` 的 `SW-N3` evidence closeout 已在独立 worktree 完成并 `accepted_with_evidence`：`stateWrite.degradeRatio / degradeUnknownShare` 与 `readCoverage` 已进入 Devtools 稳定读取面，首轮可比工件与验证链路均已落盘（见 `docs/perf/archive/2026-03/2026-03-23-sw-n3-evidence-closeout.md`）
- `2026-03-22` 的 `D-5-min Diagnostics Cost-Class Protocol + Gate Plane Split` 已完成实施并 `accepted_with_evidence`：`externalStore.ingest.tickNotify / full/off<=1.25` 已从 blocker plane 移入 soft watch，`probe_next_blocker --json` 返回 `status=clear`，最小测试链路全绿（见 `docs/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.md`）

## 顶层怎么读

先读这些：

- `06-current-head-triage.md`
- `07-optimization-backlog-and-routing.md`
- `08-perf-execution-protocol.md`
- `09-worktree-open-decision-template.md`
- `2026-03-20-r2-public-api-proposal.md`
- `2026-03-21-r2-public-api-staging-plan.md`
- `2026-03-21-r2-gate-ab-trigger-scout.md`
- `2026-03-22-r2-u-policyplan-design-package.md`
- `2026-03-22-r2-u-trigger-bundle-v1.md`
- `2026-03-22-r2-api-unify-direction-scout.md`
- `2026-03-23-current-phase-terminal-closeout.md`
- `2026-03-15-v4-perf-next-cut-candidates.md`

## 顶层活跃清单

当前顶层只保留三类内容：

1. 控制面入口
   - `01` 到 `09`
   - `README`
2. 当前 phase 总收口
   - `2026-03-23-current-phase-terminal-closeout.md`
3. 仍具当前价值的外部阻塞方向
   - `2026-03-20-r2-public-api-proposal.md`
   - `2026-03-21-r2-public-api-staging-plan.md`
   - `2026-03-21-r2-gate-ab-trigger-scout.md`
   - `2026-03-22-r2-api-unify-direction-scout.md`
   - `2026-03-22-r2-u-policyplan-design-package.md`
   - `2026-03-22-r2-u-trigger-bundle-v1.md`

其余 dated note 若已终局关闭、已吸收、已被后续口径覆盖，默认进入 `archive/2026-03/`。
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-n-3-contract-freeze.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-n-3-contract-freeze.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-diagnostics-budget-unify-scout.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-diagnostics-budget-unify-scout.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.evidence.json`

与当前 future-only 方向直接相关的最近收口包：

- `docs/perf/archive/2026-03/2026-03-20-p2-1b-lane-evidence-contract.md`
- `docs/perf/archive/2026-03/2026-03-20-p2-1-next-stage-evidence-only.md`
- `docs/perf/archive/2026-03/2026-03-20-p2-1-reopen-check.md`
- `docs/perf/archive/2026-03/2026-03-21-p2-1-env-ready-recheck.md`
- `docs/perf/archive/2026-03/2026-03-20-p1-3r-reopen-check.md`
- `docs/perf/2026-03-21-p1-4b-module-scoped-pulse-coalescing-design.md`
- `docs/perf/2026-03-21-p1-4b-module-pulse-hub-impl.md`
- `docs/perf/2026-03-21-p1-4c-moduleinstance-pulse-envelope-selector-delta-payload-design.md`
- `docs/perf/2026-03-21-p1-4c-min-pulse-envelope-selector-delta-impl.md`
- `docs/perf/2026-03-22-p1-4d-min-single-path-cleanup.md`
- `docs/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.md`
- `docs/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.md`
- `docs/perf/archive/2026-03/2026-03-20-p0-1plus-dispatch-shell-recheck.md`
- `docs/perf/archive/2026-03/2026-03-21-p0-2-operation-empty-default-next.md`
- `docs/perf/archive/2026-03/2026-03-21-n-1-runtime-shell-freeze-nextwide.md`
- `docs/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-n-3-runtime-shell-attribution-design-package.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-n-3-runtime-shell-attribution-design-package.evidence.json`
- `docs/perf/2026-03-22-n-3-contract-freeze.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-n-3-contract-freeze.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-n-3-contract-freeze.evidence.json`
- `docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-contract.md`
- `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`
- `2026-03-20-react-controlplane-phase-machine.md`
- `docs/perf/2026-03-22-p1-6pp-owner-resolve-engine-design-package.md`
- `docs/perf/2026-03-22-sw-n3-degradation-ledger-design-package.md`
- `docs/perf/2026-03-22-sw-n3-contract-freeze.md`
- `docs/perf/2026-03-22-sw-n3-degradation-ledger-impl.md`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g-design.md`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g1-owner-lane-registry-adapter.md`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g2-cancel-boundary-isomorphic.md`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-g3-owner-lane-phase-contract.md`
- `docs/perf/archive/2026-03/2026-03-21-react-controlplane-phase-machine-stage-g3-impl-recheck.md`
- `docs/perf/archive/2026-03/2026-03-21-react-controlplane-phase-machine-stage-g3-owner-lane-phase-contract.md`
- `2026-03-20-r2-public-api-proposal.md`
- `2026-03-21-r2-public-api-staging-plan.md`
## 历史记录

已完成、已失败、已关闭、已被后续口径覆盖的 dated note 已归档到：

- `docs/perf/archive/2026-03/`

归档说明见：

- `docs/perf/archive/README.md`

## 口径说明

- `07` 是当前 backlog 真相源。
- `2026-03-15-v4-perf-next-cut-candidates.md` 是 future-only 候选池。
- `09` 负责裁决“现在要不要开新线”。
- `archive/` 只存历史路径，不再作为顶层默认阅读入口。
