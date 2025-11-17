---
title: Form Session Draft Pattern 与表单引擎的交汇点
status: draft
version: 0.1.0
value: extension
priority: 400
related:
  - ./00-design.md
  - ./20-boundary-analysis.md
  - examples/logix-form-poc/README.md
---

# Form Session: Draft Pattern 与表单引擎的交汇点

> 核心想法：不把 Draft Pattern 做成全局 Runtime 能力，而是先在 `@logix/form` 中以 `FormSession` / `WizardSession` 形态落地 80% 事务特性。

## 1. 问题重述

- Draft Pattern 草案试图构建一个通用的「交互事务」运行时，覆盖各种瞬时交互；
- 实际 ToB 落地里，最刚需的场景几乎都集中在表单/向导（包括复杂动态列表、矩阵编辑等）；
- 直接实现通用 Draft Runtime 成本较高且边界复杂。

## 2. 会合点设计

- 在 `@logix/form` 中定义：
  - `FormSession`：针对单表单的交互事务封装，支持 rollback/commit、保留临时状态；
  - `WizardSession`：针对多步向导的长事务封装；
- 内部可以借用 Draft Pattern 草案中的事务语义（Atomicity/Isolation），但对外只暴露 Form 语义；
- React Adapter 层只提供 `useFormSession` 等 Hook，不直接引入 `useDraft`，避免适配层承载领域概念。

## 3. 后续动作（供未来整合用）

- 在 runtime-logix/form 规范中加入一节「Form Session & Draft Pattern」，明确：
  - Form Session 是 Draft Pattern 在表单领域的具体化；
  - Draft Pattern 的通用形态是否需要、何时需要由后续演进决定。
