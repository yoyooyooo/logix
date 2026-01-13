---
title: API Reference
description: Reference for the Logix core APIs.
---

This section contains detailed documentation for Logix runtime core APIs.

If you want a complete, drift-free “dictionary” of exports and signatures, use the **auto-generated API Reference**:

- [/api-reference](/api-reference)

## Contents

- [**Runtime and ManagedRuntime**](/docs/api/core/runtime): how to build an app-level Runtime and run Logix in different host environments.
- [**Bound API ($)**](/docs/api/core/bound-api): the `$` object you use inside Logic to read/write state, dispatch actions, watch signals, and manage lifecycle.
- [**Module definition and implementation**](/docs/api/core/module): how to define a Module’s Shape (Schema), create instances, and assemble `ModuleImpl`.
- [**Flow API**](/docs/api/core/flow): low-level Fluent Flow APIs, matching `$.onAction / $.onState / $.on` one-to-one.
- [**React integration**](/docs/api/react/provider): using Logix in React via `RuntimeProvider` / `useModule` / `useSelector` / `useDispatch`.

## Type conventions

You will frequently see the following type parameters in the API docs:

- `Sh` (Shape): the Module shape, including State and Action schemas.
- `R` (Requirements): the required dependency environment (Services) for running Logic.
- `E` (Error): the error type a program may fail with.
