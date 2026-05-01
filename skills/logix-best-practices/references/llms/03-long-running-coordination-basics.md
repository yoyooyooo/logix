---
title: 长运行协作基础（LLM 版）
---

# 长运行协作基础（LLM 版）

## 1) 何时引入长运行协作

- 模块内行为：优先 Logic。
- 跨模块 read/dispatch：收敛到更小、可解释的协作 contract。
- 同步可静态表达协作：优先声明式协作。
- async/external bridge：显式承认 best-effort 边界。

## 2) watcher 并发模型

- watcher 是长运行 Effect。
- 多 watcher 挂载用并发组合，不顺序阻塞。
- 典型策略：latest / exhaust / parallel / task family。

## 3) 协作设计建议

- 避免模块间“私下耦合写状态”。
- 协作入口显式化（use-case coordinator / long-running coordinator）。
- 高风险协作必须保留诊断与回放证据。
