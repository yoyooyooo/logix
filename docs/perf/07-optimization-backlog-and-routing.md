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
| `R-1` | 真实 runtime 主线 | `txnLanes.urgentBacklog` 仍卡 `urgent.p95<=50ms` | 很高 | 中高 | 高 | 主线串行 | 暂不需要 |
| `S-1` | 稳定性副线（已完成） | `externalStore.ingest.tickNotify` broad residual 复核 | 中 | 低到中 | 低 | 已关闭 | 不需要 |
| `S-2` | benchmark 纠偏 | `watchers.clickToPaint` 混入 browser floor | 中 | 中 | 中 | 可并行，但应独立 worktree | 不需要 |
| `S-3` | gate/matrix 清理 | 已收口：`decision` gate 已拆到 auto-only suite，`converge.txnCommit` 不再把 full/dirty 的 `notApplicable` 记为失败 | 中 | 低 | 低 | 可并行 | 不需要 |
| `R-2` | 架构/API 候选 | `TxnLanePolicy` 对外收敛为高层 policy | 潜在很高 | 高 | 高 | 必须在 `R-1` 之后 | 需要 |
| `F-1` | 自动化副线 | 将 `07` 的 backlog/routing 落成 `Fabfile` 任务图 | 中 | 中 | 低 | 可并行 | 不需要 |
| `S-4` | 验证解锁副线 | 解除 current-head full-matrix 刷新阻塞（`runtime-store-no-tearing` 多实例隔离） | 中 | 中 | 中 | 可并行 | 不需要 |

## 任务详情

### `R-1` · `txnLanes` backlog policy split

问题：
- `txnLanes.urgentBacklog` 在 broad 与 targeted 都仍然卡在 `urgent.p95<=50ms`。
- 现有优化主要靠 `budgetMs/maxLagMs/chunkSize/yieldStrategy` 这类低层常数，已经接近收益上限。

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
- 下一轮应优先尝试 `urgent-aware handoff`，不要重复 blind first-host-yield。
- 只有当更高层的 urgent-aware policy 仍无法稳定过线，才升级到 `R-2`。

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
- 中等。
- 主要是新增 `fabfile.py`/辅助脚本，不触碰 runtime 内核。

主要落点：
- `fabfile.py`
- 必要时 `scripts/` 下新增薄包装
- `docs/perf/07-optimization-backlog-and-routing.md`（字段对齐）

并行/串行：
- 与 `R-1`、`S-2`、`S-3` 都低冲突，可并行。
- 这条线不应修改 `packages/logix-core/src/internal/runtime/core/**`。

API 变动：
- 不需要。

### `S-4` · current-head full-matrix 刷新解锁

问题：
- 当前 perf 主线虽然已有 targeted 证据，但 full-matrix 刷新曾被 `runtime store: multi-instance isolation (same moduleId, different instanceId)` 挡住。
- 这使得 current-head 的 broad/full 收口能力不稳定，后续每刀都更依赖 targeted 证据。

架构缺陷：
- perf 体系对“全量矩阵能否刷新”过度依赖少数语义测试；一旦其中一条功能/隔离线回归，整个 broad 收口就被拖住。

预期收益：
- 中等。
- 不直接提速 runtime，但能恢复 full-matrix 刷新能力，让后续性能刀更快收口。

实施成本：
- 中等。
- 可能需要在 `runtime-store-no-tearing` 测试、`RuntimeStore`、`TickScheduler`、相关 instance key 路径里定位语义问题。

主要落点：
- `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- 必要时少量触及 `ModuleRuntime.impl.ts`

并行/串行：
- 可并行，但它和 `R-1` 的冲突风险高于 `S-2/F-1`。
- 若需要改 `ModuleRuntime.impl.ts`，则必须与 `R-1` 串行；若只改 `RuntimeStore/TickScheduler/test`，可继续独立推进。

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

### 可以并行

1. `R-1` + `F-1`
- 一个改 runtime core 调度，一个改自动化编排层。
- 文件集完全分离。

2. `R-1` + `S-2`
- 一个改 `txnLanes` 主线，一个改 watcher benchmark 语义。
- 只要 `S-2` 独立 worktree，就不会互踩。

3. `R-1` + `S-3`
- 一个改 runtime core policy，一个改 matrix/gate 语义。
- 冲突面很低。

4. `F-1` + `S-2`
- 一个改自动化，一个改 benchmark 语义，几乎无共享文件。

5. `F-1` + `S-4`
- 一个改自动化，一个改 full-matrix 刷新解锁，冲突面低。

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

1. 主线：`R-1`
2. 并行副线：`S-2`（独立 worktree）
3. 并行自动化：`F-1`
4. 可选第四线：`S-4`（先限定在 test/RuntimeStore/TickScheduler 范围）
5. `S-3` 已收口，不再占新 worktree

### Phase 2

- 只有当 `R-1` 收益已经确认后，才决定：
  - `watchers` 是否在 suite 校正后还剩 runtime 问题
  - `R-2` 是否值得立项
- `F-1` 不依赖 `R-1` 收敛，可持续并行演进。

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
