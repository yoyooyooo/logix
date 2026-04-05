# 2. 核心视图

## 2.0 OverviewStrip（事务/渲染密度概览）

OverviewStrip 是 Devtools 面板顶部的密度条（默认 24 根柱子），用于在不滚动 Timeline 的情况下快速回答：

- 最近一段时间内是否出现**事务爆发（burst）**：短时间内大量事务/状态提交；
- 是否存在明显的**空窗（idle gap）**：长时间没有事务；
- 哪一段时间片需要进一步 drill-down（点击柱子设置 `timelineRange`）。

### 2.0.1 核心概念与字段

Overview 的 debug info（OverviewDetails 面板内输出的 JSON）中，跟分析相关的字段可以按三层理解：

1. **“我在看谁？”（selection）**

- `selection.selectedRuntime` / `selectedModule` / `selectedInstance`：当前 Devtools 的选中对象，决定 Timeline/Inspector/Overview 的聚合维度。

2. **“事件缓冲区是什么？”（timeline）**

- `timeline.length`：Devtools 当前事件缓冲区长度（受 `settings.eventBufferSize` 控制；默认 500）。
- `timeline.lastTypes`：最近 12 条事件的 `event.type` 摘要，用于快速判断事件流模式（例如 `trace:effectop` 与 `state:update` 的交替）。
- `timeline.timelineRange`：当前是否处于“时间窗口聚焦”状态；为 `null` 表示未聚焦。

3. **“Overview 统计结果是什么？”（overview / buckets）**

- `overview.constants.MAX_BUCKETS`：柱子数量（默认 24）。
- `overview.constants.bucketMs`：每根柱子覆盖的时间粒度（毫秒）。
  - 当前实现会根据 Timeline 首尾事件的时间跨度选择一个离散档位（25ms ~ 10s），以避免粒度抖动导致 UI 不稳定。
- `overview.constants.windowMs = bucketMs * MAX_BUCKETS`：Overview 覆盖的总时间窗口（毫秒）。
- `buckets.count`：等于 `MAX_BUCKETS`。
- `buckets.emptyBuckets` / `nonEmptyBuckets`：空桶数量与非空桶数量；空桶对应该时间片没有观测到事务/渲染事件。
- `buckets.maxTxn` / `maxRender` / `maxValue`：用于把柱高归一化；`maxValue = max(maxTxn, maxRender, 1)`。

单个桶（`overview.buckets.items[]`）的关键字段：

- `bucketId`：时间桶编号，约等于 `floor(timestamp / bucketMs)`；绝对值是 epoch 相关索引，通常只看相对顺序。
- `txnCount`：该桶内的**事务计数**（不是事件条数）。
  - 逻辑上优先按 `RuntimeDebugEventRef.txnId` 去重；
  - 缺少 `txnId` 的事件会按事件索引或 EffectOp `linkId` 等策略兜底，使密度信号尽量不丢失（仅用于 UI 近似，不作为协议保证）。
- `renderCount`：该桶内 `kind = "react-render"` 的渲染事件数量（若启用采样，则为采样值）。
- `level`：桶的告警级别（`ok` / `warn` / `danger`），由密度阈值推导（见 `settings.overviewThresholds`）。
  - `txnPerSecond = txnCount * 1000 / bucketMs`
  - `renderPerSecond = renderCount * 1000 / bucketMs`
  - 默认阈值：`txnPerSecondWarn = 50`、`txnPerSecondDanger = 150`、`renderPerTxnWarn = 3`、`renderPerTxnDanger = 6`。
- `isTip`：是否为当前窗口内最右侧的“最新桶”（右端点），用于驱动插入/高亮策略。
- `isEmpty`：是否为空桶（`txnCount === 0 && renderCount === 0`）。
- `startIndex` / `endIndex`：该桶覆盖到的 Timeline 索引范围（闭区间）。
  - 点击该桶会设置 `DevtoolsState.timelineRange = { start, end }`，用于让 Timeline/Inspector 聚焦到这一段。
- `lastChangedAt`：桶计数最近一次“增加”时的本地时间戳（用于短暂高亮）；当桶后续变为空时该值可能仍保留，但 UI 会忽略空桶的高亮。

### 2.0.2 如何解读一份实际样例（结合 debug info）

以你提供的样例为例：

- `bucketMs = 150`、`MAX_BUCKETS = 24` ⇒ `windowMs = 3600ms`  
  这表示 Overview 覆盖最近约 **3.6 秒**，每根柱子代表 **150ms**。
- `timeline.length = 500` 表示当前事件缓冲区已满（或接近满）；但 Overview 只展示其中落在最近 3.6 秒窗口内的密度分布。
- `emptyBuckets = 17`、`nonEmptyBuckets = 7`  
  说明在最近 3.6 秒里，约 `17 * 150ms = 2550ms` 没有事务/渲染（空窗较多），剩余约 `1050ms` 内发生了多段 burst。

再看几个桶的密度：

- `bucketId = 11770730828`：`txnCount = 67`、`bucketMs = 150`  
  `txnPerSecond ≈ 67 * 1000 / 150 ≈ 446 txns/s`，远高于默认 danger 阈值 `150 txns/s`，因此 `level = "danger"`。
- `bucketId = 11770730822`：`txnCount = 26`  
  `txnPerSecond ≈ 173 txns/s`，同样会落入 `danger`。
- `bucketId = 11770730820`：`txnCount = 3`  
  `txnPerSecond ≈ 20 txns/s`，因此 `level = "ok"`。

如何进一步定位问题：

1. 优先点击 `txnCount` 最高的桶（例如 `startIndex=213, endIndex=321` 对应的桶），让 Devtools 自动设置 `timelineRange`。
2. 在 Timeline / EffectOpTimelineView 内只看该范围内的事件，结合 `lastTypes` 的模式（`trace:effectop` 与 `state:update` 交替）判断：
   - 是不是一次业务输入导致“重复 dispatch / 重复事务 commit”；
   - 或者 Trait/EffectOp 链路在短时间内被触发过多次（例如计算/联动回路）。
3. 再用 Inspector 的 Transaction Summary / State After Event 来确认：高 `txnCount` 是否对应真实的多次状态提交，还是“同一事务内大量 trace 事件”造成的观测噪音（两者在优化策略上差别很大）。

## 2.1 Timeline (时间轴)

展示应用运行的时间线。每个节点代表一个 Action 或 State Change。

## 2.2 State Tree (状态树)

实时展示当前的 State 结构。

## 2.3 Logic Flow (逻辑流)

这是 Logix 特有的视图。它展示了 Action 是如何一步步触发 Flow，进而产生 Effect 的。
