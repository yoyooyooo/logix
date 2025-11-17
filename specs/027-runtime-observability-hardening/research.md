# Research: 运行时可观测性加固

**Feature**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/plan.md`  
**Created**: 2025-12-23  
**Status**: Complete

本文件聚焦“如何在不破坏事务语义与默认性能”的前提下，达成链路贯穿、事件窗口性能与缓存回收、以及快照订阅契约。

## Decision 1: 事务队列边界的最小作用域传播集合

**Decision**: 在事务入队时捕获并回灌“最小诊断作用域”，至少包含：

- 链路标识（LinkId）
- 运行时标签（runtimeLabel）
- 诊断分档（diagnosticsLevel）
- 调用点局部追加的输出通道集合（debug sinks）
- 事务覆盖（transaction overrides，若存在）

**Rationale**:

- 队列消费 fiber 是长寿命后台 fiber，不会继承调用点的 FiberRef；若不显式回灌，链路与作用域会在边界断裂，导致“同一业务触发”无法在 Devtools/证据导出中串成因果链。
- 仅传播 FiberRef 与显式 overrides，避免捕获整包 Context（遵守“最小依赖/避免意外引用 root services”的约束）。
- 该传播不改变事务顺序与状态结果，仅提升可诊断性与可解释链路的稳定性。

**Alternatives considered**:

- 显式参数透传（Rejected）：容易造成参数爆炸与调用链侵入，且难以覆盖未来新增的诊断维度。
- 捕获整包 Context（Rejected）：有意外引用/泄漏 root services 的风险，违反最小化注入原则。
- 让入队时 fork 子 fiber 继承上下文再交给队列（Rejected）：会扭曲 FIFO/串行语义或引入额外调度复杂度。

## Decision 2: 事件窗口（ring buffer）的实现策略

**Decision**: 保持 `DevtoolsSnapshot.events` 为“按时间顺序排列的普通数组”，并将“满载淘汰”从逐条 `shift()` 改为“有界批量裁剪”：

- 允许窗口数组在短时间内小幅超出目标大小；
- 当超过阈值时，用一次 `splice(0, excess)` 批量移除最旧事件，恢复到目标窗口；
- 通过阈值设计把单次裁剪的成本摊薄到多次写入，避免高频持续 O(bufferSize) 搬移。

**Rationale**:

- 现有 Devtools UI 与测试大量依赖 `events` 的数组语义（`length`/索引访问/`filter`/for-of），改变为自定义 view 会引发大范围适配与潜在行为分歧。
- 需要保持“写入后可立即读取到最新事件”的同步可见性；将窗口物化延迟到异步批处理会改变既有直觉与用例稳定性。
- “有界批量裁剪”在不引入新数据结构的前提下，将满载场景的单位事件成本从线性搬移降为均摊常数级别，并仍保持窗口有上界。

**Alternatives considered**:

- 真正的环形缓冲（circular buffer）+ 自定义 array-like view（Rejected）：实现复杂且需要复刻 array 方法/语义，风险高。
- circular buffer + 每次读快照时重建有序数组（Rejected）：在高频订阅下可能退化为“每次通知 O(bufferSize) 拷贝”。
- 允许窗口长度大幅超出（Rejected）：会削弱 memory bound 的可预期性与心智模型。

## Decision 3: latestStates/latestTraitSummaries 的回收策略

**Decision**: 在收到实例销毁语义（module:destroy）时，按实例聚合键回收该实例对应的派生缓存条目（latestStates/latestTraitSummaries），并保持其他索引不受影响。

**Rationale**:

- 该缓存以 “runtimeLabel::moduleId::instanceId” 为键，若不在实例销毁时回收会随历史实例无限累积，属于典型内存泄漏路径。
- 以销毁事件为回收触发点可解释且确定，不引入定时器/TTL 等隐式策略。

**Alternatives considered**:

- TTL/定时清理（Rejected）：引入时间语义与额外扫描，且难以解释“何时消失”。
- 基于窗口事件回推活跃实例（Rejected）：需要额外索引与扫描，成本更高且仍可能漏清。

## Decision 4: 快照变更检测契约（外部订阅安全）

**Decision**: 引入单调递增的“快照变更令牌（Snapshot Token）”，用于外部订阅者判断快照是否变化；订阅通知可以合并/节流，但令牌必须能反映“对外可见变化”，并满足反向不变量：**token 未变化时，快照的对外可见字段不得变化**（避免 tearing/丢更新）。

**Rationale**:

- 当前快照对象可为性能保持稳定引用（内部 Map/Array 原位变化）；若外部直接以快照对象作为“变化判定”，会出现引用不变导致的漏更新风险。
- 令牌是轻量、可比较、可导出的变化指示，不要求复制大对象结构，且不改变既有快照的零拷贝策略。
- React/外部订阅者可直接订阅 token（例如 `useSyncExternalStore` 订阅 token，再在 token 变化后读取快照），从而兼顾“zero-copy 快照”与“订阅可靠性”。

**Alternatives considered**:

- 让 `getDevtoolsSnapshot()` 每次返回新对象包装（Deferred）：可解决引用恒定问题，但会引入额外分配；作为备选方案保留，优先采用显式令牌契约以降低误用概率。
- 每次变更深拷贝快照（Rejected）：违反高频场景成本预算。

## Decision 5: 性能与回归测量方案

**Decision**: 增加可复现的 micro-benchmark，用于记录 before/after 基线并在 PR/任务阶段固化为回归证据：

- enqueueTransaction：固定次数入队 + 等待完成，输出总耗时与内存曲线；
- devtoolsHubSink：固定次数事件写入，在“窗口未满/已满”两种状态下输出吞吐与尾延迟估计；
- 长时间运行：创建/销毁大量实例后检查派生缓存规模是否收敛（内存泄漏回归）。

**Rationale**:

- 本特性触及运行时核心路径，必须在实现阶段给出可复现的性能证据与预算对比，避免“凭感觉优化”。
- micro-benchmark 可作为后续自动化回归的种子资产（先落地可复现脚本，再逐步升级为正式基准套件）。

**Alternatives considered**:

- 仅依赖手工 profile（Rejected）：不可复现、不可对比，难以作为质量门槛。
- 复用现有浏览器 perf suite（Deferred）：可作为补充，但本特性核心在 runtime 内核，优先 Node 侧 micro-benchmark。
