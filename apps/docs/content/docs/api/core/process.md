---
title: Process
description: Structured background programs with triggers, concurrency/error policy, and a runtime-managed lifecycle.
---

A **Process** is a long-running program (an `Effect`) with attached metadata so the Runtime can install and manage it in a structured way.

You can use processes for:

- boot-time background work (refresh, warm-up, subscriptions),
- “outside-module” orchestration that shouldn’t live in a single module,
- cross-module collaboration (Links are processes under the hood).

## `Process.make(definition, effect)`

```ts
import * as Logix from '@logixjs/core'
import { Effect } from 'effect'

const BootRefresh = Logix.Process.make('boot:refresh', Effect.void)
```

`definition` can be:

- a string processId (quick form), or
- an object with `processId`, `triggers`, `concurrency`, `errorPolicy`, etc.

When you pass only a string id, defaults apply (triggered on `runtime:boot`, `concurrency: latest`, `errorPolicy: failStop`, `diagnosticsLevel: off`).

## Installing processes

Common patterns:

- attach processes on a Root `ModuleImpl` (app-level runtime processes),
- in React, install a stable process list via `useProcesses` for a UI subtree boundary.

## See also

- [Guide: Cross-module communication](../../guide/learn/cross-module-communication)
- [API: Link](./link)
- [API: useProcesses](../react/use-processes)
- [/api-reference](/api-reference)
