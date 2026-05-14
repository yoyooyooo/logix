---
title: Form or plain Logix
description: 为需要的状态选择更小的 owner。
---

选择能表达行为且不发明第二套模型的最小 owner。

## Plain Logix

普通 module 足以表达 durable UI state、workflow、搜索、过滤、乐观更新、后台刷新，以及不是可编辑表单的领域 state。

## Form

当状态包含 editable values 加 validation、submit decode、source receipts、companion facts、field arrays 或 dirty/submitting/error counts 这类 form-specific meta 时，使用 Form。

## Split route

一个 route 可以同时使用二者。host module 拥有 navigation 和 page state；Form program 拥有 values 与 submit。

```ts
const PageProgram = Logix.Program.make(Page, {
  initial,
  capabilities: { imports: [CheckoutForm] },
})
```
