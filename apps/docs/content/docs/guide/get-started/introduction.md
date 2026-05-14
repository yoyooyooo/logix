---
title: Introduction
description: The minimal model for using Logix in a React application.
---

Logix moves application logic into an Effect-native runtime. UI components stop owning long-running workflows, dependency injection, retries, and runtime diagnostics. They acquire a module instance, read a narrow slice, and dispatch actions.

## Runtime shape

```text
Module       state schema, action schema, reducers, logic builder
Logic        Effect program bound to one module
Program      assembled module plus initial state, logics, imports, services
Runtime      execution container and control plane
React host   provider, instance acquisition, selectors, dispatch
```

A Logix app normally has one root `Program`. React mounts a `Runtime` for that program. Components use module tags or programs to acquire instances.

## First decision

Use Logix when logic has durable state, effects, dependency injection, concurrency, or diagnostics that should not live inside React components. Keep plain React state for local UI affordances such as open/closed toggles, input focus, and uncontrolled layout state.

## Next

Read [Quick Start](/docs/guide/get-started/quick-start), then [Canonical spine](/docs/guide/essentials/canonical-spine).
