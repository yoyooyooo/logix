# 06 · Current-Head Triage（识别优先）

本文件是 current-head 的四分法裁决页。

目标不是统计谁红得最多，而是回答五个更重要的问题：
- 现在真正还值得继续砍的 runtime 瓶颈是什么
- 哪些更像 benchmark/计时语义问题
- 哪些只是 gate / matrix 表达噪声
- 背后有哪些原架构层面的系统性税
- 后续应该怎么拆成主线与可并行副线

## 前提

1. `b2e6cf51` 只新增了 `logix-perf-cut-loop` skill 与参考文档，没有改 runtime；因此 current-head runtime 事实仍以现有 perf 证据为准。
2. `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw123.current-head.full-matrix.json` 是 `quick + git.dirty` 样本，只适合做“下一刀选择”，不适合单独当作最终硬裁决。
3. 本页一律用 broad/full matrix + targeted 对照做判断，避免追着单次噪声点继续砍内核。

## 当前证据锚点

- broad/current-head：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw123.current-head.full-matrix.json`
- externalStore targeted：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw124.external-store-current.targeted.json`
- watchers targeted：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw120.watchers-direct-writeback.targeted.json`
- txnLanes targeted：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw116.txn-lanes-click-anchored.targeted.json`

## 当前瓶颈排行

1. `txnLanes.urgentBacklog`
- 当前仍同时出现在 broad 与 targeted 的 `urgent.p95<=50ms` 失败里。
- `ulw123`：`mode=default` 的 `urgent.p95` 为 `45.8 / 51.0 / 56.1ms`（`steps=200/800/2000`），`mode=off` 为 `47.5 / 52.2 / 54.5ms`。
- `ulw116`：click-anchored targeted 仍有 `50ms` 线失败，说明旧 timer 排队噪声已经不是主要解释。
- 结论：这是 current-head 最像“真实残余 runtime 成本”的项。

2. `externalStore.ingest.tickNotify`
- broad current-head 只在 `watchers=256` 出现一次 `full/off<=1.25` 失败；`128` 和 `512` 都过。
- targeted `ulw124` 则到 `watchers=512` 全绿。
- 结论：它仍是需要盯住的稳定性残项，但优先级低于 `txnLanes`，更像“broad matrix 噪声 + 单点残差”。

3. `watchers.clickToPaint`
- broad current-head 在 `watchers=1` 就已经 `56-60ms`，而 `64` 或 `512` 并没有单调更差。
- 当前 full-matrix 非 strict：`1 -> 56.8ms`、`64 -> 49.1ms`、`512 -> 54.9ms`；strict：`1 -> 60.1ms`、`8 -> 49.6ms`、`512 -> 58.1ms`。
- targeted `ulw120` 又说明 runtime 优化已经把 strict `p95<=50ms` 打到 `512`。
- 结论：这条现在更像 benchmark / browser floor 问题，不宜继续把它当作 watcher scaling 的 runtime 主瓶颈。

4. `converge.txnCommit / decision.p95<=0.5ms`
- 失败来源是 `notApplicable`，不是超时或真实回归。
- 结论：这是 gate 语义清理项，不是性能项。

## 四分法裁决

### 1. 真实运行时瓶颈

- `txnLanes.urgentBacklog`
- 原因：broad 与 targeted 都仍然失败；而且它打在 P1 的 `urgent.p95<=50ms` 硬门上。
- 现象特征：不是 backlog 吞吐爆炸，而是“urgent latency 仍然卡在 50ms 边缘”。说明下一刀不该再随机拧常数，而该动 policy 结构。

### 2. 证据语义错误 / benchmark 伪影

- `watchers.clickToPaint`
- 原因：`watchers=1` 已经明显超线，且曲线非单调；这更像浏览器 click-to-paint 地板或 suite 语义仍混入了不该计入 watcher runtime 的成本。
- 裁决：若后续还要继续碰这条线，先修 suite 语义，不再优先向 runtime 再塞 watcher 优化。

### 3. 门禁表达错误

- `converge.txnCommit / decision.p95<=0.5ms`
- 原因：`reason=notApplicable`；属于不应出现在失败视图里的门禁噪声。
- 裁决：后续应修 matrix / gate 表达，而不是继续做 converge 性能优化。

### 4. 已基本解决但仍需稳定性复核

- `externalStore.ingest.tickNotify / full-off`
- 原因：targeted 已过，broad 只剩 `watchers=256` 单点失守。
- 裁决：保留为第二优先级稳定性项；只有在 `txnLanes` 这一刀无稳定收益时，才回到这条线做 targeted 复核与链路清理。

## 背后的架构缺陷（系统性税）

### 1. 调度策略仍以低层常数为主要控制面

表现：
- `txnLanes` 的优化长期围绕 `budgetMs/maxLagMs/chunkSize/yieldStrategy` 这类常数打转。
- 一旦问题从“是否 time-slice”进入“不同 backlog 阶段该如何取舍”，现有控制面就不够表达。

为什么这是架构缺陷：
- runtime 暴露的是低层参数，而不是更高层的 backlog policy。
- 结果是每次优化都容易退化成调参试错，而不是结构性收敛。

### 2. runtime、benchmark、gate 三层边界不够硬

表现：
- `txnLanes` 需要 click-anchored 才能把 timer 排队噪声剥掉。
- `react.strictSuspenseJitter` 之前测到的是多次点击总耗时，而不是真实 suspense 路径。
- `watchers.clickToPaint` 当前仍混着 browser floor 与 runtime 成本。

为什么这是架构缺陷：
- suite 在测什么、gate 在判什么、runtime 在优化什么，这三层没有被硬隔离。
- 结果是内核经常被迫为测量伪影背锅，优化方向容易漂移。

### 3. unavailable / notApplicable 不是 matrix / gate 的一等语义

表现：
- `converge.txnCommit / decision.p95<=0.5ms` 现在仍在失败清单里出现 `reason=notApplicable`。
- `decisionMissing` 和真实性能回归在视图层也容易混在一起。

为什么这是架构缺陷：
- gate 系统没有把“无法比较 / 不适用 / 缺证据”建模成 first-class outcome。
- 结果是 perf 红线里混入大量非性能噪声，拖慢真正的主线推进。

### 4. current-head 真相源容易漂移

表现：
- broad matrix、targeted、计划文档、历史专题有时会停在不同状态。
- 例如 `externalStore` 在历史计划里一度仍是主目标第一位，但 current-head targeted 已表明它更像稳定性残项，而不是最该优先砍的 runtime 主线。

为什么这是架构缺陷：
- 计划层没有持续按 current-head 证据自动收敛。
- 结果是后续 agent 很容易继续沿旧路线优化已经不是最优先的问题。

## 并行 Workstream 拆分建议

### 主线（不要拆给副线）

- `R-1：txnLanes backlog policy split`
- 原因：这是 current-head 唯一确定应继续优先砍的 runtime 主线，而且会直接触及 `ModuleRuntime` 的核心调度策略。
- 主要落点：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
  - `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`

### 可并行副线 A

- `externalStore` 稳定性复核 / targeted 复测 / residual 链路审计
- 说明：与 `txnLanes` 内核调度几乎解耦，主要集中在 writeback / observability 链路。
- 主要落点：
  - `packages/logix-core/src/internal/state-trait/external-store.ts`
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - `packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx`
  - `docs/perf/02-externalstore-bottleneck-map.md`

### 可并行副线 B

- `watchers.clickToPaint` suite 语义纠偏
- 说明：这条线已经不该继续塞主线 runtime 切刀；适合独立分支只动测试 / 证据面。
- 主要落点：
  - `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
  - `packages/logix-react/src/internal/store/perfWorkloads.ts`
  - `packages/logix-react/test/browser/perf-boundaries/*watcher*`
- 额外说明：这条副线会直接改变 benchmark 语义并影响 current-head 可比性，因此实施时仍应优先放到独立 worktree 里做。

### 可并行副线 C

- `converge.txnCommit` gate / matrix applicability 清理
- 说明：这是证据系统清理，不依赖 `txnLanes` 或 `externalStore` 的内核实现。
- 主要落点：
  - `.codex/skills/logix-perf-evidence/assets/matrix.json`
  - `packages/logix-react/test/browser/perf-boundaries/converge-steps.test.tsx`
  - 必要时补充 `logix-perf-evidence` 的 validate / report 视图逻辑

## 暂不建议先做的项

1. `watchers.clickToPaint`
- 先修 suite 语义，再决定要不要继续动 runtime。

2. `converge.txnCommit`
- 先修 gate 表达，把 `notApplicable` 从失败视图里剥离。

3. `externalStore.ingest.tickNotify`
- targeted 已过到 `watchers=512`；当前更像 broad residual，不是最该先砍的主线。

## 建议下一刀（只给一个）

- `R-1：txnLanes backlog policy split`

### 为什么是它

1. 它是 current-head 里最稳定复现的 P1 主门失败。
2. 它既出现在 broad，也出现在 targeted，不是只在某个 noisy suite 里偶发。
3. 它的现象更像“策略层没有把 backlog 启动期与 steady-state 区分开”，继续调 `budgetMs/chunkSize` 这种常数，收益大概率已经见顶。

### 建议切法

- 不再继续拧 `budgetMs/maxLagMs/chunkSize` 的小常数。
- 直接把 `txnLanes` 策略拆成两段：
  - backlog 启动期：优先降低 first urgent after backlog start 的等待
  - steady-state：优先吞吐与 catch-up
- 目标是把 `urgent.p95<=50ms` 从“边缘抖动”变成“稳定过线”，而不是只改善某一个 steps 档位。

## 是否需要 API 变动

- 当前裁决：`R-1` 先不动表面 API。
- 原因：`txnLanes` 还可以先在内核 policy 层做结构性重排，未到必须推翻对外配置面的阶段。
- 只有当 policy split 之后仍然卡在 `50ms` 地板，才再提出更高层的 `TxnLanePolicy` API vNext 收敛方案。
