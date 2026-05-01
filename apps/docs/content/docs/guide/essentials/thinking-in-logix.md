---
title: Thinking in Logix
description: Understand Logix through intent, logic, program, and runtime.
---

Logix can be read through four layers:

1. intent
2. logic
3. program
4. runtime

## Intent

Intent describes what may happen.

In practice, it appears as:

- state schema
- action schema

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { increment: Schema.Void },
})
```

## Logic

Logic describes how a module responds.

Pure synchronous transitions fit reducers.
Side effects and state-driven reactions fit logic and effects.

## Program

Program describes how a business unit is assembled.

## Runtime

Runtime executes assembled programs in a host environment.

It provides:

- lifecycle ownership
- execution environment
- runtime-scoped services

## Summary

Thinking in Logix means:

- define intent with schemas
- keep reactions in logic
- assemble business units as programs
- let Runtime own execution
