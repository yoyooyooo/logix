# 073 规划与设计审查报告 (Design Review)

**Source**: 外部审查材料（本地路径已移除；copied on 2026-01-07）

**Digest**: DONE (2026-01-07)

本报告针对 Phase 3/4/5 新增规划（[scheduler.md](./contracts/scheduler.md), [diagnostics.md](./contracts/diagnostics.md)）进行深度分析。

## 1. 总体评价 (Executive Summary)

新增的调度抽象（`HostScheduler` + [TickScheduler](/packages/logix-core/src/internal/runtime/core/TickScheduler.ts#L39-L49) Yield 机制）极大地提升了 Runtime 的健壮性。**"Yield-to-Host"（反饥饿）策略是本次规划的亮点**，它补全了纯 Microtask 调度方案在重负载下导致 UI 死锁的重大短板。

设计显式区分了 **"逻辑一致性" (Tick/Fixpoint)** 与 **"宿主执行权" (Host Scheduling)**，并引入了完善的可观测性（`trace:tick`），符合 Logix "可解释、可诊断、高性能" 的总体目标。

## 2. 详细设计分析 (Detailed Analysis)

### 2.1 调度抽象 (HostScheduler)

*   **优点**：
    *   **平台无关性**：将 API (`queueMicrotask`, `MessageChannel`, `nextTick`) 封装在 Service 层，为跨端（React Native / Node / Browser）和测试（Deterministic Testing）提供了完美的切入点。
    *   **React 对齐**：采用 `MessageChannel` 作为 Browser 端首选 macrotask 实现，与 React Scheduler 内部机制一致，减少了 Logix 与 React 争抢主线程时的不可预测性。
*   **潜在风险/待明确点**：
    *   **Node.js 环境的 "Macrotask" 定义**：Node 环境下 `setImmediate` 与 I/O 的优先级关系较为复杂。Spec 中提到 "Node 优先 `setImmediate`"，这通常是正确的，但需确保在 `setImmediate` 之前不会被 endless `process.nextTick` 饿死（虽然 `HostScheduler` 旨在解决此问题，但实现细节需小心）。
    *   **微任务深度检测 (`microtaskChainDepth`)**：原生 `queueMicrotask` 不暴露深度。`HostScheduler` 需要自行维护计数器（例如在 `flush` 循环中递增，在 macrotask 中重置）。如果在 implementation 中忽略了这一点，该防线将失效。

### 2.2 反饥饿策略 (Yield-to-Host)

*   **优点**：
    *   明确了 **Urgent vs Non-Urgent** 的资源分配优先级。保证 Urgent 任务（如用户输入反馈）即使在 Yield 前也能完成最小程度的提交，防止交互卡顿。
    *   **Partial Fixpoint** (部分不动点) 的引入是一个 pragmatic (务实) 的权衡。认可 "最终一致性" 在极端负载下的合理性，并通过 `result.stable=false` 保持语义清晰。
*   **建议**：
    *   **Raf 场景的 Yield**：如果当前的 Tick 是由 `requestAnimationFrame` 触发（例如动画驱动），Yield 到 `macrotask` (`MessageChannel`) 可能会导致错过当前帧，造成掉帧。
    *   **建议补充**：不仅支持 `scheduleMacrotask`，是否考虑支持 "Yield to Next Frame" (如果当前处于 RAF 上下文中)？或者明确文档说明：Logix Tick 不应直接驱动高频动画循环（应由 Effect/Stream 驱动样式，Logix 仅做低频状态同步）。

### 2.3 诊断与可观测性 (Diagnostics)

*   **优点**：
    *   **成本门控 (Cost Gating)**：`diagnostics=off` 零成本是核心约束，Spec 对此有严格界定。
    *   **语义化解释**：`trace:tick` 中的 `phase: budgetExceeded` 和 `schedule.forcedMacrotask` 为开发者提供了极佳的调试线索，直接回答 "为什么慢" 和 "为什么分段执行"。
*   **建议**：
    *   **Devtools 依赖**："Partial Fixpoint" (`stable=false`) 严重依赖 Devtools 的可视化（Warn/Error）。如果在无 Devtools 环境下（如生产环境日志），建议允许配置一个低频采样日志，记录 `stable=false` 的发生频率，以便生产环境巡检。

## 3. 改进建议 (Recommendations)

1.  **明确 RAF 交互规范**：
    在 [contracts/scheduler.md](./contracts/scheduler.md) 中补充关于 `requestAnimationFrame` 场景的说明。如果 Logix 状态用于驱动动画（虽然不推荐），Yield 策略是否需要感知 Frame 边界？

2.  **强化测试规约**：
    `HostScheduler` 的引入使得 "Deterministic Testing" 成为可能。建议在 [scheduler.md](./contracts/scheduler.md) 或 `tasks.md` 中明确要求：**必须** 产出针对与 React 并发模式交互的集成测试（例如：Logix Yield 后，React 是否能插入高优先级更新）。

3.  **微任务深度实现指南**：
    在 Implementation Note 中提示开发者：`microtaskChainDepth` 不能依赖宿主 API，必须在 [TickScheduler](/packages/logix-core/src/internal/runtime/core/TickScheduler.ts#L39-L49) 或 `HostScheduler` 内部维护 "当前连续微任务计数"。

4.  **生产环境遥测**：
    建议在 `RuntimeStore` 配置中增加 `onTickDegraded` 回调，允许业务层监控生产环境的 "Ejection" (Yield) 频率，作为性能质量红线的依据。

## 4. 结论

该规划方向正确，架构清晰，解决了 Logix 作为一个通用状态运行时在 "协同多任务" 方面的核心痛点。建议按此规划推进，并在实现阶段重点关注上述的 RAF 交互与深度检测细节。
