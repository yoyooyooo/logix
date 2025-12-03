---
title: "Module-Level Computed & Query: The Perfect Compromise"
status: draft
version: 1.0
layer: Core Concept
related:
  - logix-reactive-schema.md (superseded)
  - logix-query-unified-api-design.md
---

# Module-Level Computed & Query

> **Decision**: Abandoning "Reactive Schema" (Logic inside Schema) in favor of "Co-located Definition" (Logic beside Schema).

## 1. The Problem with Reactive Schema

We attempted to embed logic directly into Schema definitions (`Schema.augment`), but hit the theoretical limits of TypeScript:
1.  **Recursive Type Hell**: Defining a field that depends on the state being defined creates a circular dependency that TS cannot resolve without `any` or complex Two-Pass definitions.
2.  **Runtime/Type Mismatch**: A field defined as `Reactive.async<User>` needs to be typed as `QueryState<User>` in the state, requiring opaque type magic.
3.  **Parser Complexity**: Extracting dependencies from a closure `(s) => [s.id]` is hard for static analysis tools.

## 2. The Solution: Co-located Definition

We move the "Source" definition **out of the Schema** but keep it **inside the Module definition**.

This achieves the "Holy Grail":
- ✅ **Perfect Type Safety**: State is defined *before* Logic, so Logic has full type access to State.
- ✅ **Zero Config**: No `any`, no `ThisType` magic, no generic gymnastics.
- ✅ **Platform Parsability**: `resources` and `computed` are static configuration objects.
- ✅ **High Cohesion**: Logic is still right next to the data it populates.

## 3. API Design & Strict Type Constraints

We leverage TypeScript's mapped types to enforce strict correctness:
1.  **Computed**: Key `K` must exist in State, and return type must match `State[K]`.
2.  **Resources**: Key `K` must be a field defined via `Resource.State<T>`, and the loader must return `T`.

```ts
import { Logix, Schema, Resource } from '@logix/core'

// 1. Define Pure Data Shapes (The "What")
const UserState = Schema.Struct({
  userId: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  // Explicitly mark this as a Resource State container
  profile: Resource.State(UserSchema),
  // Explicitly mark this as a Computed field
  fullName: Schema.String
})

export const UserModule = Logix.Module('User', {
  // 1. Attach Schema
  state: UserState,

  actions: {
    setUserId: Schema.String
  },

  // 2. Define Computed Values (The "Sync How")
  // Type Constraint: { [K in keyof State]?: (state: State) => State[K] }
  computed: {
    // ✅ TS checks: return type string matches Schema.String
    fullName: (state) => `${state.firstName} ${state.lastName}`
  },

  // 3. Define Resources (Async Data Sources)
  // Type Constraint: Only fields where State[K] extends Resource.State<T> are allowed
  resources: {
    profile: {
      // Dependency tracking (Static or Dynamic)
      deps: (state) => [state.userId],

      // Loader function
      // TS infers args from deps, enforces return type Promise<User>
      loader: ([id]) => UserApi.fetchProfile(id),

      // Options
      enabled: (state) => !!state.userId,
      staleTime: 5000
    }
  }
})
```

### Type Definition Strategy

```ts
// Helper to extract keys that are Resource States
type ResourceKeys<S> = {
  [K in keyof S]: S[K] extends Resource.State<any> ? K : never
}[keyof S]

// Helper to extract the Data type T from Resource.State<T>
type ExtractResourceData<T> = T extends Resource.State<infer D> ? D : never

export interface ModuleDef<S, A> {
  state: Schema<S>
  actions: A

  // Strict Computed Config
  computed?: {
    [K in keyof S]?: (state: S) => S[K]
  }

  // Strict Resource Config
  resources?: {
    [K in ResourceKeys<S>]?: {
      deps: (state: S) => any[]
      loader: (deps: any[]) => Promise<ExtractResourceData<S[K]>>
      // ... other options
    }
  }
}
```

## 4. Runtime Integration (Implicit Logic)

`computed` and `resources` are treated as **Metadata** on the Module definition. They do not alter the `ModuleShape`.

When `Module.live` is called:
1.  **Pure State**: The runtime state remains a plain JSON object. No closures or functions are stored in the state tree.
2.  **Implicit Logic Generation**:
    - **Computed**: Converted to a `Stream` watcher: `runtime.changes(selector).map(compute).pipe(updateState)`.
    - **Resources**: Converted to a `Stream` effect: `runtime.changes(deps).pipe(switchMap(loader), updateState)`.
3.  **Co-existence**: These implicit logics run alongside any manual `logics` passed to `Module.live`.

## 5. Trade-offs & Constraints

1.  **Dependency Cycles**:
    - *Issue*: Computed A depends on B, B depends on A.
    - *Solution*: Runtime detection (stack overflow or infinite loop) or linter rules. The spec advises against complex chains in `computed`.
2.  **Manual Overwrites**:
    - *Issue*: User manually dispatches an action to update `state.profile`.
    - *Solution*: This is allowed but discouraged. The `resources` logic will likely overwrite it on the next fetch. We treat these fields as "Runtime Managed".

## 6. Comparison

| Feature | Reactive Schema (Old) | Module Config (New) |
| :--- | :--- | :--- |
| **Type Inference** | 🔴 Broken / Hard | 🟢 Perfect |
| **Definition Style** | Nested (`Schema.augment`) | Flat (`computed: {}`) |
| **State Definition** | Implicit / Magic | Explicit (`Query.State`) |
| **Parser Friendly** | 🟡 Medium | 🟢 High |

## 6. Next Steps

1.  Implement `Query.State` helper in `@logix/core`.
2.  Update `Module` type definition to accept `computed` and `queries` generics.
3.  Implement the runtime logic injection in `ModuleRuntime`.
