---
title: Introduction
description: Welcome to Logix — an Effect-native runtime for frontend state and business logic.
---

Welcome to Logix.

Logix is an **Effect-native runtime for state and business logic** designed for modern frontend applications. It integrates deeply with the **Effect** ecosystem and is built to solve the hard parts of real-world business logic: **async orchestration**, **state linkage**, and **type safety**.

## Do these situations hurt?

> [!TIP]
> If any of these resonate with you, Logix might be what you need.

1. **useEffect race-condition hell**: you switch tabs quickly, response A overwrites response B, and the UI flickers.
2. **State sync nightmare**: state is passed across components via prop drilling; one Context change causes a full re-render.
3. **Scattered async logic**: cancellation, retries, and loading states live everywhere; bugs never stop.
4. **Form linkage debugging**: field A changes → B validates → C becomes disabled… where did the chain break? DevTools can’t tell you.

### Who is this for?

- You have React / Vue / frontend engineering experience and want something better than `useState + useEffect` for complex business logic.
- You’re new to Effect / functional programming and don’t want to be overwhelmed by new terminology on day one.

### Prerequisites

- Basic TypeScript experience
- Familiarity with core frontend concepts: components, state, event handling

### What you’ll get

- A clear sense of what Logix is built to solve, and how it differs from Redux / MobX.
- An intuitive picture of “Module / Logic / Runtime / Bound API `$`”.
- A concrete next-step learning path (what to read and which examples to run).

## Why Logix?

### 1. Intent-first

UI components focus on rendering and dispatching intent (Actions), instead of embedding complex business logic.

### 2. Reactive flows

Use declarative Flow APIs to handle async races, debouncing, throttling, and state linkage—without the `useEffect` waterfall.

### 3. Type-safe

With strong typing based on `effect/Schema`, you get great autocomplete and type checking from API to UI.

### 4. Modular

Encapsulate business logic in independent Modules that are easy to test, reuse, and maintain.

## Next: where to start

If you want to **get a demo running as quickly as possible**, read in this order:

1. [Quick Start: Your first app](../get-started/quick-start) — a counter app in under 30 minutes.
2. [Tutorial: Your first Logix form](../get-started/tutorial-first-app) — field linkage and async validation.
3. [Modules & State](../essentials/modules-and-state) — a systematic model of Module / State / Action.

If you’re interested in the “why” behind the design, continue after the three steps above:

- [Thinking in Logix](../essentials/thinking-in-logix)
- [Flows & Effects](../essentials/flows-and-effects)
- [Effect basics: learn the 20% you need](../essentials/effect-basics)
