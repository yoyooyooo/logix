# Research: 098 O-008 Scheduling Surface

## Decision 1: 统一策略快照在“调度决策窗口”内只解析一次

**Chosen**: 在一次调度决策窗口（enqueue → schedule tick → flush）内使用同一份 `SchedulingPolicySurfaceSnapshot`，并把该快照传递给 queue/tick/concurrency 相关逻辑。

**Rationale**:

- O-008 核心问题是“同一行为链路内多处各自解析策略导致漂移”。
- 单窗口单快照可直接消除 queue/tick/concurrency 的观测不一致。

**Alternatives considered**:

- 每个子模块独立解析并依赖缓存：仍可能因读取时机不同出现边界漂移。
- 全局进程级缓存：跨实例污染风险高，不利于 per-instance 可解释性。

## Decision 2: backlog/degrade 事件采用统一语义集合

**Chosen**: backlog / degrade / recover 使用统一事件语义与字段口径，至少包含 `reason/configScope/threshold/observed/snapshot`，并保证每条事件对应唯一调度事实。

**Rationale**:

- 诊断的核心是“行为可解释”，事件字段必须与真实调度动作一一对应。
- 统一语义能避免 `TickScheduler` 与 `txnQueue` 各自定义 reason 导致解释断层。

**Alternatives considered**:

- 保持现有多套 reason，仅做映射文档：维护成本高且易漂移，不能形成硬约束。
- 只在 Devtools 层做适配：无法约束底层协议，测试难以覆盖。

## Decision 3: 破坏性演进采用迁移说明，不提供兼容层

**Chosen**: 统一 scheduling surface 后若有字段或事件协议变化，直接 forward-only 迁移（文档 + quickstart + PR migration notes），不引入兼容层。

**Rationale**:

- 仓库策略已明确拒绝向后兼容。
- 兼容层会制造双语义，放大调度与诊断不一致风险。

**Alternatives considered**:

- 过渡期双协议：短期平滑但长期形成并行真相源。
- 运行时自动转换旧字段：增加隐式魔法，排障成本更高。

## Decision 4: 诊断成本控制以 slim 事件 + cooldown 为主

**Chosen**: 事件载荷保持 slim、可序列化；高频场景通过 cooldown/suppressedCount 控制噪声，不在 hot path 增加大对象组装。

**Rationale**:

- O-008 触及 runtime 核心路径，诊断必须“默认近零成本”。
- cooldown 机制可避免 backlog 抖动时刷屏，同时保留关键状态切换信号。

**Alternatives considered**:

- 全量事件逐条输出：可解释但性能/存储成本不可控。
- 纯采样不记录抑制信息：会丢失“为什么没发事件”的解释链。
