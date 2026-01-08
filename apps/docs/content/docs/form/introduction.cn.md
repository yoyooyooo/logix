---
title: 概览：Form 的模型
description: 先建立清晰的心智模型，再开始写 Demo。
---

## 1) Form 是什么

`@logixjs/form` 提供 `Form.make(id, config)`：它返回一个 **Form Module**（模块定义对象），可以直接被 Runtime / React 消费。

- **Runtime**：可以直接 `Logix.Runtime.make(FormModule, ...)` 启动（无需手动拆出 `FormModule.impl`）。
- **React**：可以直接 `useForm(FormModule)` 获取表单视图与默认 `controller`（如 `handleSubmit/validate/reset/...`）。
- **组合**：当你需要把表单作为子模块装进更大的 Runtime 时，才需要用到 `imports: [FormModule.impl]`。

也就是说：Form 不是“挂在 React 组件上的局部 state”，而是一个可以被 Runtime 管理、组合与调试的模块。

> [!TIP]
> Form 的派生/联动/校验能力底层来自 traits（能力声明与收敛）。如果你想建立更系统的心智模型：
> - [Traits（能力声明与收敛）](../guide/essentials/traits)

## 2) 表单状态长什么样

一个 Form 的 state 由四部分组成：

- **values**：你关心的业务表单值（由 `config.values` 的 Schema 决定）
- **errors**：错误树（规则、手动错误、Schema 错误都写进这棵树）
- **ui**：交互态（例如 touched/dirty）
- **$form**：表单元信息（submitCount/isSubmitting/isDirty/errorCount 等）

其中 `errorCount` 用于在 UI 侧 O(1) 判断 `isValid/canSubmit`，避免扫描整个错误树。

## 3) 错误树的统一口径：`$list/rows[]`

数组字段的错误写回统一使用 `rows` 映射：

- valuePath：`items.0.name`
- errorsPath：`errors.items.rows.0.name`

列表级与行级错误也有固定位置：

- 列表级：`errors.items.$list`
- 行级：`errors.items.rows.0.$item`

这套口径的目的：让 **数组增删/重排** 时，错误树与 UI 树能稳定“跟着行走”，而不是因为 index 漂移产生错位。

## 4) 事务语义：一次交互最多一次可观察提交

在 React 侧你通常会调用：

- `useField(form, path).onChange(...)`（内部派发 `setValue`）
- `useField(form, path).onBlur()`（内部派发 `blur`）
- `useFieldArray(form, listPath).append/remove/swap/move(...)`

这些都进入同一个 Runtime 的事务窗口，由运行时统一执行派生/校验写回，并以“最多一次提交”的方式通知订阅者。

## 5) 推荐入口：`derived + rules`

日常业务表单推荐只用两类顶层概念完成：

- `derived`：派生/联动（computed/link/source），只写 values/ui
- `rules`：校验（field/list/root），只写 errors

`traits` 仍然保留，但更适合高级能力或性能/诊断对照，不建议作为默认入口。
