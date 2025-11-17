---
title: Module Definition Future
status: draft
version: 1.0.0
layer: Consolidating Topic
---

# Module Definition Future (Master Topic)

> **Status**: Consolidated Draft (已整合草案)
> **Value**: core
> **Priority**: mid

本 Topic 整合了关于 Logix 模块定义 API 的实验性想法与未来方向。它探索了我们如何演进 `Module.make` 与 `$.onAction/onState` 模式。

## Contents (目录)

- [01-state-first-codegen.md](./01-state-first-codegen.md) - 关于 "State-First" Module 设计与 TanStack-Router 风格 Codegen 的提案。
- [02-reducer-redesign.md](./02-reducer-redesign.md) - 关于 ActionMap、Reducer 以及 Primary Reducer 边界的重新思考。
- [03-primary-reducer.md](./03-primary-reducer.md) - 深入探讨 "Primary Reducer vs Watcher" 的分层与时序模型。
- [04-action-token-api.md](./04-action-token-api.md) - ActionToken（值级 Action 符号）方案：最小 API + 调研 Sigi `dispatcher.<actionName>` 跳转机制启发。
