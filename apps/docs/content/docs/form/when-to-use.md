---
title: Form or plain Logix
description: Choose the smaller owner for the state you need.
---

Use the smaller owner that can express the behavior without inventing a second model.

## Plain Logix

Plain modules are enough for durable UI state, workflows, search, filters, optimistic updates, background refresh, and domain state that is not an editable form.

## Form

Use Form when state has editable values plus validation, submit decode, source receipts, companion facts, field arrays, or form-specific meta such as dirty/submitting/error counts.

## Split route

A route can use both. The host module owns navigation and page state; the Form program owns values and submit.

```ts
const PageProgram = Logix.Program.make(Page, {
  initial,
  capabilities: { imports: [CheckoutForm] },
})
```
