# 07 · Optimization Backlog And Routing

本文件承接 `06-current-head-triage.md` 的识别结论，把“后续值得做什么”收敛成可执行 backlog。

用途不是记录历史，而是给后续开发 / 自动化编排 / `Fabfile` 提供稳定任务源：
- 哪些值得做
- 为什么值得做
- 收益与成本如何排序
- 是否可并行
- 是否必须独立 worktree
- 哪些必须串行，避免互相干扰

## 使用规则

1. 先读 `06-current-head-triage.md`，确认 current-head 的真实主线。
2. 再用本文件决定“现在做哪刀”以及“哪些副线可以并行”。
3. 默认一次只推进一个主线切刀；副线只在低冲突时并行。
4. 若某条副线主要价值是修证据/gate，而不是 runtime 提速，不得阻塞主线。
5. 若某条副线的主要文件在当前工作区已存在未提交改动，应优先放到独立 worktree。

## 排序原则

1. 先看是否命中 current-head 的 P1 主门。
2. 再看收益是否横向可复用。
3. 再看它是在修真实 runtime，还是只在修 benchmark/gate 噪声。
4. 最后才看 API 是否值得动；未逼到墙角，先不动表面 API。

## Backlog 总表

| ID | 类别 | 问题 | 预期收益 | 成本 | 冲突风险 | 并行策略 | API 变动 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-1` | 真实 runtime 主线（活跃：v2） | `txnLanes.urgentBacklog` 仍卡 `urgent.p95<=50ms`；下一刀是 `urgent-aware handoff` | 很高 | 中高 | 高 | 主线串行 | 暂不需要 |
| `S-1` | 稳定性副线（已关闭） | `externalStore.ingest.tickNotify` broad residual 复核已完成 | 中 | 低到中 | 低 | 已关闭 | 不需要 |
| `S-2` | benchmark 纠偏（已完成第一刀） | watchers 双轨语义已落地；后续仅剩解释链/展示层补完 | 中 | 中 | 中 | 已完成第一刀；如重开需独立 worktree | 不需要 |
| `S-3` | gate/matrix 清理 | 已收口：`decision` gate 已拆到 auto-only suite，`converge.txnCommit` 不再把 full/dirty 的 `notApplicable` 记为失败 | 中 | 低 | 低 | 可并行 | 不需要 |
| `F-1` | 自动化副线（已完成） | 最小可用 perf `Fabfile` router 已落地 | 中 | 中 | 低 | 已完成 | 不需要 |
| `S-4` | 验证解锁副线（已完成） | `RuntimeExternalStore delayed teardown` 最小修复已落地，`runtime-store-no-tearing` 不再是默认 blocker | 中 | 中 | 中 | 已完成 | 不需要 |
| `S-5` | 验证解锁副线（已关闭） | `react.strictSuspenseJitter` 主分支环境可跑通，审计后以 docs/evidence-only 关闭 | 中 | 低 | 低 | 已关闭 | 不需要 |
| `S-6` | collect 稳定化副线（已关闭） | browser perf collect 首轮预热噪声已复核，不保留基础设施补丁 | 中 | 低 | 低 | 已关闭 | 不需要 |
| `R-2` | 架构/API 候选 | `TxnLanePolicy` 对外收敛为高层 policy | 潜在很高 | 高 | 高 | 必须在 `R-1` 之后 | 需要 |

## 任务详情

### `R-1` · `txnLanes` backlog policy split（当前活跃：v2 urgent-aware handoff）

状态：
- 当前唯一活跃主线。
- `2026-03-06` 的 blind first-host-yield phase split 已判失败；下一刀改走 `urgent-aware handoff`。
- `startup-phase` 显式切面目前只保留为 checkpoint 结论，不单独落 `D-1` 日期记录；当前仍在 `agent/r1-txn-lanes-policy-split-v2` worktree 里继续推进 `R-1 v2`。

问题：
- `txnLanes.urgentBacklog` 在 broad 与 targeted 都仍然卡在 `urgent.p95<=50ms`。
- 现有优化主要靠 `budgetMs/maxLagMs/chunkSize/yieldStrategy` 这类低层常数，已经接近收益上限。

最新状态：
- `2026-03-06` 已新增第二个失败子尝试：`docs/perf/2026-03-06-r1-txn-lanes-handoff-lite-failed.md`。
- 该方案只保留 `txnQueue snapshot + preUrgent chunk cap + urgent_waiter handoff/requeue`，去掉了 blind host yield，但在 `mode=default, steps=800/2000` 与 `catchUp` 上都显著回归。

架构缺陷：
- backlog 启动期与 steady-state 共用同一策略面，导致“首个 urgent 延迟”和“整体 catch-up 吞吐”被迫一起调。

预期收益：
- 这是 current-head 唯一明确的 runtime 主线，收益最高。
- 若成功，能把 `urgent.p95<=50ms` 从边缘抖动改成稳定过线。
- 已知失败方向：`2026-03-06` 的 blind first-host-yield phase split 会让 `mode=default` 三档回归，见 `docs/perf/2026-03-06-r1-txn-lanes-phase-split-failed.md`。

实施成本：
- 中高。
- 需要动 runtime 核心调度逻辑与 targeted perf suite。

主要落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`

并行/串行：
- 必须作为主线串行推进。
- 不要与任何会改 `ModuleRuntime.impl.ts` 或 `txnLanePolicy` 的任务并行。

API 变动：
- 当前不需要。
- 下一轮仍优先沿 `txnQueue snapshot -> urgent-aware handoff` 收口，不要重复 blind first-host-yield。
- `2026-03-06` 的显式 startup-phase 版在 3/3 quick audit 回归，见 `docs/perf/2026-03-06-r1-txn-lanes-startup-phase-checkpoint.md`；不要把 startup cap 直接固化为正式 policy。
- 只有当 queue-snapshot 路线仍无法稳定过线，才升级到 `R-2`。
- 下一轮仍可继续 `urgent-aware` 主线，但不要重复 blind first-host-yield，也不要重复这版 handoff-lite。
- 只有当更高层的 urgent-aware policy 仍无法稳定过线，才升级到 `R-2`。
- 当前活跃方案就是 `urgent-aware handoff`，不要重复 blind first-host-yield。
- 不要把 startup cap / startup phase checkpoint 直接固化成正式 runtime policy。
- 只有当 `R-1 v2` 的 urgent-aware policy 仍无法稳定过线，才升级到 `R-2`。
>>>>>>> 2935c015 (docs(perf): refresh d1 routing status)

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

### `S-2` · `watchers.clickToPaint` suite 语义纠偏（已完成第一刀）

状态：
- 已于 `2026-03-06` 完成第一刀，双轨语义（`clickToDomStable` + `clickToPaint`）已合回主分支。
- 当前不再是 runtime 主线；若要重开，仅限 benchmark 解释链/展示层继续收口。

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
- 需要统一 warmup / settle / click-to-paint 语义，必要时补双轨指标。
- 已完成第一刀：拆成 `clickToDomStable` + `clickToPaint` 双轨。

主要落点：
- `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
- `packages/logix-react/src/internal/store/perfWorkloads.ts`
- `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- 需要时补 `packages/logix-react/test/browser/perf-boundaries/harness.ts`

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
- 已于 `2026-03-06` 在主分支环境复核通过，并以 docs/evidence-only 方式关闭。
- 除非 clean/comparable 环境再次稳定复现导入/运行失败，否则不再占用并行槽位。

问题：
- `S-4` 关闭后，broad/full collect 的首个 blocker 已经转移到 `react.strictSuspenseJitter` 的导入/运行失败。
- 它不一定是 runtime 性能问题，但确实在阻断 full-matrix 刷新。

架构缺陷：
- broad/full 收口链路容易被单个 browser suite 的运行时/导入层问题卡住，导致性能主线过度依赖 targeted 证据。

预期收益：
- 中等。
- 不直接提速 runtime，但能继续恢复 broad/full collect 的可用性。

实施成本：
- 已完成。
- 本轮仅做主分支环境复核与 docs 回写，不保留额外配置改动。

主要落点：
- `packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`
- 必要时相关 browser harness / test imports
- 对应 `docs/perf/*` 日期记录与 `07` 回写

并行/串行：
- 已关闭，不再单独排期。
- 若未来重开，先区分 worktree/browser 预热噪声与真实代码问题，再决定是否触碰 React/runtime 适配层。

API 变动：
- 不需要。

### `F-1` · `Fabfile` 自动化编排（已完成）

状态：
- 已于 `2026-03-06` 落成最小可用 perf `fabfile.py`。
- 当前不再是活跃副线；需要路由/排期时直接复用现成命令。
### `S-6` · browser perf collect stabilization（已完成）

状态：
- 已于 `2026-03-06` 完成，收口记录见 `docs/perf/2026-03-06-s6-browser-collect-stabilization.md`。

问题：
- browser perf collect 在 fresh worktree / fresh cache 下曾被怀疑会踩到 Vite 首轮预热噪声，并表现为 browser reload / 动态导入失败。
- 这类失败若被误判成 runtime 问题，会继续污染 perf 主线选路。

本轮裁决：
- 不触碰 `packages/logix-core/**`。
- 试探性 browser 预热补丁
  - `cacheDir`
  - `optimizeDeps.entries`
  - `server.warmup.clientFiles`
  - `scripts/browser-perf-prewarm.ts`
  在 fresh cache 首轮会放大成新的导入失败，因此不值得保留。
- 回到 `HEAD` 基线配置后，targeted browser perf collect 可在 fresh cache 首轮直接通过；`S-6` 因此以 docs/evidence-only 关闭。

预期收益：
- 中等。
- 不直接提速 runtime，但避免把错误的基础设施补丁带入主线，并明确当前 collect 已不依赖“第二次重跑才过”。

主要落点：
- `docs/perf/2026-03-06-s6-browser-collect-stabilization.md`
- 本页状态回写

并行/串行：
- 已关闭，不再占用新的 browser/runtime 改动预算。

API 变动：
- 不需要。

### `F-1` · `Fabfile` 自动化编排

问题：
- `07` 已经把 perf 任务拆成 `task_id/kind/priority/conflict_level/parallelizable/requires_worktree/files/verify_commands/next_gate`。
- 但当前仍需人工把这些字段转成可执行路由。

架构缺陷：
- 缺少一层统一的 perf 编排面，导致每轮并行推进前都要重新做任务拆分和冲突分析。

预期收益：
- 中等。
- 不直接提速 runtime，但能把后续“多 worktree + 多 subagent + 一刀一提交”的执行成本显著压低。

实施成本：
- 已完成。
- 本轮落的是最小可用 router，不触碰 runtime 内核。

主要落点：
- `fabfile.py`
- 必要时 `scripts/` 下新增薄包装
- `docs/perf/07-optimization-backlog-and-routing.md`（字段对齐）

并行/串行：
- 已完成，不再单独排期。
- 若后续继续扩展，也不应修改 `packages/logix-core/src/internal/runtime/core/**`。

API 变动：
- 不需要。

### `S-4` · `RuntimeExternalStore delayed teardown` 最小修复（已完成）

状态：
- 已于 `2026-03-06` 升级成最小代码修复，不再是 evidence-only 关闭。
- 收口记录：`docs/perf/2026-03-06-s4-runtime-external-store-delayed-teardown.md`

问题：
- `runtime store: multi-instance isolation (same moduleId, different instanceId)` 在整文件/collect 场景下存在低频 flake。
- 这会让 full-matrix 收口链路被 `runtime-store-no-tearing` 偶发挡住。

本轮裁决：
- 根因更像 `RuntimeExternalStore` 在同一 tick 的 unsubscribe -> resubscribe 抖动里立即 teardown / removeStore，导致 store 被拆掉又重建。
- 修复方式不是继续猜 `RuntimeStore` / `TickScheduler`，而是把最后一个 listener 移除后的 teardown 延迟到一个 microtask，并允许同 tick resubscribe 取消 teardown。
- 结果是 `runtime-store-no-tearing` 不再作为 current-head full-matrix 的默认 blocker。

架构缺陷：
- `RuntimeExternalStore` 之前把“最后一个 listener 移除”视为可以立即 teardown 的硬边界，但 React/browser 会在同一 tick 内出现 unsubscribe -> resubscribe 抖动。
- 这种时序窗口一旦被忽略，就会把本该稳定的 selector snapshot 重新计算成 flake。

预期收益：
- 中等。
- 不直接提速 runtime，但能恢复 `runtime-store-no-tearing` 作为 full-matrix 收口链路的一致性。

实施成本：
- 已完成。
- 成本集中在 React external store teardown 时序的最小修复与稳定性复核。

主要落点：
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

并行/串行：
- 已完成，不再单独占用并行槽位。
- 若未来重开，优先沿同 tick unsubscribe/resubscribe 的时序窗口排查，而不是回到旧的 topic folding 假设。

API 变动：
- 不需要。

### `R-2` · `TxnLanePolicy` API vNext 收敛

问题：
- 如果 `R-1` 之后仍要继续提速，现有对外控制面仍过于低层。

架构缺陷：
- 现在的控制面更像一组调参旋钮，而不是面向策略的 API。

预期收益：
- 潜在很高，但前提是 `R-1` 已证明内核 policy split 仍然不够。

实施成本：
- 高。
- 会触及对外策略面与文档真相源，不适合作为当前立即执行的切刀。

主要落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/Runtime.ts` 或相关 public config surface
- `docs/perf/05-forward-only-vnext-plan.md`

并行/串行：
- 必须等 `R-1` 结论明确后再开。
- 不与任何当前 runtime 主线并行。

API 变动：
- 需要。

## 并行矩阵

### 当前默认执行组

1. `R-1`
- 当前唯一活跃主线，默认按 `v2 = urgent-aware handoff` 串行推进。
- `F-1`、`S-2`、`S-4`、`S-5` 已完成或关闭，不再纳入默认并行组。

### 如需重开，可并行

1. `R-1` + `S-2`
- 一个改 `txnLanes` 主线，一个改 watcher benchmark 语义。
- 仅当 `S-2` 继续补 benchmark 解释链/展示层时成立；仍需独立 worktree。

### 可以并行，但应独立 worktree

1. `S-2` 与任何其它任务
- 原因不是 runtime 冲突，而是它会直接改变 benchmark 语义；若不隔离，current-head 与 targeted 证据很容易互相污染。

### 必须串行

1. `R-1` 与任何新的 `txnLanes` runtime 重构
- 凡是要改 `ModuleRuntime.impl.ts` / `ModuleRuntime.txnLanePolicy.ts` 的，必须串行。

2. `R-1` 之后才能决定是否启动 `R-2`
- `R-2` 是 API/架构层升级，不应在 `R-1` 结果未明时提前展开。

## 推荐执行顺序

### Phase 0

- 先完成本文档与 `README` / `04-agent-execution-playbook` 的对齐。
- 后续所有 agent 先按本页选路，不再直接从零分析。

### Phase 1

1. 主线：`R-1 v2`（`urgent-aware handoff`）
2. `F-1` 已完成；需要路由/排期时直接用 `python3 fabfile.py list-tasks|show-task|plan-parallel`
3. `S-2` 已完成第一刀；只有在要继续补 benchmark 解释链时才重开，并强制独立 worktree
4. `S-4` 已完成最小修复，不再占新 worktree
5. `S-5` 已完成审计关闭，不再占新 worktree
6. `S-3` 已收口，不再占新 worktree

### Phase 2

- 只有当 `R-1` 收益已经确认后，才决定：
  - `watchers` 是否在 suite 校正后还剩 runtime 问题
  - `R-2` 是否值得立项
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
