# 2026-03-06 · R-1 checkpoint：txn lanes startup phase 仍不能交 runtime 刀

本记录对应 `R-1: txnLanes backlog policy split` 的一次中间收口。

## 结论

- 这次只交 `docs/evidence-only` checkpoint，不落 runtime 代码。
- `txnQueue snapshot -> urgent-aware handoff` 仍然是当前最有价值的方向，但把 startup phase 显式落成“小片段上限 + 首次 host yield 前维持 cap”的版本，**没有稳定带来收益**。
- 因此这轮不值得提交 runtime 刀；相关代码已回退到 branch HEAD，只保留证据与文档。

## 这次实际验证了什么

### 1. 接手时的 candidate baseline

接手 worktree 时的 dirty candidate 包含：
- `txnQueue` backpressure snapshot
- `urgent waiter` 触发时直接 requeue 剩余 non-urgent backlog
- `preUrgentHostYieldBudgetMs = 2`

但当场复核后发现：
- `preUrgentMaxChunkSize = 2` 在代码里**声明了但没有真正生效**。
- 因此接手时的 candidate，本质上仍更接近“queue snapshot + urgent-aware handoff + pre-urgent host yield”，而不是一个真正落地的 startup-phase split。

baseline 证据：
- `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.r1queue6.txn-lanes-startup-cap.targeted.json`

关键点位（`e2e.urgentToStableMs p95`）：
- `default 200`: `53.5ms`
- `default 800`: `51.4ms`
- `default 2000`: `47.9ms`
- `off 200`: `54.0ms`

### 2. 失败试探 A：把 startup cap 直接接上

先做了一次最直接的 sanity check：让 `preUrgentMaxChunkSize = 2` 真正限制 pre-urgent chunk growth。

结果更差：
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1queue6.run1.txn-lanes-startup-cap.targeted.json`

这版说明：
- 不能把 startup cap 一路保持到“看到 urgent waiter”为止；这样会明显拖慢 backlog 自身吞吐，连 `default 2000` 也一起抬高。

### 3. 失败试探 B：只把 startup cap 保留到“第一次真正 host yield 或 urgent waiter”

随后把策略收敛成更合理的显式 phase：
- startup 期间限制 chunk growth
- 不再无限期维持 cap
- 一旦发生第一次真正 host yield，或已经观察到 `urgent waiter`，就退出 startup phase

3 轮 quick audit 结果仍然负收益：

| 样本 | default 200 | default 800 | default 2000 | off 200 |
| --- | ---: | ---: | ---: | ---: |
| baseline (`r1queue6 before`) | 53.5 | 51.4 | 47.9 | 54.0 |
| `r1queue7 run1` | 72.7 | 54.4 | 59.1 | 51.9 |
| `r1queue7 run2` | 60.9 | 61.0 | 57.8 | 50.4 |
| `r1queue7 run3` | 60.8 | 61.3 | 55.9 | 51.1 |

对应证据：
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1queue7.run1.txn-lanes-startup-phase.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1queue7.run2.txn-lanes-startup-phase.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1queue7.run3.txn-lanes-startup-phase.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1queue7.run1.txn-lanes-startup-phase.strict.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1queue7.run2.txn-lanes-startup-phase.strict.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1queue7.run3.txn-lanes-startup-phase.strict.targeted.json`

## 为什么这版还不能交 runtime 刀

1. 它不是“个别点位噪声”，而是 `default` 三档整体被抬高。
2. 3 轮 quick audit 没有复现主会话口头记录里的较好 live run，而是稳定显示回归。
3. 这说明“把 startup phase 显式化”本身还没有找到对的切面；当前写法把“让 urgent 更早插入”和“维持 backlog 吞吐”重新绑死了。

## 当前裁决

- `blind first-host-yield`：已证伪，继续禁止。
- `explicit startup-cap/startup-phase`：这次 3 轮 quick audit 仍证伪，不作为当前 runtime cut。
- `txnQueue snapshot -> urgent-aware handoff`：仍是当前最有价值的方向，但必须在**不引入 startup-phase 回归**的前提下拿到稳定 quick evidence，才值得再次进 runtime 提交。

## 本 checkpoint 的代码处理

- 已回退 runtime 代码到 branch HEAD：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- 本次提交只保留：
  - 证据样本
  - diff 结果
  - 文档结论

## 下一步建议（仍然只打 R-1）

- 保留 `txnQueue snapshot -> urgent-aware handoff` 这条主线认知，不再重复：
  - blind first-host-yield
  - 把 startup cap 直接固化为正式策略
- 如果后续还要继续试 runtime，需要优先回答：
  - urgent 让路信号是否应该直接来自 queue baton，而不是 host-yield 前的 pre-urgent phase
  - 有没有比 startup cap 更窄的“只在 urgent 已真实排队时才生效”的 handoff 切面
