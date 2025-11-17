# Data Model: 运行时可观测性加固

**Feature**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/spec.md`  
**Created**: 2025-12-23

> 说明：本特性不涉及持久化数据模型；此处的 “Data Model” 指运行期的结构化实体、键与状态转换，用于可诊断性与回放对齐。

## Entities

### 1) DiagnosticsScope（诊断作用域）

**Represents**: 一次入口调用点希望附加给“后续事务执行”的最小诊断上下文集合。

**Fields (conceptual)**:

- `linkId`：用于贯穿“同一业务触发”的链路标识。
- `runtimeLabel`：运行时分组标签（用于 Devtools/证据聚合）。
- `diagnosticsLevel`：诊断分档（off/light/full）。
- `debugSinks`：调用点局部追加的输出通道集合（用于“只在某段 scope 内额外采集/输出”）。
- `transactionOverrides`：事务覆盖（如存在），用于在队列边界保持语义一致。

**Validation rules**:

- 作用域传播不得引入对整包上下文的意外引用（只传播最小集合）。
- 作用域传播不得改变事务顺序与状态结果（只影响诊断与导出面）。

### 2) SnapshotToken（快照变更令牌）

**Represents**: 单调递增的变化指示，用于外部订阅者可靠判断快照是否发生“对外可见变化”。

**Fields**:

- `value: number`（单调递增，允许溢出后重置为 0 的策略需显式定义；默认不启用）

**Validation rules**:

- 每次快照发生对外可见变化时，token 必须变化。
- 反向不变量：当 token 未变化时，快照的对外可见字段不得变化（避免 tearing/外部订阅读到不一致视图）。
- 允许通知合并/节流，但不得出现“token 变化而订阅者永远不被通知”的情况。

### 3) DevtoolsSnapshot（调试聚合快照）

**Represents**: 面向调试 UI 的聚合视图（Recording Window + 派生缓存）。

**Fields**:

- `instances`：按 `runtimeLabel::moduleId` 聚合的活跃实例计数。
- `events`：最近事件窗口（按时间顺序排列，有容量上界）。
- `latestStates`：按实例键的最新状态摘要缓存。
- `latestTraitSummaries`：按实例键的最新 trait 摘要缓存。
- `exportBudget`：导出边界的降级计数（累计值）。
- `snapshotToken`：快照变更令牌（用于外部订阅安全）。

**Validation rules**:

- `events` 有容量上界（Recording Window），不代表 run 全量历史。
- `latestStates/latestTraitSummaries` 必须可回收，避免随历史实例无限累积。
- 任何可导出载荷必须保持 Slim 且可序列化。
- `snapshotToken` 是快照的外部变更检测事实源：对外可见字段变化必须推动 token 单调变化；外部订阅者应订阅 token 而非快照对象引用。

### 4) InstanceKey（实例键）

**Represents**: 派生缓存与聚合视图的主键。

**Fields**:

- `runtimeLabel`
- `moduleId`
- `instanceId`

**Derived keys**:

- `moduleKey = runtimeLabel::moduleId`（instances 聚合维度）
- `instanceKey = runtimeLabel::moduleId::instanceId`（latest\* 缓存维度）

### 5) RuntimeDebugEventRef（可导出事件引用）

**Represents**: 统一、可 JSON 序列化的事件视图（用于 Devtools/证据包消费）。

**Source of truth**:

- 以现有的 `RuntimeDebugEventRef` 裁决口径为准（并保持与观测协议一致）。

## State Transitions

### A) 事务入队 → 执行

- **Input**: 调用点的 DiagnosticsScope
- **Transition**: 入队时捕获 DiagnosticsScope；执行时回灌到事务执行上下文
- **Output**: 事务内产生的可观测事件与调用点作用域一致（链路贯穿/标签一致/输出通道一致）

### B) 事件写入（Debug record）

- **Input**: 单条宿主内事件
- **Transition**:
  - `instances`：对 module:init/module:destroy 做计数增减
  - `latestStates/latestTraitSummaries`：对 state:update 做更新
  - `events`：写入事件窗口（有上界）
  - `exportBudget`：累积导出边界降级计数
  - `snapshotToken`：对外可见变化 → token 变化

### C) 实例销毁（module:destroy）

- **Input**: 实例销毁事件（包含 moduleId/instanceId/runtimeLabel）
- **Transition**:
  - `instances`：减少计数并在归零时清理键
  - `latestStates/latestTraitSummaries`：按 instanceKey 删除对应条目
  - 可选：清理与 instanceId 直接相关的标签索引

### D) 清空窗口 / 切换 run

- `clearDevtoolsEvents`：清空 `events` 与 `exportBudget`，并触发 `snapshotToken` 变化。
- `startDevtoolsRun`：重置 run 标识与 event 序列号，并清空窗口（不改变业务语义）。
