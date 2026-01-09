---
title: 长链路实现笔记 · K｜业务能力包（Feature Kits Plane）
status: draft
version: 1
---

# 长链路实现笔记 · K｜业务能力包（Feature Kits Plane）

> **主产物**：面向业务开发者的 DX（DSL/约束/默认策略），但运行语义仍以 Runtime 为基座（不要发明第二套引擎）。
>
> **原则**：DSL 表达 What；trait/logic 表达步骤链与约束；adapter 表达平台差异。

## 目录

- 1. form（rules-first / trait / react hooks）
- 2. query（cache / invalidate / tanstack adapter）
- 3. i18n（注入隔离 / ready 语义）
- 4. domain（CRUD 模块化范式）
- 5. auggie 查询模板

## 1) form（rules-first / trait / react hooks）

- **核心实现**
  - 入口：`packages/form/src/form.ts`、`packages/form/src/rule.ts`、`packages/form/src/trait.ts`
  - React：`packages/form/src/react/useField.ts`、`packages/form/src/react/useFormState.ts`
- **常见长链路**
  - rules/validators → trait（computed/link/validate）→ runtime data plane（事务窗口 + scoped validate）→ react subscription（external store）→ hooks
- **tests（先读这些能理解约束）**
  - `packages/form/test/Form.RulesFirst.ComplexForm.test.ts`
  - `packages/form/test/Form.Derived.Guardrails.test.ts`

## 2) query（cache / invalidate / tanstack adapter）

- **核心实现**
  - 入口：`packages/query/src/query.ts`、`packages/query/src/engine.ts`、`packages/query/src/traits.ts`
  - adapter：`packages/query/src/tanstack/observer.ts`
- **常见长链路**
  - query DSL → middleware/traits（执行面/数据面混合）→ cache/invalidate → adapter（TanStack）→ UI
- **tests**
  - `packages/query/test/Query.CacheReuse.test.ts`
  - `packages/query/test/Query.Invalidate.test.ts`

## 3) i18n（注入隔离 / ready 语义）

- **核心实现**
  - 入口：`packages/i18n/src/index.ts`
- **常见长链路**
  - root provider 注入 → 局部模块解析（strict imports）→ ready 语义（避免 setup 阶段误用等待）
- **tests**
  - `packages/i18n/test/I18n.InjectionIsolation.test.ts`
  - `packages/i18n/test/I18n.ReadySemantics.test.ts`

## 4) domain（CRUD 模块化范式）

- **核心实现**
  - 入口：`packages/domain/src/crud.ts`
- **常见长链路**
  - domain API → Module/Logic/Effect（执行面）→ state trait（数据面）→ debug/evidence（观测面）
- **tests**
  - `packages/domain/test/CrudModule.basic.test.ts`

## 5) auggie 查询模板

- “`@logixjs/form` 的 rules-first 模式如何落到 `StateTrait` 的 computed/validate？触发策略在哪？”
- “`@logixjs/query` 的 cache/invalidate 在 runtime 中怎么表达？TanStack adapter 的边界与责任在哪？”
- “`@logixjs/i18n` 如何保证注入隔离？ready 语义如何避免 setup 阶段死锁？”
- “`@logixjs/domain` 的 CRUD 模块如何组织 state/actions/reducers？默认的错误/证据口径是什么？”
