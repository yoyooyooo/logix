# Contracts: Watcher Routing (068)

**Spec**: `specs/068-watcher-pure-wins/spec.md`  
**Plan**: `specs/068-watcher-pure-wins/plan.md`

本文件把 “watcher 分发/订阅传播” 的关键语义边界固化为契约，确保实现优化不会引入隐式语义变化，并且在出现降级/回退时可解释、可诊断。

## Action routing contract

### C-ACT-001: tag watcher 的触达范围

- 对 `$.onAction("tag")`（或等价字面量 tag 形态）：
  - MUST 仅接收 `_tag/type` 匹配该 tag 的 Action；
  - MUST 不因系统中存在其他 tag watcher 而额外承担“无关触达/无关背压”的系统性成本。

### C-ACT-002: predicate/schema watcher 的保守语义

- 对 `$.onAction(predicate)` / `$.onAction(schema)`：
  - MUST 保持“全量 Action 可见”的保守语义；
  - 允许其维持全量订阅（未来若引入静态分析，只能作为可解释的优化，且必须有回退/门禁）。

### C-ACT-003: 顺序与可靠性（不改业务语义）

- 在同一模块实例内：
  - tag watcher 对某 tag 的接收顺序 MUST 与该 tag 的 dispatch 顺序一致；
  - 任何丢弃/重排/合并语义 MUST 显式 opt-in，默认不得发生。

### C-ACT-004: 背压传播面的解释

- publish 可能等待（lossless/backpressure）时：
  - MUST 能通过诊断锚点解释“等待发生在哪个分发面”（例如 all-stream vs tag topic），用于定位“谁在拖慢谁”；
  - 默认档位下不得为此承担不可控的常驻成本。

## State subscription contract

### C-STA-001: 声明依赖→增量通知

- 对能声明/推导依赖范围的订阅：
  - 当一次提交的 dirtySet 与订阅依赖无交集时，订阅 MUST 不触发 handler 且不产生通知。

### C-STA-002: 安全回退（保守正确）

- 当订阅无法声明/推导依赖范围时：
  - 系统 MUST 允许回退为逐提交重算（保守正确）；
  - 并且 MUST 提供严格门禁（warn/error）以避免关键模块“悄悄退化”。

### C-STA-003: selectorId 一致性

- 任何进入 SelectorGraph 的订阅：
  - selectorId 必须稳定且可复现；
  - 不允许不同语义（依赖集合/等价判定）共享同一 selectorId（避免缓存/索引复用错误）。

## Compilation enhancement contract

### C-COMP-001: 无编译期优化也可用

- 在未启用编译期优化或缺失静态化产物时：
  - 运行时 MUST 保持正确行为与语义一致；
  - 不得因缺失产物而崩溃或要求用户配置构建期编译增强才能运行。

### C-COMP-002: 保守正确（宁可放过不可错杀）

- 当显式启用编译期优化时：
  - 仅当编译器能证明语义等价时，运行时 MAY 使用静态化产物；
  - 任何不确定/不可分析场景 MUST 自动回退到运行时保守路径（不得误优化）。

### C-COMP-003: 回退可解释且可门禁

- 当发生回退/降级时：
  - MUST 提供可序列化、稳定原因码的诊断锚点；
  - MUST 支持严格门禁（warn/error 或 fail fast）以避免关键模块悄悄退化。
