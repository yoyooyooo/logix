---
title: When to use Form
description: 判断功能需要 Form 领域包，还是普通 Logix Program。
---

当功能主要是 editable input state 时使用 `@logixjs/form`。

## 适合使用 Form

- field-level values 与 blur/change 语义
- validation timing 与 submit gating
- submit 时 decode
- 绑定字段的 source-backed remote facts
- availability/candidates 等 local companion facts
- list row identity 与 reorder-safe operations

## 适合使用普通 Logix

- 非编辑型业务 workflow state
- long-running processes
- cross-module orchestration
- 不是 form 的领域状态
- 更适合直接由 React 持有的 UI state

Form 不应变成通用状态管理器。它是 editable input semantics 的领域包。
