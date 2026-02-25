---
title: Flow / Process 协作基础（LLM 版）
---

# Flow / Process 协作基础（LLM 版）

## 1) 何时用 Process

- 模块内行为：优先 Logic。
- 跨模块 read/dispatch：使用 Process。
- 同步可静态表达协作：优先 `linkDeclarative`。
- async/external bridge：使用 `link`。

## 2) watcher 并发模型

- watcher 是长运行 Effect。
- 多 watcher 挂载用并发组合，不顺序阻塞。
- 典型策略：latest / exhaust / parallel / task family。

## 3) 协作设计建议

- 避免模块间“私下耦合写状态”。
- 协作入口显式化（process/use-case coordinator）。
- 高风险协作必须保留诊断与回放证据。
