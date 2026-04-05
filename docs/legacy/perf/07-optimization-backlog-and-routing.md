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
3. 主会话只做 routing / review / merge；真正实施前，先按 `08` 把任务开成独立实施线。
4. 默认一次只推进一个主线切刀；副线只在低冲突时并行。
5. 若某条副线主要价值是修证据/gate，而不是 runtime 提速，不得阻塞主线。
6. 若某条副线的主要文件在当前工作区已存在未提交改动，应优先放到独立 worktree。

当前判定补充（`2026-03-06 / S-14`）：
- `probe_next_blocker` 在独立 worktree 的 real probe 已确认 remaining browser blocker queue clear。
- 默认不再存在 runtime 主线；`S-2` 已由 `S-14` 关闭，当前只保留 `R-2` 架构/API 候选。
- `2026-03-14 / C-6` 又确认：`react.bootResolve.sync` 的旧税点主要是 RAF 轮询地板，不再作为 runtime watchlist。
- `2026-03-14 / C-7` 再次执行 `probe_next_blocker --json` 仍为 `clear`；当前不新增 backlog 项。

当前判定补充（`2026-03-30 / latest main`）：
- `main@b4bc9e1d` 上重新补的 cheap-local identify 继续给出 `probe_next_blocker = clear`。
- `#146/#148` 的 merged-mainline fanout 收益在 HEAD 上继续保持 `1 / 1 / 1`。
- 当前唯一新开的 cheap-local 候选是 `R-3 dispatch outer shell`，方向是继续把 runtime 主税点从 outer shell 收窄到 `dispatch` 专属入口壳。

## D-3 执行协议（当前默认）

1. 主会话保持干净，只负责选路、派线、审查、合流。
2. 每条活跃线都必须映射到独立 `worktree + branch + owner(subagent/agent/human)`；不要让两条实施线共享同一可写工作区。
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
| `R-2` | 架构/API 候选 | `TxnLanePolicy` 对外收敛为高层 policy | 潜在很高 | 高 | 高 | 默认不立项；仅在新 SLA / 新证据下单开 | 需要 |
| `R-3` | runtime 主线候选 | `dispatch` 专属入口壳仍有稳定固定税；latest-main cheap-local 已把主税点从 broad outer shell 收窄到 `dispatch > public setState > direct txn setState` | 高 | 中 | 中 | 当前默认主线；独立 worktree 串行推进 | 暂不需要 |

### `R-3` · dispatch outer shell residual cut

状态：
- `2026-03-30` latest-main quick identify 已完成。
- `probe_next_blocker --json` 继续为 `clear`。
- merged 的 same-target fanout 两条线在 HEAD 上继续保持 `1 / 1 / 1`。
- node 微基线与 split probe 已把当前 cheap-local 税点收窄到 `dispatch` 专属入口壳。

问题：
- 旧的 broad outer-shell 表述还不够窄，容易把 `txnQueue` 公共壳与 `dispatch` 专属入口壳混在一起。
- 当前最新证据显示：
  - `dispatch.p95 ≈ 0.173ms`
  - `queuedSetState.p95 ≈ 0.093ms`
  - `directTxnSetState.p95 ≈ 0.081ms`
  - `dispatchMinusQueued.avg ≈ 0.039ms`
  - `queuedMinusDirect.avg ≈ 0.008ms`

预期收益：
- 若这条线成立，收益面会打在每次 `dispatch` 都必经的共享入口壳，而不是已收口的 same-target fanout 壳。

实施成本：
- 中。
- 先做更窄 probe / 最小实现，不直接回头重开 `compiled_txn_boundary` 或 `commit_packet_notify_fusion`。

主要落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `docs/perf/2026-03-30-latest-main-quick-identify-reading.md`

并行/串行：
- 当前默认主线，必须独立 worktree 串行推进。
- 不与 `111` 并行争抢主线裁决位。

API 变动：
- 当前不需要。
- 只有当 `dispatch` 入口壳的内部收敛无法再继续，而收益面仍足够大时，才讨论 API 侧收口。

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
- `docs/perf/2026-03-06-r1-txn-lanes-invoke-window-failed.md`：证明主延迟在 handler invoke 之前。
- `docs/perf/2026-03-06-s10-txn-lanes-native-anchor.md`：正式把 suite 改成 `nativeCapture -> MutationObserver DOM stable`，并完成三轮 targeted + 1 次 clean-HEAD verify 收口。
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
- `docs/perf/2026-03-06-s10-txn-lanes-native-anchor.md`
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
- 第三刀：`.codex/skills/logix-perf-evidence/scripts/diff.ts`、`.codex/skills/logix-perf-evidence/scripts/ci.interpret-artifact.ts`、`docs/perf/2026-03-06-s13-watchers-phase-display.md`
- 第四刀：`packages/logix-react/test/browser/watcher-browser-perf.test.tsx`、`.codex/skills/logix-perf-evidence/assets/matrix.json`、`.codex/skills/logix-perf-evidence/scripts/watchers-phase-display.ts`、`docs/perf/2026-03-06-s14-watchers-native-anchor-pre-handler-split.md`

并行/串行：
- 语义上与 `R-1` 低冲突，可并行。
- 但它会直接改变 benchmark 语义并影响 current-head 可比性，因此真正实施时应强制独立 worktree。

API 变动：
- 不需要。

### `S-3` · `converge` gate / matrix applicability 清理

状态：
- 已完成（`2026-03-06`，见 `docs/perf/2026-03-06-s3-converge-gate-applicability.md`）。
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
- 已于 `2026-03-06` 按 current-head / 主分支代码状态复核通过，收口记录见 `docs/perf/2026-03-06-s5-suspense-refresh-unblock.md`。
- 当前默认视为已关闭的 collect unblock，不再占用并行槽位；只有在 clean/comparable 环境再次稳定复现时才重开。

### `F-1` · `Fabfile` 自动化编排（已完成）

状态：
- 已完成；`fabfile.py` 已转为现成工具，默认直接复用 `list-tasks` / `show-task` / `plan-parallel`。
- `F-3` / `F-5` 已补上 `list_merge_ready` / `show_branch_diff` 的 base 语义：默认以当前所在分支为 base，若要回看主分支视角，需显式传 `--base main`。
- `F-4` 已补上 `probe_next_blocker`，会按 `04-agent-execution-playbook.md` 预设顺序逐个跑 targeted browser suites，遇到第一个失败即停，并明确列出 remaining blocker 队列。
- `S-11` 已把关闭的 `txnLanes` 从默认 blocker probe 队列移除；当前默认顺序只剩 `externalStore -> runtimeStore -> form`，real probe 结果为 `next_blocker: none`。
- 详细完成记录保留在 `docs/perf/2026-03-06-f1-perf-fabfile.md`、`docs/perf/2026-03-06-f2-perf-fabfile-worktree-plan.md`、`docs/perf/2026-03-06-f3-perf-fabfile-merge-ready.md`、`docs/perf/2026-03-06-f4-perf-blocker-probe.md`、`docs/perf/2026-03-06-f5-perf-fabfile-current-branch-base.md`。

### `S-11` · post-S10 blocker probe（已完成）

状态：
- 已于 `2026-03-06` 在独立 worktree 完成，收口记录见 `docs/perf/2026-03-06-s11-post-s10-blocker-probe.md`。
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
- 已于 `2026-03-06` 完成，收口记录见 `docs/perf/2026-03-06-s6-browser-collect-stabilization.md`。

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
- `docs/perf/2026-03-06-s6-browser-collect-stabilization.md`

并行/串行：
- 与 `F-1` 低冲突；当前也不存在需要规避的 `txnLanes` runtime 主线。
- 不应修改 runtime core。

API 变动：
- 不需要。

### `S-4` · `RuntimeExternalStore delayed teardown` 最小修复（已完成）

状态：
- 已于 `2026-03-06` 以最小代码修复收口，记录见 `docs/perf/2026-03-06-s4-runtime-external-store-delayed-teardown.md`。
- 当前已从 `runtime-store-no-tearing` 默认 blocker 列表移除；若未来重开，优先沿同 tick unsubscribe/resubscribe 的时序窗口排查。

### `R-2` · `TxnLanePolicy` API vNext 收敛

问题：
- 即使 `R-1` 已由 `S-10` 关闭，若未来要把页面外 admission/SLA 抽象成产品能力，现有对外控制面仍过于低层。

架构缺陷：
- 现在的控制面更像一组调参旋钮，而不是面向策略的 API。

预期收益：
- 潜在很高，但前提是未来确实出现新的产品级 SLA 或新的 native-anchor 证据，证明还需要更高层的 policy surface。

实施成本：
- 高。
- 会触及对外策略面与文档真相源，不适合作为当前立即执行的切刀。

主要落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/Runtime.ts` 或相关 public config surface
- `docs/perf/05-forward-only-vnext-plan.md`

并行/串行：
- 不再依赖 `R-1`；但必须以新的 SLA/新证据为前提单独立项。
- 若启动，应视为独立架构/API 轨，不与任何新的 `txnLanes` runtime 重构混做一刀。

API 变动：
- 需要。

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

### Phase 2

- 只有当未来出现新的 native-anchor 证据或新的产品级 SLA 时，才决定：
  - `watchers` 是否在 suite 校正后还剩 runtime 问题
  - `txnLanes` 是否值得重开 runtime 重构或推进 `R-2`
- `F-1` 已落地为现成工具，不再单独占用执行波次。

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
- 已于 `2026-03-06` 完成，收口记录见 `docs/perf/2026-03-06-s7-runtime-store-gate-noise-cleanup.md`。

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
- `docs/perf/2026-03-06-s7-runtime-store-gate-noise-cleanup.md`

并行/串行：
- 已完成，不再占用新并行槽位。

API 变动：
- 不需要。


### `S-9` · txn-lanes control-surface / native event window observation（已完成）

状态：
- 已于 `2026-03-06` 完成，收口记录见 `docs/perf/2026-03-06-s9-txn-lanes-control-surface.md`。

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
- `docs/perf/2026-03-06-s9-txn-lanes-control-surface.md`

并行/串行：
- 已完成，不再占用新的 runtime 并行槽位。

API 变动：
- 不需要。
