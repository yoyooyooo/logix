# 07 · Optimization Backlog And Routing

本文件承接 `06-current-head-triage.md` 的识别结论，把“后续值得做什么”收敛成可执行 backlog。

用途不是记录历史，而是给后续开发 / 自动化编排 / `Fabfile` 提供稳定任务源：
- 哪些值得做
- 为什么值得做
- 收益与成本如何排序
- 是否可并行
- 是否必须独立 worktree
- 哪些必须串行，避免互相干扰

状态治理约定：本页是 current-head backlog 的唯一状态源；`03` / `05` 只保留执行清单、设计裁决与完成标记，不再重复展开 `R-1` / `F-1` / `S-4` / `S-5` 的现状说明。

执行协议约定：本页只负责回答“开哪条线、能否并行、谁必须串行”；主会话与实施线如何分工、以及成功/失败如何统一单提交收口，一律以 `08-perf-execution-protocol.md` 为准。

编号说明：本页使用 routing track 编号；与 `03` / `05` 的历史 major-cut 编号不是同一命名空间。例：`03/05` 的 `F-1` = DevtoolsHub ring buffer，本文的 `F-1` = perf `fabfile.py` 自动化。

## 使用规则

1. 先读 `06-current-head-triage.md`，确认 current-head 的真实主线。
2. 再用本文件决定“现在做哪刀”以及“哪些副线可以并行”。
3. 主会话默认先编排并优先 `spawn_agent` 派发；真正实施前，先按 `08` 把任务开成独立实施线。仅在平台不可用、任务不可分拆、并行线硬冲突时，主会话保留少量本地动作。
4. 默认一次只推进一个主线切刀；副线只在低冲突时并行。
5. 若某条副线主要价值是修证据/gate，而不是 runtime 提速，不得阻塞主线。
6. 若某条副线的主要文件在当前工作区已存在未提交改动，应优先放到独立 worktree。
7. 若本页已经没有 still-open 高收益方向，则下一步不是硬开实现线，而是切回识别模式，优先开 docs-only scout worktree 补新的方向；新的方向回写到本页后，才重新进入消费。
8. 若用户明确要求 `实施高收益方向`，默认进入 fanout 模式：尽可能多消费本页 still-open 高收益方向；低冲突方向并行，高冲突方向串行；若本页当前无 still-open 方向，则改为并行 docs-only scout。

当前判定补充（`2026-03-06 / S-14`）：
- `probe_next_blocker` 在独立 worktree 的 real probe 已确认 remaining browser blocker queue clear。
- 默认不再存在 runtime 主线；`S-2` 已由 `S-14` 关闭，当前保留 `R-2` 架构/API 候选与 `P1-6'' owner-aware resolve engine` 结构性候选。
- `2026-03-14 / C-6` 又确认：`react.bootResolve.sync` 的旧税点主要是 RAF 轮询地板，不再作为 runtime watchlist。
- `2026-03-14 / C-7` 再次执行 `probe_next_blocker --json` 仍为 `clear`；当前不新增 backlog 项。
- `2026-03-19 / C-8(v2)` 在联合 gate 基线下出现 `4 clear + 1 blocked`，该轮分类为 `clear_unstable`。
- `2026-03-19 / C-9(post-p1-2-2c)` 在独立 worktree fresh reprobe 连续 5 轮 `clear`，current-head 分类更新为 `clear_stable`。
- `2026-03-19 / C-10(wave5)` 在当前母线 HEAD（含 reactbridge cleanup）独立 worktree fresh reprobe 连续 5 轮 `clear`，`clear_stable` 再次确认，routing 维持 docs/evidence-only。
- `2026-03-19 / C-11(stage-closeout)` 在母线回收 `docs-refresh-wave2 + D-4 list-rowid-gate` 后，current-head 又出现 `1 blocked + 3 clear`。当前 routing 回到 `clear_unstable`，且继续按 residual gate noise 处理 `externalStore.ingest.tickNotify`，不新开 runtime 主线。
- `2026-03-20 / C-13(p2-1 fresh reopen check)` 在 `agent/v4-perf-p2-1-reopen-check` 的最小验证命令上命中 `failure_kind=environment`。按 `09` 模板，trigger 不成立，本轮继续不开 `P2-1` 扩面实施线。
- `2026-03-20 / C-14(p1-3r fresh reopen check)` 在 `agent/v4-perf-p1-3r-reopen-check` 的最小验证命令上命中 `failure_kind=environment`。按 `09` 模板，trigger 不成立，本轮继续不开 `P1-3R` 实施线。
- `2026-03-20 / C-15(p0-1plus dispatch-shell fresh recheck)` 在 `agent/v4-perf-p0-1plus-dispatch-shell-recheck` 上完成同口径 5 轮重采样，`dispatch.p95/residual.avg` 相对 `P0-1+` 锚点未恶化且 `probe_next_blocker=clear`。按 `09` 模板，trigger 不成立，本轮不开 `P0-1+` 续砍实施线。
- `2026-03-21 / C-16(externalstore-threshold-localize-v4)` 在 `agent/v4-perf-externalstore-threshold-localize-v4` 上 fresh 复核后再次观察到同批次 `blocked/clear` 并存与失败层级漂移（`128/256/512`）。按 `09` 模板，trigger 不成立，routing 继续 `clear_unstable + edge_gate_noise`，本轮不开 runtime 实施线。
- `2026-03-21 / C-17(p2-1 env-ready fresh reopen check)` 在 `agent/v4-perf-p2-1-env-ready-recheck` 上完成环境就绪复核，focused tests 全绿；`probe_next_blocker` 命中 `externalStore.ingest.tickNotify` 的 threshold 失败（`first_fail_level=256`），该失败继续归类 `edge_gate_noise` 且不映射 `P2-1` 唯一最小切口。按 `09` 模板，trigger 不成立，本轮继续 docs/evidence-only。
- `2026-03-21 / C-17(R2 Gate-C stability recheck)` 在 `agent/v4-perf-r2-gate-c-stability-recheck` 上基于同口径 7 轮得到 `4 clear + 3 blocked`；`blocked` 全部集中在 `externalStore.ingest.tickNotify / full/off<=1.25`（`first_fail_level=128/256`）。相对 `v4-perf@fc0b3e3e` 的单点 `blocked`，Gate-C 更新为“可比性通过且仍有 edge gate noise”。`R-2` 继续 watchlist，等待 Gate-A/B。
- `2026-03-23 / C-30(state-trait single-field gate audit refresh)` 在母线补做 docs/evidence-only 收口：`probe_next_blocker --json` 再次 `status=clear`，`StateTrait.ExternalStoreTrait.SingleFieldFastPath.Perf.off` 的 isolated replay 5 轮全过，`multi-8 ratio` 稳定在 `0.968 ~ 1.008`。当前继续把 `SW-N2` 归类为 watchlist，不开实现线；只有 full-suite 同门再次复发且 isolated replay 也能稳定复现，才允许开 gate-only audit。
- `2026-03-23 / C-31(react-controlplane full phase-machine nextcut scout)` 在母线完成 docs-only 识别：`G5`、`G6`、`P1-6''` 已全部 `accepted_with_evidence`，`R-2` 又继续受外部 `SLA-R2` 阻塞，当前仓内唯一仍值得继续识别的内部方向变成“更大的 react controlplane phase-machine”。本轮建议先补 full phase-machine trigger package，不开实现线。
- `2026-03-23 / C-32(current phase terminal closeout)` 在母线完成终局裁决：`P1-3R`、`P2-1`、`SW-N2`、`P0-3/N-0` 与更大的 `react controlplane phase-machine` 全部按当前 phase `discarded_current_phase` 收口；`R-2` 改写为 `external_blocked`，不再算当前 phase 内部待消费方向。
- `2026-03-21 / C-18(p1-3r env-ready impl-check v2)` 在 `agent/v4-perf-p1-3r-env-ready-impl-check-v2` 上补齐环境后复跑 `P1-3R` 最小验证：focused tests 全绿且 `probe_next_blocker --json` 为 `clear`。按 reopen-plan 的 trigger1 判定，本轮仍不能把 externalStore batched writeback 归类为 top 固定税点，因此 trigger 不成立，继续 docs/evidence-only 并维持 watchlist。
- `2026-03-21 / C-19(p1-4b module pulse hub impl)` 在 `agent/v4-perf-p1-4b-module-pulse-hub` 上完成 `P1-4B-min(RuntimeExternalStore module pulse hub)` 实施：module/readQuery 同 module lowPriority bridge pulse 已完成 module 级合并，`typecheck + targeted tests + probe_next_blocker --json` 全部通过。按 `09` 模板，本轮更新为 `accepted_with_evidence`，`P1-4B` 从 watchlist 移出。
- `2026-03-21 / C-21(p1-4c pulse envelope selector delta impl)` 在母线 HEAD 上完成 `P1-4C-min(PulseEnvelope v0 + SelectorDeltaTopK)` 实施并 `accepted_with_evidence`：React bridge 输入已收敛为 moduleInstance 级 envelope，`useSelector` 已接入保守跳过，且最小验证链路在独立 worktree 证据中为 `status=clear`。后续 cross-plane 续线优先转为 single-path cleanup（见 `docs/perf/2026-03-21-crossplane-post-p1-4c-nextwide-identify.md`）。
- `2026-03-22 / C-22(p1-4d single-path cleanup impl attempt)` 在 `agent/v4-perf-p1-4d-single-path-cleanup` 按 `P1-4D-min` 发起实施尝试，最小验证命中环境阻塞（`node_modules missing`，`tsc/vitest` 不可用），未形成可比证据；按门禁已回滚实现并 docs/evidence-only 收口，`P1-4D` 维持 watchlist（见 `docs/perf/2026-03-22-p1-4d-min-single-path-cleanup.md`）。
- `2026-03-22 / C-23(crossplane single-pulse contract scout)` 在 `agent/v4-perf-scout-crossplane-single-pulse-contract` 完成 docs-only 只读侦察：当前代码基线已无 `LOGIX_CROSSPLANE_TOPIC` 双路径，`P1-4D` 的结构收益面不足；下一线改为 `P1-4F-min core->react single pulse contract`，目标是把 `RuntimeStore.commitTick dirtyTopics fanout -> RuntimeExternalStore.requestPulse` 的重复调度链压成“每 module 每 tick 单脉冲输入 + 单订阅路径”（见 `docs/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.md`）。
- `2026-03-22 / C-24(p1-4f implementation-ready check)` 在 `agent/v4-perf-p1-4f-single-pulse-contract` 完成 docs/evidence-only 收口：该轮初始结论为 `not-ready`，核心 blocker 收敛为 selector interest contract、readQuery activation retain 生命周期、`useSelector` 单订阅路径合同三项；后续已由 freeze v2 收口为 `implementation-ready=true`（见 `docs/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.md`、`docs/perf/2026-03-22-p1-4f-single-pulse-contract-freeze-v2.md`）。
- `2026-03-21 / C-20(stage-g5-kernel-v0 evidence)` 在 `agent/v4-perf-react-controlplane-stage-g5-evidence` 独立 worktree 上对 `Stage G5 kernel v0` 做同口径复验：`typecheck:test`、`runtime-bootresolve-phase-trace`、`probe_next_blocker --json` 全部通过且 `status=clear`。按 `09` 模板，将该切口从 `merged_but_provisional` 升级为 `accepted_with_evidence`，并要求后续 Stage G 扩面继续走独立线。
- `2026-03-22 / C-22(stage-g6-kernel-v1 impl)` 在 `agent/v4-perf-react-controlplane-stage-g6-kernel-v1` 独立 worktree 上完成 `Stage G6 ControlplaneKernel v1`：`config snapshot confirm` 的 run 触发统一纳入 owner ticket，phase-trace 用例补齐“同 ownerKey+epoch 单次 commit”与“过期 ticket reason 码”。最小验证里 `typecheck:test` 与 phase-trace 全绿，`probe_next_blocker` 首轮命中 `form.listScopeCheck` 阈值波动，复跑恢复 `status=clear`；按 `09` 模板本轮更新为 `accepted_with_evidence`。
- `2026-03-22 / C-22(sw-n2-fieldpathid-table-and-stable-anchor impl-check)` 在 `agent/v4-perf-sw-n2-fieldpathid-table` 上执行 `SW-N2` 最小切口验证后，按约束回滚实现并 docs/evidence-only 收口：`typecheck:test` 通过、`probe_next_blocker=clear`，但 `pnpm -C packages/logix-core test` 在 clean 状态仍未全绿。按成功门，本轮 `accepted_with_evidence=false`，`SW-N2` 继续保留为 pending watchlist（见 `docs/perf/2026-03-22-sw-n2-fieldpathid-table-and-stable-anchor-impl-check.md`）。
- `2026-03-22 / C-23(react-controlplane post-g6 next-cut scout)` 在 `agent/v4-perf-scout-post-g6-owner-resolve` 完成 docs-only 识别收口：当前 `probe_next_blocker` 的 `externalStore/form` 失败样本归类为 gate noise，react controlplane 的真实下一刀收敛为 `P1-6'' owner-aware resolve engine`（`ControlplaneKernel v2` 提案）；本轮不实施代码、不改 public API，只更新 routing 与证据索引（见 `docs/perf/2026-03-22-identify-react-controlplane-next-cut-post-g6-owner-resolve.md`）。
- `2026-03-22 / C-24(p1-6pp design package)` 在 `agent/v4-perf-p1-6pp-owner-resolve-engine` 完成 docs/proposal-only 收口：该轮把缺口收敛到 `OwnerResolveRequested` 内部合同、stale/commit reason 矩阵、四入口 phase-trace 字段集与断言矩阵；后续已由 contract freeze 收口为 `implementation-ready=true`（见 `docs/perf/2026-03-22-p1-6pp-owner-resolve-engine-design-package.md`、`docs/perf/2026-03-22-p1-6pp-owner-resolve-engine-contract-freeze.md`）。
- `2026-03-22 / C-23(state-write post-sw-n2 scout)` 在 `agent/v4-perf-scout-state-write-anchor-v2` 上完成 docs-only 识别：唯一建议下一刀为 `SW-N3 Degradation-Ledger + ReducerPatchSink contract`，优先把 `customMutation/dirtyAll` 降级链路升级为可预算、可归因、可门禁的统一协议；`SW-N2` 继续保留 watchlist，等待 correctness gate 全绿后再评估重开（见 `docs/perf/2026-03-22-identify-state-write-next-cut-post-sw-n2.md`）。
- `2026-03-22 / C-25(sw-n3 design package)` 在母线完成 docs/proposal-only 收口：当前 `SW-N3` 仍 `implementation-ready=false`，必须先冻结 `StateWriteIntent` 合同、`ReducerPatchSink` 决策矩阵、`state:update` / devtools / perf 指标词表与 focused validation matrix，再决定是否开 implementation line（见 `docs/perf/2026-03-22-sw-n3-degradation-ledger-design-package.md`）。
- `2026-03-22 / C-28(sw-n3 contract freeze)` 在母线完成 docs-only 合同冻结：`SW-N3` 已提升为 `implementation-ready=true`，后续可直接按冻结的 `StateWriteIntent` 合同、`ReducerPatchSink` 决策矩阵、统一词表与验证矩阵开独立 implementation line（见 `docs/perf/2026-03-22-sw-n3-contract-freeze.md`）。
- `2026-03-22 / C-29(sw-n3 implementation line)` 在独立 worktree `v4-perf.sw-n3-degradation-ledger-impl` 完成最小实现与验证：`stateWrite` 已接入 `state:update` slim meta，core/devtools 最小测试与 `probe_next_blocker --json` 全绿；当前按 `merged_but_provisional` 收口，等待首轮 `stateWrite.degradeRatio / degradeUnknownShare` 可比工件再决定是否升级为 `accepted_with_evidence`（见 `docs/perf/2026-03-22-sw-n3-degradation-ledger-impl.md`）。
- `2026-03-22 / C-23(runtime-shell attribution scout post N-2)` 在 `agent/v4-perf-scout-runtime-shell-attribution-next` 完成 docs-only 全链路复盘：`N-1 freeze` 已证伪、`N-2 ledger` 已落地、`P0-1+/P0-2` 无新增最小代码切口。下一线唯一推荐切换为 `N-3 runtime-shell.resolve-boundary-attribution-contract`，先统一归因协议与 `snapshot/noSnapshot` 边界，再决定是否进入 `noSnapshot` 压缩实施线（见 `docs/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.md`）。
- `2026-03-22 / C-26(n-3 design package)` 在母线完成 docs/proposal-only 收口：该轮把缺口收敛到 boundary decision 合同、reason taxonomy、ledger v1.1 字段分层与 focused validation matrix；后续已由 contract freeze 收口为 `implementation-ready=true`（见 `docs/perf/2026-03-22-n-3-runtime-shell-attribution-design-package.md`、`docs/perf/2026-03-22-n-3-contract-freeze.md`）。
- `2026-03-22 / C-23(diagnostics-budget-unify scout)` 在 `agent/v4-perf-scout-diagnostics-budget-unify` 完成 docs-only 侦察：基于 `externalStore` 阈值摆动与 Gate-C/G6 复核证据，新增 `D-5` 作为唯一结构性候选，方向是 `Diagnostics Cost-Class Protocol + Gate Plane Split`，用分层 gate 剥离 edge gate noise 并压低 full 诊断税点（见 `docs/perf/2026-03-22-diagnostics-budget-unify-scout.md`）。
- `2026-03-22 / C-24(d5-min cost-class + gate-plane split impl)` 在 `agent/v4-perf-d5-diagnostics-gate-split` 独立 worktree 上完成 `D-5-min`：`RuntimeDebugEventRef`、`DevtoolsHub.exportBudget`、`devtools:projectionBudget` 已带 `costClass/gateClass/samplingPolicy`，`fabfile.py probe_next_blocker` 只把 `hard` 阈值异常当 blocker，`externalStore.ingest.tickNotify / full/off<=1.25` 已移入 soft watch。最小验证链路与 `probe_next_blocker --json` 全绿，按 `09` 模板本轮更新为 `accepted_with_evidence`。
- `2026-03-22 / C-23(r2-api-unify-direction-scout)` 在 `agent/v4-perf-scout-r2-api-unify` 完成 docs-only 全局 scout：`R-2` 收敛为唯一推荐方向 `R2-U PolicyPlan contract reorder`。裁决要点是以 API 收缩替代继续 widening，把 `txnLanes* / txnLanePolicy*` 双族输入与运行时字段级覆盖解析前移到编译期，热路径只读 `policyProfileId` 的已编译表；本轮不进入 `packages/**`，继续维持 watchlist 并等待 Gate-A/B（见 `docs/perf/2026-03-22-r2-api-unify-direction-scout.md`）。
- `2026-03-22 / C-27(r2-u design package)` 在母线完成 docs/proposal-only 收口：`R2-U` design package 已落盘，进入 trigger package 收口阶段（见 `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`）。
- `2026-03-22 / C-27b(r2-u trigger bundle v1)` 在母线补齐最小 trigger bundle：`SLA-R2-*` 模板、`Gap-R2-*` 模板、migration bundle 绑定包、`Gate-E` 开线裁决草稿均已落盘。当前 `implementation-ready=false` 的唯一阻塞收敛为外部 `SLA-R2` 实值输入（见 `docs/perf/2026-03-22-r2-u-trigger-bundle-v1.md`）。

## D-3 执行协议（当前默认）

1. 主会话默认保持干净，只负责选路、派线、审查、合流；命中三类例外条件时允许少量本地动作，并在收口记录里写明触发原因。
2. 每条活跃线都必须映射到独立 `worktree + branch + owner`；owner 默认是 subagent。仅在平台不可用、任务不可分拆、并行线硬冲突时，才由主会话临时接手最小实现动作。不要让两条实施线共享同一可写工作区。
3. 本页里的“可并行/必须串行”判断对象是“实施线”，不是“提交数量”。
4. 每条实施线结束时，相对主分支只允许保留 `1` 个最终 HEAD commit；中间试验提交可以存在于线内，但交接前必须压成 `1` 个最终提交。
5. 成功线与失败线都必须收口为 `1` 个提交：
   - 成功线保留最终有效 diff，并在同一提交内完成必要的 `docs/perf/*` 回写。
   - 失败线清掉半成品代码，只保留失败结论需要的 dated evidence / routing 更新；不要拆成多次“补文档”提交。
6. 主会话只审查这 `1` 个最终提交；若不通过，退回原实施线继续收口，而不是在主会话里二次拼 diff。

## 排序原则

1. 先看是否命中 current-head 的 P1 主门。
2. 再看收益是否横向可复用。
3. 再看它是在修真实 runtime，还是只在修 benchmark/gate 噪声。
4. 最后才看 API 是否值得动；未逼到墙角，先不动表面 API。

## Backlog 总表

| ID | 类别 | 问题 | 预期收益 | 成本 | 冲突风险 | 并行策略 | API 变动 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-1` | runtime 主线（已关闭） | `txnLanes.urgentBacklog` 在 `S-10` native-anchor 纠偏后，`mode=default/off` 的 `urgent.p95<=50ms` 都已过到 `steps=2000`；不再继续 queue-side runtime cut | 很高 | 中高 | 高 | 已关闭；仅在新证据下重开 | 暂不需要 |
| `S-1` | 稳定性副线（已关闭） | `externalStore.ingest.tickNotify` broad residual 复核已完成 | 中 | 低到中 | 低 | 已关闭 | 不需要 |
| `S-2` | benchmark 纠偏（已完成第四刀 / 已关闭） | watchers 双轨语义 + paired phase evidence + display 首屏 + native-anchor pre-handler split 已落地；后续只在 report 漂移或新 native-anchor 证据下重开 | 中 | 中 | 中 | 已关闭；如重开需独立 worktree | 不需要 |
| `S-3` | gate/matrix 清理 | 已收口：`decision` gate 已拆到 auto-only suite，`converge.txnCommit` 不再把 full/dirty 的 `notApplicable` 记为失败 | 中 | 低 | 低 | 可并行 | 不需要 |
| `F-1` | 自动化工具（已完成） | `fabfile.py` 已转为现成工具，不再占用 backlog | 中 | 中 | 低 | 已完成 | 不需要 |
| `S-4` | 验证解锁副线（已完成） | `RuntimeExternalStore delayed teardown` 最小修复已吸收，已从默认 blocker 列表移除 | 中 | 中 | 中 | 已完成 | 不需要 |
| `S-5` | 验证解锁副线（已关闭） | `react.strictSuspenseJitter` 已按 current-head 代码状态复核关闭，不再作为默认 blocker | 中 | 低 | 低 | 已关闭 | 不需要 |
| `S-6` | collect 稳定化副线（已关闭） | browser perf collect 首轮预热噪声已复核，不保留基础设施补丁 | 中 | 低 | 低 | 已关闭 | 不需要 |
| `S-9` | control-surface 识别（已完成） | `txn-lanes` native event window observation 已证明主延迟落在 schedule->handler invoke，而不是 queue 内 | 中 | 低到中 | 低 | 已完成 | 不需要 |
| `S-10` | benchmark 纠偏（已完成） | `txn-lanes` 已改成 `nativeCapture -> MutationObserver DOM stable` 语义；三轮 targeted 与 1 次 clean-HEAD verify 都让 `urgent.p95<=50ms` 通过到 `steps=2000` | 中 | 低到中 | 低 | 已完成 | 不需要 |
| `S-11` | blocker 识别（已完成） | post-S10 real probe 证明 remaining browser blocker queue clear；current-head 无新的默认 runtime blocker | 中 | 低 | 低 | 已完成；docs/evidence-only 收口 | 不需要 |
| `SW-N3` | state-write 协议重排候选 | `SW-N1` 后将 `customMutation/dirtyAll` 降级路径统一为 `StateWriteIntent` + `ReducerPatchSink` 合同，建立 degrade ratio/reason code 预算门 | 高 | 中高 | 中高 | `2026-03-23` 已 `accepted_with_evidence`；后续只在需要扩展示图时再开低冲突线 | 暂不需要（预留可选 API 提案） |
| `R-2` | 架构/API 候选 | `TxnLanePolicy` widening 之后仍存在双族输入与热路径覆盖解析税；当前唯一具体候选为 `R2-U PolicyPlan contract reorder` | 潜在很高 | 高 | 高 | 当前先补 trigger package；仅在 Gate-A/B/E 与绑定后的 migration bundle 满足时单开 | 需要 |
| `P1-4F` | cross-plane single pulse 合同候选 | `P1-4C` 之后仍存在 core/react 交界的重复调度税；`selector interest / retain 生命周期 / 单订阅路径` 三项合同已冻结 | 高 | 高 | 高 | `2026-03-23` 已 `accepted_with_evidence`；后续不再占用 still-open 名额 | 当前不需要 |
| `P1-6''` | react controlplane 结构线候选 | post-G6 后仍存在 owner-aware resolve 归约缺口；四入口 owner-phase 合同、reason 矩阵与 phase-trace 字段集已冻结 | 高（结构性减税 + 可诊断性提升） | 高 | 中高 | `2026-03-23` 已 `accepted_with_evidence`；后续更大切口另行识别 | 当前不需要（保留 API proposal 预案） |
| `P0-3` | runtime-shell 结构候选（watchlist） | post N-2 的统一归因协议、shell 复用口径与 `snapshot/noSnapshot` 边界契约已由 `N-3` implementation line 吸收 | 高 | 中 | 中 | `2026-03-23` 已 `accepted_with_evidence`；后续按新的 reasonShare 决定唯一 nextcut | 可选（默认不改 public API） |
| `D-5` | 诊断/门禁结构候选（已完成最小切口） | diagnostics/controlplane/devtools 预算链路分层：`costClass` 协议 + `hard/soft` gate 拆分，降低 `full/off<=1.25` 摆动触发 | 高 | 中高 | 中 | `D-5-min` 已实施并收口；后续只在新 soft watch 出现时再扩面 | 协议需要，public API 可选 |

## Future Candidate Pool

本页继续维持 current-head backlog 的唯一状态源。

`current-head=clear` 之后的后续尝试池，单列在：

- `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`

使用约束：

1. 这份候选库不参与当前排期。
2. 只有 `09-worktree-open-decision-template.md` 的 trigger 成立后，才允许从候选库里选线。
3. 后续实验默认从 `v4-perf` 再拉独立 worktree。
4. 候选库当前无“默认第一刀”；触发后只按 watchlist 条件选线。

`2026-03-19` 快照（与候选库主文档同步）：
- 已吸收到母线：`P0-1`、`P0-2`、`P1-4`、`P1-5`、`P1-6`、`P1-7`、`P2-3`，以及新增的 `P2-4` observability 线。
- wave2 补充：`react subscription residual` 的两条实施线（`react selector listener multiplex`、`selectorTopicEligible` 覆盖提升）已吸收进母线，归并到 `P1-5/P2-3` 收口口径。
- stage-closeout 补充：`D-4 list-rowid gate` 已吸收到母线，并完成 focused evidence 收口，不再作为 future-only 候选。
- 部分吸收：`P1-1`、`P1-2`、`P2-2`（其中 `P2-2B` 为 rejected/docs-only）。
- rejected/docs-only：`P1-3` 主题目继续维持否决态（只保留 `P1-3R` 条件性重开）。
- 仍保留 watchlist 的 top 级项：`R-2`。
- `2026-03-20` fresh reopen check 补充：`P2-1` 一度因 environment 阻塞未形成可比触发器。
- `2026-03-21` env-ready fresh recheck 补充：`P2-1` 环境已就绪，但本轮失败点仍为 `externalStore` residual gate noise；继续 watchlist，等待可映射到 `converge/lanes` 的唯一触发器。
- `2026-03-20` fresh reopen check 补充：`P1-3R` 仍处于 watchlist；当前阶段先修复环境并获取非 environment 的 fresh 证据，再判断是否重开。
- `2026-03-20` fresh recheck 补充：`P0-1+ dispatch-shell` 已按 evidence-only 关闭；后续仅在“5 轮中位数持续抬升 + 非 environment blocker”同时成立时重开。
- `2026-03-21` Gate-C 稳定性复核补充：`R-2` 已具备非 environment 的可比 probe 样本，当前不阻塞点在 Gate-C，阻塞点仍是 Gate-A/B 未触发。
- `2026-03-21` `P1-4B-min RuntimeExternalStore module pulse hub` 补充：已在 `agent/v4-perf-p1-4b-module-pulse-hub` 实施并通过最小验证链路，结果 `accepted_with_evidence`；`P1-4B` 当前从 future-only watchlist 移除。
- `2026-03-21` `P1-4C-min PulseEnvelope v0 + SelectorDeltaTopK` 补充：已实施并 `accepted_with_evidence`；后续 cross-plane 续线进入“single-path 已落地基线 + single-pulse 合同化”阶段（见 `docs/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.md`）。
- `2026-03-22` `P1-4D-min remove LOGIX_CROSSPLANE_TOPIC dual path` 补充：已发起实施尝试但验证环境阻塞，按门禁回滚实现并 docs/evidence-only 收口；同日 scout 复核代码基线后，后续方向改为 `P1-4F-min core->react single pulse contract`，`P1-4D` 不再作为唯一优先线。
- `2026-03-22` `P1-4F-min core->react single pulse contract` 补充：implementation-ready 检查已按 docs/evidence-only 收口，初始 blocker 收敛为 selector interest contract、readQuery activation retain 生命周期、`useSelector` 单订阅路径合同。
- `2026-03-22` `P1-4F single pulse contract freeze v2` 补充：三项 blocker 已冻结到 C1/C2/C3 合同与成功门/失败门，当前已提升为 `implementation-ready=true`，可直接开 implementation line。
- `2026-03-23` `P1-4F single pulse contract` 补充：独立 implementation line 已完成并 `accepted_with_evidence`；selector interest、readQuery activation 生命周期与单订阅路径已落地，新增专测已补齐。
- `2026-03-21` `Stage G5 kernel v0 (neutral-settle no-refresh)` 补充：已在 `agent/v4-perf-react-controlplane-stage-g5-evidence` 完成独立 worktree 复验并升级为 `accepted_with_evidence`；后续 Stage G 仅保留更大切口 watchlist。
- `2026-03-22` `Stage G6 kernel v1 (owner-ticket unify confirm triggers)` 补充：已在 `agent/v4-perf-react-controlplane-stage-g6-kernel-v1` 完成实施并 `accepted_with_evidence`；后续 Stage G 继续保留更大重排切口 watchlist（如 `P1-6'' owner-aware resolve engine`）。
- `2026-03-22` `post-G6 next-cut scout` 补充：已在 docs-only 路径收口唯一建议下一刀为 `P1-6'' owner-aware resolve engine`；并明确 `probe_next_blocker` 的 `externalStore/form` 摆动属于 gate 噪声，不能作为该线收益归因锚点。
- `2026-03-22` `P1-6'' owner-aware resolve engine` 补充：design package 已完成 docs/proposal-only 收口，缺口已收敛到 `OwnerResolveRequested`、reason 矩阵、四入口 phase-trace 与断言矩阵。
- `2026-03-22` `P1-6'' owner-aware resolve engine contract freeze` 补充：D1~D4 已冻结，当前已提升为 `implementation-ready=true`，可直接开 implementation line。
- `2026-03-23` `P1-6'' owner-aware resolve engine` 补充：独立 implementation line 已完成并 `accepted_with_evidence`；四入口 owner resolve 合同、reasonCode、epoch/ticket/readiness 已统一进入 phase-trace 主链。
- `2026-03-22` state-write post SW-N2 补充：`SW-N3 Degradation-Ledger + ReducerPatchSink contract` 升级为唯一建议下一刀；`SW-N2` 维持 watchlist，后续重开条件由更晚的 gate audit 继续收紧。
- `2026-03-22` `SW-N3 Degradation-Ledger + ReducerPatchSink contract` 补充：design package 已完成 docs/proposal-only 收口，当前仍 `implementation-ready=false`；后续先冻结 `StateWriteIntent` 合同、`ReducerPatchSink` 决策矩阵、`state:update` / devtools / perf 指标词表与 focused validation matrix，再决定是否开 implementation line。
- `2026-03-22` `SW-N3 Degradation-Ledger + ReducerPatchSink contract` 补充：contract freeze 已完成，当前已提升为 `implementation-ready=true`；后续实现线直接沿冻结合同与验证矩阵推进。
- `2026-03-22` `SW-N3 Degradation-Ledger + ReducerPatchSink contract` 补充：implementation line 已完成最小数据面接线与验证，当前按 `merged_but_provisional` 收口；在首轮 degradeRatio/degradeUnknownShare 可比工件落盘前，不计入正式 perf win。
- `2026-03-23` `SW-N3 evidence closeout` 补充：独立 evidence 线已完成并 `accepted_with_evidence`；`readCoverage / degradeRatio / degradeUnknownShare` 已进入 Devtools 稳定读取面。
- `2026-03-22` `P0-3 runtime-shell post N-2 scout` 补充：唯一建议下一线更新为 `N-3 runtime-shell.resolve-boundary-attribution-contract`，以归因协议收敛驱动切口选择；`N-0 runtime-shell.noSnapshot.shrink` 维持次选。
- `2026-03-22` `N-3 runtime-shell.resolve-boundary-attribution-contract` 补充：design package 已完成 docs/proposal-only 收口，缺口已收敛到 boundary decision 合同、reason taxonomy、ledger v1.1 字段分层与 focused validation matrix。
- `2026-03-22` `N-3 runtime-shell attribution contract freeze` 补充：当前已提升为 `implementation-ready=true`，可直接开独立 implementation line。
- `2026-03-23` `N-3 runtime-shell attribution contract` 补充：独立 implementation line 已完成并 `accepted_with_evidence`；runtime-shell ledger 已产出统一 decision attribution，后续可按 `reasonShare` 选择唯一 nextcut。
- `2026-03-22` `R-2 API unify scout` 补充：`R-2` 已给出唯一建议下一刀 `R2-U PolicyPlan contract reorder`，进入 implementation line 前仍需 Gate-A/B/E 全通过。
- `2026-03-22` `R2-U PolicyPlan contract reorder` 补充：design package 与 trigger bundle v1 已完成 docs/proposal-only 收口，当前仍 `implementation-ready=false`；剩余阻塞只剩外部 `SLA-R2` 实值输入。
- `2026-03-23` post-fanout re-identify 补充：当前没有新的 ready 实施线；`SW-N2` 仍被 `packages/logix-core test` 全绿门阻塞，但最新失败样本在 isolated 单跑中未复现，更像 full-suite perf gate 噪声。下一步若继续，只建议开 `SW-N2 gate comparability` 的 docs-only scout。
- `2026-03-23` `SW-N2 gate comparability scout` 补充：独立 5 轮复跑结果为 `4 pass + 1 fail`，当前 failing suite 不具稳定回归形态；继续 watchlist，不开实现线。
- `2026-03-23` `StateTrait single-field gate audit refresh` 补充：current-head probe refresh 继续 `clear`，isolated replay 5 轮全过，`multi-8<=1.08` 未再越门；`SW-N2` 的 reopen 条件收紧为“full-suite 同门稳定复发 + isolated replay 也能复现”。
- `2026-03-23` `react controlplane full phase-machine nextcut scout` 补充：`G5`、`G6`、`P1-6''` 吃完后，仓内仍具识别价值的内部方向只剩更大的 full phase-machine；当前下一步先补 docs-only trigger package，不开实现线。
- `2026-03-23` `current phase terminal closeout` 补充：当前 phase 内部方向已全部走到终局状态；`P1-3R`、`P2-1`、`SW-N2`、`P0-3/N-0` 与更大的 full phase-machine 不再保留 still-open 身份，`R-2` 单独转为 `external_blocked`。

## 任务详情

### `R-1` · `txnLanes` backlog policy split（已关闭：由 `S-10` native-anchor benchmark cut 收口）

状态：
- `2026-03-06` 的 `S-9` / `R-1 invoke-window` 已证明旧主延迟落在 `schedule -> handler invoke`，不是 queue 内。
- `2026-03-06` 的 `S-10` 再把 suite 起点前移到页面内 `nativeCapture`，并把终点收紧到 `MutationObserver` 看到的 DOM stable。
- 在这组语义下，两轮 targeted (`after + recheck`) 都显示：`mode=default/off` 的 `urgent.p95<=50ms` 通过到 `steps=2000`。

问题：
- 旧的 `txnLanes.urgentBacklog` 失败不再能作为 runtime queue 主 blocker 立项。
- 之前的 `50ms+` 主要是 control-surface / automation / admission 语义，而不是 `enqueueTransaction` / baton steady-state 成本。

最新状态：
- `docs/perf/archive/2026-03/2026-03-06-r1-txn-lanes-invoke-window-failed.md`：证明主延迟在 handler invoke 之前。
- `docs/perf/archive/2026-03/2026-03-06-s10-txn-lanes-native-anchor.md`：正式把 suite 改成 `nativeCapture -> MutationObserver DOM stable`，并完成三轮 targeted + 1 次 clean-HEAD verify 收口。
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.recheck.targeted.json`：默认/关闭模式的 `urgent.p95<=50ms` 都是 `maxLevel=2000 / firstFailLevel=null`。
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.verify.targeted.json`：在 `a76af988` clean HEAD 上再次复验，`git.dirty=false` 且默认/关闭模式仍是 `maxLevel=2000 / firstFailLevel=null`。

架构缺陷：
- 旧 harness 把页面外 `.click()` 调度与页面内 runtime 处理混进同一个指标，导致 queue-side runtime cut 被假问题驱动。

预期收益：
- 在当前语义下，继续做 queue/runtime 微调已没有明确收益。
- 真正值得保留的是 control-surface 解释链，而不是继续磨 queue 常数。

实施成本：
- 已完成。
- 当前不再建议在 `packages/logix-core/**` 上继续开这条线。

主要落点：
- `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`
- `docs/perf/archive/2026-03/2026-03-06-s10-txn-lanes-native-anchor.md`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.confirm.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.recheck.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.s10-txn-lanes-native-anchor.verify.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1-to-s10-txn-lanes-native-anchor.targeted.json`

并行/串行：
- 这条线已关闭，不再占用 runtime 主线串行槽位。
- 若未来要重开，只能以新的 SLA 定义或新的 native-anchor 证据为前提，不能直接回到旧的 queue-side runtime 尝试。

API 变动：
- 当前不需要。
- 不要再重复 blind first-host-yield、handoff-lite、post-urgent visibility window 这类 queue-side 旧试探。

### `S-1` · `externalStore` broad residual 复核（已完成）

状态：
- 已于 `2026-03-06` 完成 clean targeted audit，并收口为 residual/noise。

问题：
- current-head broad matrix 只在 `watchers=256` 的 `full/off<=1.25` 掉了一次，targeted 到 `512` 全绿。
- 这更像 residual / broad-matrix 噪声，不像当前真实 runtime 主线。

收口证据：
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r3.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r4.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.audit.external-store.current.quick.r5.json`
- 五轮结果均为 `maxLevel=512 / firstFailLevel=null`，因此 broad `watchers=256` 单点红样本已按 residual/noise 关闭。

架构缺陷：
- current-head 真相源仍可能被 broad 单点 residual 误导；缺少 clean/comparable 复核时，容易过早下热路径优化结论。

预期收益：
- 中等。
- 主要价值是提高结论确定性，避免把不是主线的问题继续当主线砍。

实施成本：
- 已完成。
- 结论是 residual/noise，不进入内核重构。

主要落点：
- `packages/logix-core/src/internal/state-trait/external-store.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx`
- `docs/perf/02-externalstore-bottleneck-map.md`

并行/串行：
- 已完成，无需继续排期。
- 若后续再次出现单点红样本，先按本节证据口径做 clean targeted audit，再决定是否重新打开。

API 变动：
- 当前不需要。
- 只有复核后 residual 稳定复现，才考虑继续推进 `StateTrait.externalStore({ writeback })` 方向。

### `S-2` · `watchers.clickToPaint` suite 语义纠偏（已完成第四刀 / 已关闭）

状态：
- 已于 `2026-03-06` 完成第一刀：双轨语义（`clickToDomStable` + `clickToPaint`）已合回主分支。
- 已于 `2026-03-06` 完成第二刀：`S-12` 把 red sample 收紧成同 sample phase evidence（`clickToHandler / handlerToDomStable / domStableToPaintGap`）。
- 已于 `2026-03-06` 完成第三刀：`S-13` 把 paired phase evidence 提升到 diff / triage / artifact report 首屏，并明确禁止再用 `watchers.clickToPaint - watchers.clickToDomStable` 的跨 suite 聚合差值解释红样本。
- 已于 `2026-03-06` 完成第四刀：`S-14` 把旧 `clickToHandler` 再拆成 `clickInvokeToNativeCapture / nativeCaptureToHandler`，并确认 dominant phase 是页面外 click 注入税，而不是页面内 `nativeCapture->handler`。
- 当前不再是 runtime 主线；解释链 / 展示层 / native-anchor 不确定性都已收口。若要重开，仅限新的 report drift、display 缺口或新的 native-anchor 漂移。

问题：
- `watchers=1` 就已经超 `50ms`，且曲线非单调。
- current-head 与 targeted 证据一起看，更像 benchmark 把 browser/react floor 混进 watcher runtime 结论。

架构缺陷：
- runtime、benchmark、gate 三层边界不够硬。
- suite 在测什么、runtime 在优化什么，没有完全对齐。

预期收益：
- 中等。
- 不直接提速 runtime，但能显著减少误报与误判，防止继续追假问题。

实施成本：
- 中等。
- 需要统一 warmup / settle / click-to-paint 语义，并让 red sample 自带 phase evidence。
- 已完成第一刀：拆成 `clickToDomStable` + `clickToPaint` 双轨。
- 已完成第二刀：phase evidence 跟随单次 sample 落盘，不再依赖两条独立 suite 的聚合差值来解释超线。
- 已完成第三刀：`summary.highlights` / `suites[].watchersPhaseDisplay` / artifact `triage highlights` 都会直接展示主要 phase，并把“禁止跨 suite 做减法”写成固定 guidance。
- 已完成第四刀：phase evidence 进一步拆成 `clickInvokeToNativeCapture / nativeCaptureToHandler / handlerToDomStable / domStableToPaintGap` 四段，并确认 page-external tax 才是 dominant segment。

主要落点：
- 第一/二刀：`packages/logix-react/test/browser/watcher-browser-perf.test.tsx`、`packages/logix-react/src/internal/store/perfWorkloads.ts`、`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- 第三刀：`.codex/skills/logix-perf-evidence/scripts/diff.ts`、`.codex/skills/logix-perf-evidence/scripts/ci.interpret-artifact.ts`、`docs/perf/archive/2026-03/2026-03-06-s13-watchers-phase-display.md`
- 第四刀：`packages/logix-react/test/browser/watcher-browser-perf.test.tsx`、`.codex/skills/logix-perf-evidence/assets/matrix.json`、`.codex/skills/logix-perf-evidence/scripts/watchers-phase-display.ts`、`docs/perf/archive/2026-03/2026-03-06-s14-watchers-native-anchor-pre-handler-split.md`

并行/串行：
- 语义上与 `R-1` 低冲突，可并行。
- 但它会直接改变 benchmark 语义并影响 current-head 可比性，因此真正实施时应强制独立 worktree。

API 变动：
- 不需要。

### `S-3` · `converge` gate / matrix applicability 清理

状态：
- 已完成（`2026-03-06`，见 `docs/perf/archive/2026-03/2026-03-06-s3-converge-gate-applicability.md`）。
- `decision` gate 已拆到 auto-only suite `converge.txnCommit.autoDecision`；主 `converge.txnCommit` 不再把 full/dirty 的 `notApplicable` 记成失败。

问题：
- 原问题已收口；当前剩余的 shared 级别工作只是“让 applicability 成为汇总层的一等语义”。

架构缺陷：
- `notApplicable` / `decisionMissing` 不是汇总视图中的一等语义。
- 预算定义、suite 产出与报告汇总之间缺少更强的 applicability 建模。

预期收益：
- 中等。
- 不直接提速 runtime，但能净化 perf 信号，降低后续路线误判率。

实施成本：
- 低。
- 本次通过 matrix + test 的局部 split-suite 收口，暂未动 shared harness。

主要落点：
- `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`
- `.codex/skills/logix-perf-evidence/assets/matrix.json`
- 必要时补 `logix-perf-evidence` 的汇总脚本

并行/串行：
- 已完成，不再占用主线时段。
- 若未来要 shared 化 applicability，可继续与 `R-1` 并行，但需另开独立小刀。

API 变动：
- 不需要。

### `S-5` · `react.strictSuspenseJitter` refresh unblock（已关闭）

状态：
- 已于 `2026-03-06` 按 current-head / 主分支代码状态复核通过，收口记录见 `docs/perf/archive/2026-03/2026-03-06-s5-suspense-refresh-unblock.md`。
- 当前默认视为已关闭的 collect unblock，不再占用并行槽位；只有在 clean/comparable 环境再次稳定复现时才重开。

### `F-1` · `Fabfile` 自动化编排（已完成）

状态：
- 已完成；`fabfile.py` 已转为现成工具，默认直接复用 `list-tasks` / `show-task` / `plan-parallel`。
- `F-3` / `F-5` 已补上 `list_merge_ready` / `show_branch_diff` 的 base 语义：默认以当前所在分支为 base，若要回看主分支视角，需显式传 `--base main`。
- `F-4` 已补上 `probe_next_blocker`，会按 `04-agent-execution-playbook.md` 预设顺序逐个跑 targeted browser suites，遇到第一个失败即停，并明确列出 remaining blocker 队列。
- `S-11` 已把关闭的 `txnLanes` 从默认 blocker probe 队列移除；当前默认顺序只剩 `externalStore -> runtimeStore -> form`，real probe 结果为 `next_blocker: none`。
- `C-8(v2)` 已在该默认顺序上完成 5 轮稳定性复测，其中 `r3` 在 `externalStore.ingest.tickNotify` 触发 `full/off<=1.25`（`firstFailLevel=128`）阈值异常。
- `C-9(post-p1-2-2c)` 在同一顺序上 fresh 连跑 5 轮，`r1~r5` 全部 `clear`，无 `blocker/pending/threshold_anomalies`，分类更新为 `clear_stable`。
- 详细完成记录保留在 `docs/perf/archive/2026-03/2026-03-06-f1-perf-fabfile.md`、`docs/perf/archive/2026-03/2026-03-06-f2-perf-fabfile-worktree-plan.md`、`docs/perf/archive/2026-03/2026-03-06-f3-perf-fabfile-merge-ready.md`、`docs/perf/archive/2026-03/2026-03-06-f4-perf-blocker-probe.md`、`docs/perf/archive/2026-03/2026-03-06-f5-perf-fabfile-current-branch-base.md`。

### `S-11` · post-S10 blocker probe（已完成）

状态：
- 已于 `2026-03-06` 在独立 worktree 完成，收口记录见 `docs/perf/archive/2026-03/2026-03-06-s11-post-s10-blocker-probe.md`。
- 结论不是“找到新的 runtime blocker”，而是确认 current-head 的 default blocker queue 已清空。

问题：
- `S-10` 关闭 `txnLanes` 之后，current-head 需要重新识别第一失败项，避免 routing 仍停留在旧 blocker 名单上。
- 旧的 `txnLanes` probe 命令还依赖未转义括号的 `-t` regex，会把目标测试记成 `skipped`；这类关闭项不应继续占默认 blocker 队列。

本轮裁决：
- 默认 blocker probe 只保留 `externalStore`、`runtimeStore`、`form` 三条 remaining health/regression suites。
- 在补齐 worktree 依赖后，real probe 对三条 suite 全部给出 `passed`，因此 `next_blocker: none`。
- 当前不新开 runtime worktree；remaining 只保留 `R-2` 架构/API 候选。

预期收益：
- 中等。
- 不直接提速 runtime，但能避免继续沿已经关闭的 blocker 名单误开新线。

实施成本：
- 低。
- 只涉及 docs/evidence/tooling routing，不改 runtime core。

主要落点：
- `docs/perf/04-agent-execution-playbook.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`

并行/串行：
- 已完成，不再占默认执行槽位。
- 后续只有在 current-head 发生实质性变化时才重跑同类 probe。

API 变动：
- 不需要。

### `S-6` · browser perf collect stabilization（已完成）

状态：
- 已于 `2026-03-06` 完成，收口记录见 `docs/perf/archive/2026-03/2026-03-06-s6-browser-collect-stabilization.md`。

问题：
- browser perf collect 在 fresh worktree / fresh cache 下，首轮容易踩到 Vite `optimizeDeps` 与 transform warmup 的启动噪声。
- 这类噪声会表现为 browser reload / 动态导入失败，从而把 collect 阻断在基础设施层，而不是 runtime 性能层。

本轮裁决：
- 不触碰 `packages/logix-core/**`。
- 只在 `packages/logix-react` 的 browser test 基础设施层做两件事：
  - 给 browser 项目固定 worktree-local cacheDir，避免把 collect 预热写进共享 `node_modules/.vite`。
  - 对 collect 相关 browser suite 提前做 `optimizeDeps.entries` + `server.warmup.clientFiles` 预热，并提供显式预热入口 `scripts/browser-perf-prewarm.ts`。

预期收益：
- 中等。
- 不直接提速 runtime，但能让 fresh worktree 的 browser collect 首轮更稳，减少把基础设施噪声误判成 runtime blocker。

主要落点：
- `packages/logix-react/vitest.config.ts`
- `scripts/browser-perf-prewarm.ts`
- `docs/perf/archive/2026-03/2026-03-06-s6-browser-collect-stabilization.md`

并行/串行：
- 与 `F-1` 低冲突；当前也不存在需要规避的 `txnLanes` runtime 主线。
- 不应修改 runtime core。

API 变动：
- 不需要。

### `S-4` · `RuntimeExternalStore delayed teardown` 最小修复（已完成）

状态：
- 已于 `2026-03-06` 以最小代码修复收口，记录见 `docs/perf/archive/2026-03/2026-03-06-s4-runtime-external-store-delayed-teardown.md`。
- 当前已从 `runtime-store-no-tearing` 默认 blocker 列表移除；若未来重开，优先沿同 tick unsubscribe/resubscribe 的时序窗口排查。

### `R-2` · `TxnLanePolicy` API vNext 收敛

状态：
- `2026-03-22` 已完成 direction scout，唯一建议方向为 `R2-U PolicyPlan contract reorder`。
- `2026-03-22` 已完成 design package 与 trigger bundle v1，当前 `implementation-ready=false`；唯一未满足项为外部 `SLA-R2` 实值输入。

问题：
- 现有 `R2-A/R2-B` 与 widening 已把术语和诊断链路打通，但 public control surface 仍保留 `txnLanes*` 与 `txnLanePolicy*` 双族输入。
- 当前实现通过 normalize + metadata 注入维持兼容，运行期仍要走字段级覆盖解析，热路径结构税没有被实质收缩。

架构缺陷：
- API 契约与 runtime contract 仍有双轨：对外是 tier-first + legacy patch 并存，对内消费还是 patch 合并。
- `trace:txn-lane` 的 `effective/explain/resolvedBy` 解释链依赖运行期逐字段归因，计算与维护成本持续存在。

预期收益：
- 潜在很高。若把覆盖解析前移到编译期并收缩 API 契约，运行期可从“多层候选解析 + 字段归因”收敛到“profileId 查表 + 常量化解释链”。

实施成本：
- 高。
- 会触及 public API、runtime contract、diagnostics contract 与文档真相源，不适合作为当前立即执行的切刀。
- proposal 主口径见 `docs/perf/2026-03-20-r2-public-api-proposal.md`。
- staging 执行口径见 `docs/perf/2026-03-21-r2-public-api-staging-plan.md`。
- 方向 scout 见 `docs/perf/2026-03-22-r2-api-unify-direction-scout.md`。

唯一建议下一刀（implementation line 目标）：
- `R2-U PolicyPlan contract reorder`
- public API 收敛为单入口：
  - `stateTransaction.txnLanePolicyPlan.profiles`
  - `stateTransaction.txnLanePolicyPlan.binding`
- forward-only 迁移后移除旧入口：`txnLanes`、`txnLanesOverridesByModuleId`、`txnLanePolicy`、`txnLanePolicyOverridesByModuleId`。
- 运行时改为“启动期编译 + 热路径查表”：
  - 启动期把 provider/runtime/module 覆盖链编译成 `profileId -> effective policy` 与 `moduleId -> profileId`。
  - 热路径只消费编译结果，不再逐 transaction 执行字段级 merge。
  - 诊断事件以 `profileId + scope + fingerprint` 输出，`resolvedBy` 来自编译产物。

触发纪律（开实施线前全部满足）：
1. `Gate-A`：有可引用的新产品级 SLA，且需要对外策略语义。
2. `Gate-B`：有证据证明仅靠内部 widening 不足以满足目标收益。
3. `Gate-C`：`probe_next_blocker --json` 可比且非 environment 失败。
4. `Gate-D`：迁移映射与验收清单已冻结。
5. `Gate-E`：按 `09` 模板完成 `override=是` 的开线裁决并锁定单提交收口门。

Gate-A/B 的最低触发形态与缺口证据模板见：
- `docs/perf/2026-03-21-r2-gate-ab-trigger-scout.md`

当前状态：
- 维持 docs/evidence-only。
- 暂不新开 `R-2` 实施线，唯一候选保持 `R2-U PolicyPlan contract reorder`。
- design package 已补齐，当前 `Gate-C=pass`、`Gate-D=ready_in_doc_but_unbound`，真正缺口集中在 `Gate-A/B/E`。

主要落点：
- `packages/logix-core/src/internal/runtime/core/env.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- `packages/logix-core/src/Runtime.ts` 与相关 public config surface
- `docs/perf/05-forward-only-vnext-plan.md`

并行/串行：
- 不再依赖 `R-1`；但必须以新的 SLA/新证据为前提单独立项。
- 若启动，应视为独立架构/API 轨，不与任何新的 `txnLanes` runtime 重构混做一刀。

API 变动：
- 需要。

### `SW-N3` · `state-write` degradation ledger + reducer patch sink contract（accepted_with_evidence）

状态：
- `2026-03-22` 已完成 implementation-ready 识别，当前为 docs/evidence-only，见 `docs/perf/2026-03-22-identify-state-write-next-cut-post-sw-n2.md`。
- `2026-03-22` 已完成 design package，当前 `implementation-ready=false`；后续先冻结 `StateWriteIntent` 合同、`ReducerPatchSink` 决策矩阵、`state:update` / devtools / perf 指标词表与 focused validation matrix，再决定是否开 implementation line。
- `2026-03-22` 已完成 contract freeze，当前 `implementation-ready=true`；后续可直接进入独立 implementation line。
- `2026-03-22` 已完成 implementation line，当前结果为 `merged_but_provisional`；后续优先补首轮 degradeRatio/degradeUnknownShare 可比工件。
- `2026-03-23` 已完成 evidence closeout，当前结果为 `accepted_with_evidence`；后续只在需要扩展示图时再开低冲突线。
- `SW-N2` 维持 watchlist。

问题：
- `SW-N1` 已将降级路径显式化，但 `customMutation/dirtyAll` 仍缺少跨入口统一账本与预算门。
- 当前无法快速回答“哪一类入口在持续制造降级流量”，导致后续切刀归因效率偏低。

架构缺陷：
- state-write 的成功路径与降级路径共享 `FieldPathId/anchor` 语义，降级侧缺少稳定的 slim intent 协议，`reason` 与来源分布难以横向比较。

预期收益：
- 高。
- 先把降级流转变成可预算信号，可以直接提升后续 `SW-N2` 与其它 state-write 切口的收益可判定性。

实施成本：
- 中高。
- 需要跨 `dispatch/boundApi/externalStore/module-as-source/stateTransaction/devtools` 做协议对齐与指标接线。
- 最小实现已落地；后续工作重点转为首轮可比工件与聚合展示面。

主要落点（实施线）：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- `packages/logix-core/src/internal/state-trait/external-store.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-devtools-react/src/internal/state/logic.ts`
- `specs/103-effect-v4-forward-cutover/perf/*`（degrade ratio/reason 指标工件）

并行/串行：
- 与 `SW-N2` 必须串行，建议 `SW-N3` 在前。
- 与 `R-2` 可并行规划，实施默认分线，避免同一波次同时引入 public API 变动。

API 变动：
- 当前不需要。
- 预留可选 API proposal：仅当 `SW-N3` 后 degrade ratio 仍持续高位时触发。

### `P0-3` · runtime-shell post N-2 attribution contract（accepted_with_evidence）

状态：
- `P0-1+ dispatch-shell` 已在 fresh recheck 后关闭，`dispatch.p95/residual.avg` 未出现可归因新突增。
- `P0-2 operation-empty-default-next` 已复核关闭，未识别遗漏的最小代码切口。
- `N-1 runtime-shell.freeze` 同机对照回退，已回滚实现并 docs/evidence-only 收口。
- `N-2 runtime-shell.ledger` 已完成落地，具备 Node microbench 的 raw 样本与 summary 对齐能力。
- `2026-03-22` scout 结论：唯一建议下一线是 `N-3 runtime-shell.resolve-boundary-attribution-contract`（见 `docs/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.md`）。
- `2026-03-22` design package 结论：`N-3` 的 design-package 已完成，后续只剩协议冻结与验证门收口（见 `docs/perf/2026-03-22-n-3-runtime-shell-attribution-design-package.md`）。
- `2026-03-22` contract freeze 结论：`N-3` 当前已 `implementation-ready=true`，可按冻结的 boundary decision 合同、reason taxonomy、ledger v1.1 字段分层与 focused validation matrix 直接开 implementation line（见 `docs/perf/2026-03-22-n-3-contract-freeze.md`）。
- `2026-03-23` implementation line 结论：`N-3` 已 `accepted_with_evidence`，统一 `RuntimeShellBoundaryDecision` 合同、summary attribution 与 schema/example 已全部落盘（见 `docs/perf/archive/2026-03/2026-03-23-n-3-runtime-shell-impl.md`）。

问题：
- ledger v1 已能回答“慢在哪里”，仍缺“为何落到 noSnapshot/fallback”的稳定 reason 协议。
- `resolve-shell` 的 `noSnapshot/snapshot` 与 `operationRunner` 的 `shared/fallback` 仍是分离口径，跨链路复用边界不统一。
- 在缺少统一边界契约时，直接重开结构改造线容易再次出现“实现完成但收益归因不收敛”。

架构缺陷：
- runtime-shell 链路缺少统一的 boundary decision 记录面，导致 `dispatch-shell`、`resolve-shell`、`operationRunner` 之间无法用同一字段聚合。
- shell 复用 key 语义分散在多个局部路径，无法形成可复核的单一“复用命中/失配”解释链。

预期收益：
- 高。
- 可同时改善三件事：归因可解释性、复用边界一致性、下一刀选择确定性。

实施成本：
- 中等。
- docs/proposal-only 已完成；当前进入 implementation-ready 阶段，后续按冻结验证矩阵开最小实现线。

主要落点：
- `docs/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.md`
- `docs/perf/2026-03-22-n-3-runtime-shell-attribution-design-package.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-n-3-runtime-shell-attribution-design-package.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-n-3-runtime-shell-attribution-design-package.evidence.json`

并行/串行：
- 与现有 docs/evidence 线可并行。
- 一旦进入 runtime-shell 实施线，和其他 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.*` 结构改造必须串行。

API 变动：
- 默认不改 public API。
- 仅在 reason 协议证明需要外露策略语义时，追加单独 API proposal。

### `D-5` · Diagnostics Cost-Class Protocol + Gate Plane Split（已完成最小切口）

问题：
- `externalStore.ingest.tickNotify / full/off<=1.25` 在 current-head 多轮复核里持续出现 `clear/blocked` 摆动，`first_fail_level` 在 `128/256/512` 漂移。
- `P2-4` 与 `R2-B` 已补齐可见性与归因，仍缺“跨 runtime/controlplane/devtools 的成本分层 + gate 平面隔离”。

架构缺陷：
- 单一相对门把 `runtime_core` 与 `controlplane/devtools` 事件混算，导致边界噪声直接进入 blocker 判定。
- gate 语义和诊断语义没有统一分层协议。

预期收益：
- 高。
- 通过 `hard(runtime_core)` 与 `soft(all_classes)` 双层门，长期降低误触发并压低 full 诊断税点。

实施成本：
- 中高。
- 最小切口 `D-5-min` 已落地：先完成协议字段与 probe gate split，再把 `externalStore.ingest.tickNotify / full/off<=1.25` 从 blocker plane 移入 soft watch。
- 方案锚点见 `docs/perf/2026-03-22-diagnostics-budget-unify-scout.md` 与 `docs/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.md`。

触发纪律（开实施线前全部满足）：
1. 固化 `costClass/gateClass/samplingPolicy` 字段契约，保持 Slim 可序列化。
2. 定义 `hard gate` 与 `soft watch` 的统一裁决规则，并给出迁移清单。
3. 在同机 7 轮复核中验证“soft 触发不阻塞主 gate”。
4. 按 `09` 模板完成 `override=是` 的开线裁决并锁定单提交收口门。

当前状态：
- `D-5-min` 已 `accepted_with_evidence`。
- 当前不再把 `externalStore.ingest.tickNotify / full/off<=1.25` 当成 blocker plane 阈值。
- 若后续其它 suite 出现相同类型的 soft watch，再沿同协议扩面。

主要落点：
- `docs/perf/2026-03-22-diagnostics-budget-unify-scout.md`
- `docs/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.evidence.json`

并行/串行：
- 与 runtime 热路径改造应串行，避免同轮引入双变量。
- 与 `R-2` 可并行做 docs/proposal，对实现线需分开开刀。

API 变动：
- 协议需要，public API 可选。

## 并行矩阵

### 当前默认执行组

1. 无默认 runtime 主线
- `R-1` 已由 `S-10` native-anchor benchmark cut 关闭，不再预留 `txnLanes` 串行槽位。
- `S-11` 已确认 remaining browser blocker queue clear；默认不为 runtime 再开新 worktree。
- `F-1`、`S-2`、`S-4`、`S-5`、`S-10` 已完成或关闭，不再纳入默认并行组。

### 如需重开，可并行

1. 新的 `txnLanes` runtime 重构 + 重开的 `S-2`
- 仅当 future evidence 再次证明页面内 queue 或 `nativeCapture->handler` 存在真实税点时成立；一个改 runtime，一个改 watcher benchmark 解释链。
- 仍需独立 worktree，且新的 runtime 重构必须先明确新的 SLA / native-anchor 证据。

### 可以并行，但应独立 worktree

1. 重开的 `S-2` 与任何其它任务
- 原因不是 runtime 冲突，而是它会直接改变 benchmark 语义；若不隔离，current-head 与 targeted 证据很容易互相污染。

### 必须串行

1. 任意两个新的 `txnLanes` runtime / policy 重构
- 凡是要改 `ModuleRuntime.impl.ts` / `ModuleRuntime.txnLanePolicy.ts` 的，必须串行。

2. 只有在新的 SLA / 新证据出现后，才能决定是否启动 `R-2`
- `R-2` 是 API/架构层升级，不应在没有新增目标定义的前提下凭空展开。

3. `SW-N3` 与 `SW-N2` 必须串行
- `SW-N3` 先建立降级账本与预算门，再评估 `SW-N2` 重开价值，避免双线同时修改 state-write 协议与 id 管线导致证据不可归因。

## 推荐执行顺序

### Phase 0

- 先完成本文档与 `README` / `04-agent-execution-playbook` 的对齐。
- 后续所有 agent 先按本页选路，不再直接从零分析。

### Phase 1

1. 当前无默认 runtime 主线；`R-1` 已关闭
2. `F-1` 已完成；需要路由/排期时直接用 `python3 fabfile.py list-tasks|show-task|plan-parallel`
3. 先跑 `python3 fabfile.py probe_next_blocker`；若结果为 `clear`，不要硬开 runtime 线
4. `S-2` 已完成第四刀；只有在 report/display drift 或新的 native-anchor 证据出现时才重开，并强制独立 worktree
5. `S-4` 已完成最小修复，不再占新 worktree
6. `S-5` 已完成审计关闭，不再占新 worktree
7. `S-3`、`S-6`、`S-10`、`S-11` 已收口，不再占新 worktree
8. state-write 方向优先按 `SW-N3 -> SW-N2` 串行推进，`SW-N2` 重开前先确认 full-suite 同门稳定复发，且 isolated replay 也能复现同一门禁形态
9. react controlplane 更大重建在当前 phase 已终局关闭；后续若重开，必须先出现新的独立症状或新的产品级目标，再单独恢复 trigger package 路径

### Phase 2

- 只有当未来出现新的 native-anchor 证据或新的产品级 SLA 时，才决定：
  - `watchers` 是否在 suite 校正后还剩 runtime 问题
  - `txnLanes` 是否值得重开 runtime 重构或推进 `R-2`
- 若需要主动处理 `externalStore` 的 edge gate noise，优先走 `D-5` 的分层 gate 方案，再决定是否触发 `R-2` public API。
- `F-1` 已落地为现成工具，不再单独占用执行波次。
- state-write 后续扩面以 `SW-N3` 的 degrade ratio/reason 门禁为前置，再决定是否进入 `SW-N2` 或 API proposal 分支。

## 给后续 `Fabfile` 的落点建议

若后续要做自动化编排，建议直接以本页为任务源，保留以下稳定字段：
- `task_id`
- `kind`（runtime / benchmark / gate / api）
- `priority`
- `conflict_level`
- `parallelizable`
- `requires_worktree`
- `files`
- `verify_commands`
- `next_gate`

这样 `Fabfile` 只需要把“任务路由与执行”自动化，不需要重新理解 perf 盘面。


### `S-7` · `runtimeStore.noTearing` gate noise cleanup（已完成）

状态：
- 已于 `2026-03-06` 完成，收口记录见 `docs/perf/archive/2026-03/2026-03-06-s7-runtime-store-gate-noise-cleanup.md`。

问题：
- `runtimeStore.noTearing.tickNotify` 的 `full/off<=1.25` 在极低耗时点位上会被 `denominatorZero` 噪声误触发。

本轮裁决：
- 不改 runtime core。
- 仅把该 suite 的 `minDeltaMs` 提到 `0.11`，跨过单个 `0.1ms` browser timer quantum。

预期收益：
- 低到中。
- 不直接提速 runtime，但能净化 relative budget 信号。

主要落点：
- `.codex/skills/logix-perf-evidence/assets/matrix.json`
- `docs/perf/archive/2026-03/2026-03-06-s7-runtime-store-gate-noise-cleanup.md`

并行/串行：
- 已完成，不再占用新并行槽位。

API 变动：
- 不需要。


### `S-9` · txn-lanes control-surface / native event window observation（已完成）

状态：
- 已于 `2026-03-06` 完成，收口记录见 `docs/perf/archive/2026-03/2026-03-06-s9-txn-lanes-control-surface.md`。

问题：
- `R-1` observation 已指出主延迟更像 `schedule -> handler invoke`。
- 这刀继续把 `native capture / bubble / handler invoke` 之间的窗口拆细。

本轮裁决：
- 不碰 `txnQueue` / `ModuleRuntime.impl.ts`。
- 只补 test/evidence，把主延迟继续定位在 queue 之前。

预期收益：
- 中。
- 不直接提速 runtime，但能明确下一刀应该前移到 control-surface / benchmark admission，而不是 queue 内。

主要落点：
- `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`
- `docs/perf/archive/2026-03/2026-03-06-s9-txn-lanes-control-surface.md`

并行/串行：
- 已完成，不再占用新的 runtime 并行槽位。

API 变动：
- 不需要。
