---
title: Trait System · 跨模块派生（以 Link.make 为准）
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - packages/logix-core/src/Link.ts
  - packages/logix-core/src/internal/runtime/ModuleFactory.ts
  - examples/logix/src/scenarios/cross-module-link.ts
  - docs/specs/drafts/topics/trait-system/01-current-coverage.md
---

# Trait System · 跨模块派生（以 Link.make 为准）

## 概述

澄清“跨模块派生（Cross-Module Derived State）”在当前实现中的唯一正确心智模型，避免继续沿用早期 “Schema Link / Link.to” 叙事造成事实源漂移。

本文只讨论当前已落地的跨模块胶水：`Logix.Link.make`。

不把跨模块派生塞回 `StateTrait.link`；后者只用于同模块内的字段联动/派生。

## 约束与裁决

- **不跨模块写 state**（原则）：跨模块逻辑只能通过目标模块的公开入口（dispatch / actions）驱动其 own transaction。
- **派生不是“免费的同步字段”**：跨模块派生在实现上必然是一个 process（Effect），它订阅 A，再驱动 B；它不是 schema 级自动 join。
- **去随机化与可诊断性**：跨模块链路必须能在事件流里被定位（`Link.make` 已把 `_linkId` 附在 Effect 上，供后续 Devtools 消费）。

## Link.make 的真实形态（机制）

### 1) Link.make 是“冷 Effect”

- `Link.make({ modules }, logic)` 返回 `Effect`，通常挂到 `ModuleImpl.implement({ processes })` 或应用启动逻辑中统一 fork。
- 它不持有自己的 state；只拿到参与模块的只读 handle（read/changes/dispatch/actions$）。

实现入口：`packages/logix-core/src/Link.ts`、`packages/logix-core/src/internal/runtime/ModuleFactory.ts`。

### 2) 正确用法：订阅 → 决策 → 派发

示例（已存在）：`examples/logix/src/scenarios/cross-module-link.ts`

模式要点：

- 用 `A.changes(selector)` 订阅变化；
- 在 handler 中对 B 执行 `dispatch/actions.*`；
- B 内部仍然走自己的事务窗口（0/1 commit + converge/validate）。

### 3) 与 StateTrait.link 的边界

- `StateTrait.link`：同模块字段复制/联动（from → to），运行在同一事务内，属于“派生收敛”的一部分。
- `Link.make`：跨模块胶水，属于“多模块协作流程”；它不是字段级派生，不能也不应尝试在 schema 层把 A 的字段“镶进”B 的 state。

## 推荐落点（当你真的想要“跨模块派生字段”）

如果业务想在模块 B 中暴露一个“由 A 推导的只读视图”，唯一合格路径是：

1) 在 B.state 中明确建一个 **投影字段**（通常放 `ui.*` 或其它非业务真相源槽位）；  
2) 用 `Link.make` 监听 A，并通过 B 的 action 写入该投影字段；  
3) 把它视为 **缓存/解释用 view**，而不是“唯一真相源”。

这保证：

- B 的事务语义不被破坏；
- Devtools/回放可以复现（A→Link→B 的事件链明确）；
- 不引入跨模块写入的隐式副作用。
