# Research: 并发护栏与预警（限制无上限并发）

**Date**: 2025-12-21  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/021-limit-unbounded-concurrency/spec.md`  
**Goal**: 给出“默认安全 + 显式放开 + 可观测/可预警”的实现决策与理由，避免引入第二套口径或隐式协议。

## Decision 1：并行事件处理默认从 unbounded 收敛为 bounded（默认 16）

**Decision**: 并行事件处理（Flow/Task 的 parallel/exhaust）默认使用有上限并发（默认 16），并允许显式 opt-in 无上限并发。

**Rationale**:

- `unbounded` 在高频触发下会放大 in-flight fiber 数，容易出现 CPU/内存/句柄爆炸，最终表现为卡死或 OOM；这种“资源耗尽”通常不是可控的业务错误语义。
- 有上限并发将“无限增长”转化为“可观测的排队/变慢”，为预警与调优提供空间。
- 默认值需要保守但可用：16 作为通用初始值（可通过控制面覆盖调优）。

**Alternatives considered**:

- 保持默认 unbounded，只做文档最佳实践：无法防止最坏情况，且线上事故缺乏“默认刹车片”。
- 将 source（如 PubSub）改为 bounded：publish 侧会引入等待/阻塞；若不做分层，会把长等待带入事务窗口，违背“事务窗口禁止 IO/长等待”的约束。因此若要满足“必达背压 + 有界”，必须确保等待发生在事务窗口之外（例如入口外侧或 post-commit 阶段）。

## Decision 2：配置入口与覆盖语义复用 013 控制面

**Decision**: 并发控制面配置入口与覆盖语义复用 013：runtime_default / runtime_module / scope_override（provider）三级，优先级为 `provider > runtime_module > runtime_default > builtin`，并在**下一笔事务/操作窗口**生效。

**Rationale**:

- 用户只需要学习一套“控制面”心智模型（入口、优先级、生效时机、可回收/可审计）。
- 运行时内部已有同构实现（`StateTransactionConfigTag` / `StateTransactionOverridesTag` + `ModuleRuntime.traitConvergeConfig`），可直接复用设计而非复制另一套口径。

**Alternatives considered**:

- 仅提供 runtime 级全局开关：无法做到“局部止血/灰度调参”，也不满足 `configScope` 审计需求。
- 以 magic 字段或散落参数注入：违背“内部契约与依赖注入”宪章，且难以测试/隔离。

## Decision 3：诊断信号复用 `diagnostic` 事件类型，结构化数据放入 `trigger.details`

**Decision**: 并发压力预警与无上限 opt-in 提示使用 `DebugSink` 的 `type: "diagnostic"` 事件通道输出：

- `code`: `concurrency::pressure` / `concurrency::unbounded_enabled`（暂定）
- `severity`: `warning` 或 `error`
- `trigger`: `kind/name/details` 中的 `details` 承载 slim、可序列化的结构化字段（含 `configScope`、limit、inFlight 等）

**Rationale**:

- 仓库既有诊断协议与 sinks/console 渲染路径已覆盖 `diagnostic`，无需新增新的 event type 即可完成闭环。
- `trigger.details` 已被设计为承载“可解释的补充上下文”，适合放置小体积 JSON。
- 通过 `configScope` 让 Devtools/日志能解释“哪个层级配置生效”。

**Alternatives considered**:

- 新增专用 trace 事件类型：需要扩展协议与消费者，成本更高且更易口径漂移。
- 把结构化字段塞进 message 文本：可读但不可聚合/不可机器处理，不利于后续 devtools/audit。

## Decision 4：预警触发基于“并发饱和 + 冷却窗口”，避免刷屏

**Decision**:

- 预警阈值默认保持与 spec 一致（积压计数阈值 1000 或持续 5s）；但实现上允许用“并发饱和持续时间/频率”作为主要信号，并在可获得更可靠积压计数时补强。
- 同一 `(moduleId, triggerName, code)` 在冷却窗口内合并/降噪，避免刷屏。

**Rationale**:

- 在 pull-based Stream 上，“未被 pull 的 backlog”常常位于 source（如 PubSub）内部；运行时未必能在不引入新协议的情况下拿到精确队列长度。
- “持续饱和”是一个对用户更稳定的体验信号：说明 handler 处理时间或触发频率超过了系统预算。

**Alternatives considered**:

- 强依赖 source 队列长度：需要新增内部协作协议暴露 source 内部状态，否则只能走不稳定/侵入式路径。

## Decision 5：范围与落点优先聚焦 Flow/Task 的并行模式，其他 unbounded 用法暂不纳入 MVP

**Decision**: MVP 先覆盖对用户最常见/最危险的并行入口（Flow `runParallel`、TaskRunner `parallel/exhaust`）；其它内部 `unbounded`（如少量 start hooks 的并行 forEach）先不纳入本期硬门，但列为后续清理清单。

**Rationale**:

- 降低改动面，先把“默认安全 + 可预警 + 可配置”闭环跑通。
- 保持对外语义清晰：本期解决“并行事件处理模式”的默认风险，不把所有并发策略一次性推倒重做。

## Decision 6：业务通道必达背压，诊断通道可采样/降级

**Decision**:

- 业务 Action / 关键 Task 触发通道为必达（不能丢）：当达到背压上界时，以“等待”实现背压，而不是丢弃/静默跳过/`queue full` 拒绝。
- 背压等待不得发生在 StateTransaction 事务窗口内；如需等待，必须发生在事务窗口之外（入口外侧或 post-commit 阶段）。
- 诊断/Devtools/Trace 等非关键通道允许采样/降噪/降级，且必须对采样/丢弃事实可观测（计数 + 原因），避免反向拖垮业务通道。

**Rationale**:

- 在“不引入持久化存储”的前提下，要同时满足“不能丢”与“硬防内存无限增长”，唯一可行策略是对运行时内部缓冲施加上界并用背压限制生产速率。
- 事务窗口的职责是“纯计算 + 状态写入”，必须保持同步与可预测；把等待放进事务会放大尾延迟并引入死锁风险。
- 诊断本身属于产品能力，但其数据量在压力场景下可能爆炸；必须允许降级，且降级要可解释。

**Alternatives considered**:

- dropping/sliding：违背“业务不能丢”的语义。
- `queue full` 直接拒绝：对业务等价于丢事件（且多数调用方不会处理这个错误）。
- 只做预警不做背压：无法硬防最坏情况下的内存增长，仍可能 OOM。
