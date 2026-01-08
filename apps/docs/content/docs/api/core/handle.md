---
title: Handle (consumption side)
description: "A unified way to consume dependencies inside `.logic()`: ModuleHandle vs ServiceHandle, plus practical trade-offs."
---

# Handle (consumption side)

A **Handle** is the “usable view” you get when consuming a dependency inside `.logic()`.

The goal is not to force everything into one interface, but to provide a stable vocabulary so you can consistently choose one of two shapes and keep consumption patterns aligned.

In `@logix/core`, this concept lives in the `Logix.Handle` submodule (also available via `@logix/core/Handle`).

## 1) Two kinds of handles (two packaging directions)

### 1.1 ModuleHandle (a handle for a custom Module)

When you model something as a custom Module (the primary shape of packages like `@logix/query` / `@logix/form`):

- In business logic, you call `yield* $.use(OtherModule)` and get a `ModuleHandle`.
- The base capabilities are stable: `read/changes/dispatch/actions`.
- Domain modules typically expose a more ergonomic command surface via handle extensions (e.g. `.controller.*`).

Use it when:

- You want state to live in Logix’s state plane (subscribable, debuggable, replayable, import/link driven).
- You want tight integration with transaction metadata (`txnSeq`, etc.) and the selector/ReadQuery ecosystem.
- You want “external data sources” to become first-class state inside Logix (query snapshots, form snapshots, etc.).

### 1.2 ServiceHandle (a handle for an injectable Service)

When you model something as an injectable service (Tag + Layer):

- In business logic, you call `yield* $.use(ServiceTag)` and get a service instance (treated as a `ServiceHandle` here).
- The source of truth usually lives in an external system/library. Logix primarily **reads/subscribes/dispatches intents** instead of mirroring that state into module state.
- Prefer exposing a `.controller` command surface so consumption aligns with the “controller mental model” of `ModuleHandle`.

Use it when:

- The external system is already the source of truth (router, websocket, native bridge, etc.), and mirroring introduces tearing, permanent subscription cost, or dual truth sources.
- You want “near-zero cost when not consumed” (only start listeners when subscribed).
- You want to inject a third-party instance via Layer for isolation and easy mocking.

## 2) `.controller`: a recommended command surface

Whether it’s a ModuleHandle or a ServiceHandle, a good convention is:

- Put **read/subscribe** APIs on the top level (e.g. `read/getSnapshot/changes`).
- Funnel **write/commands/intents** into `handle.controller.*` (e.g. `refresh()`, `submit()`, `push('/next')`).

This keeps usage mental models stable across domains and makes “intent semantics” easier to diagnose and replay.

## 3) How to choose: Module or Service?

A simple decision tree:

- You want it to become a Logix “state asset” (replayable, import-driven, devtools-explainable) → **make it a Module**.
- You want to treat an external system as the source of truth and keep consumption low-cost and swappable → **make it a Service (Tag + Layer)**.
- You need both → **Module + injectable engine** (Module for the state plane, Engine for external takeover points; see Query’s `Engine.layer(...)` pattern).
