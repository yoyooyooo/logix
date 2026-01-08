---
title: Modules
description: Understand the Module concept in Logix.
---

**Module** is the core building block of Logix. It defines a domain’s **State** and **Actions** in your application.

## Define a module

```typescript
	import * as Logix from '@logixjs/core'
	import { Schema } from 'effect'

	export const CounterDef = Logix.Module.make('Counter', {
	  state: Schema.Struct({
	    count: Schema.Number,
	  }),
	  actions: {
	    increment: Schema.Void,
	    decrement: Schema.Void,
	  },
	})
```

## Implement a module (Module Implementation)

A Module definition only describes the “shape”. To make it runnable, create a “program module” (it contains the `.impl` blueprint). It binds the definition, initial state, and business logic together.

```typescript
// 1) Define Logic (business logic)
const CounterLogic = CounterDef.logic(($) => ...);

// 2) Create a runnable module (program module, with `.impl`)
export const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic]
});

export const CounterImpl = CounterModule.impl
```

`CounterModule` can be consumed directly by React or your application. Its `.impl` (e.g. `CounterImpl`) is the underlying `ModuleImpl` blueprint.

### Declare required dependencies (imports)

In many scenarios, a module implementation comes with dependencies (shared Services, other module implementations, etc.). You can declare them at once via `imports` in `ModuleDef.implement`:

```ts
	import { Layer } from 'effect'
	import { AuthImpl } from '../auth/module.impl'
	import { SessionTag } from '../auth/session'

	export const CounterModule = CounterDef.implement({
	  initial: { count: 0 },
	  logics: [CounterLogic],
	  imports: [
	    // 1) depend on another module implementation
	    AuthImpl,
	    // 2) provide a default Service implementation
	    Layer.succeed(SessionTag, { currentUserId: null }),
	  ],
	})

	export const CounterImpl = CounterModule.impl
```

Key points:

- `imports` accepts:
  - any `Layer` (Service implementations, platform capabilities, etc.)
  - other `ModuleImpl`s (e.g. your module depends on the runtime of an Auth module)
- These dependencies affect **runtime assembly only**:
  - they allow Logic to access the corresponding Service / ModuleRuntime via Tags
  - they do not change the general approach: cross-module collaboration is done via `$.use` (within imports scope) and `Link.make` (cross-module glue logic), and they don’t introduce TypeScript-level circular dependencies
- As a module author, put “default dependencies this module ships with” into `imports`.
  As an assembler (AppRuntime / React), you can still override or inject locally via `module.withLayer(...)` (or `module.impl.withLayer(...)`).

## Use in React

Use the `useModule` hook to consume a module object (or a `ModuleImpl`):

```tsx
import { useModule, useSelector, useDispatch } from '@logixjs/react'

	function CounterComponent() {
	  // Automatically handles dependency injection and lifecycle
	  const counter = useModule(CounterModule)

  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: 'increment' })}>{count}</button>
}
```

## Next

- Learn how to write reactive business logic: [Logic flows](./adding-interactivity)
- State management best practices: [Managing state](./managing-state)
- Module lifecycle: [Lifecycle and watchers](./lifecycle-and-watchers)
