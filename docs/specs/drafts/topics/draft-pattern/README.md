---
title: Draft Pattern · Topic Overview
status: draft
version: 2025-12-03
value: extension
priority: next
related: []
---

# Draft Pattern · Topic Overview

本 Topic 讨论的 **Draft** 是 Logix v3 中用于处理「瞬时交互 (Ephemeral Interaction)」的架构模式，与 `docs/specs/drafts` 目录中的“草稿分层体系”无直接关系。

核心关注点：

- 将复杂交互过程建模为长活事务（类似 STM）的 Draft 会话，隔离交互状态与领域状态；  
- 通过明确的 Contract 定义 Draft 的类型签名与运行时行为；  
- 在 React 环境下提供舒适的 `useDraft` / 事务边界 DX，并厘清与 Flow/Domain 的边界。

## 文档索引

- [00-design.md](./00-design.md) · Draft Pattern 设计（Ephemeral Interaction & Transaction 的总体思路）  
- [01-contract.md](./01-contract.md) · Draft Pattern Contract（核心类型定义与运行时契约）  
- [10-react-integration.md](./10-react-integration.md) · React 集成与 DX（`useDraft` Hook 等实践方案）  
- [20-boundary-analysis.md](./20-boundary-analysis.md) · Draft Pattern vs Flow/Domain 边界分析
