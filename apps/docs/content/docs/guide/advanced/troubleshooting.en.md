---
title: Troubleshooting
description: Logix diagnostic codes explained, with common failure scenarios and fixes.
---

# Troubleshooting

This page collects diagnostic codes emitted by the Logix Runtime, common failure scenarios, and how to fix them.

### Who is this for?

- You hit Logix errors/warnings and want to quickly find the root cause.
- You see `diagnostic` events in DevTools and want to understand what they mean.

### Prerequisites

- You’ve read “Modules & State” and “Flows & Effects” and understand the basic Module/Logic structure.

### What you’ll get

- Quickly locate root causes based on diagnostic codes.
- Fix the most common setup/run phase mistakes.

---

## Diagnostic code cheat sheet

| Code                           | Severity | Meaning                 | Fix direction                |
| ------------------------------ | -------- | ----------------------- | ---------------------------- |
| `logic::invalid_phase`         | error    | API used in wrong phase | move the call into the correct phase |
| `logic::env_service_not_found` | warning  | Env service not ready   | check Layer provisioning order        |
| `reducer::late_registration`   | warning  | Reducer registered late | move `$.reducer` into setup            |
| `state::mutation_outside_txn`  | error    | State mutated outside txn | update state inside Flow handlers     |
| `source::fetch_failed`         | warning  | Async resource load failed | check network/Service implementation  |

---

## Common failure scenarios

### 1. LogicPhaseError: calling `$.lifecycle.*` in run phase

**Symptom**:

```
[LogicPhaseError] $.lifecycle.onInit is not allowed in run phase (kind=lifecycle_in_run).
```

**Diagnostic code**: `logic::invalid_phase`

**Cause**: lifecycle registration APIs like `$.lifecycle.onInit` / `$.lifecycle.onDestroy` are **setup-only**. They must be called in the setup phase of the Logic builder (before `return`), not inside `Effect.gen`.

**Incorrect**:

```ts
const Logic = Module.logic(($) =>
  Effect.gen(function* () {
    // ❌ This is run phase: lifecycle registration is not allowed here
    $.lifecycle.onInit(Effect.log('init'))

    yield* $.onAction('foo').run(/* ... */)
  }),
)
```

**Correct**:

```ts
const Logic = Module.logic(($) => {
  // ✅ Setup phase: before return
  $.lifecycle.onInit(Effect.log('init'))

  return Effect.gen(function* () {
    // Run phase: write watchers as usual
    yield* $.onAction('foo').run(/* ... */)
  })
})
```

---

### 2. LogicPhaseError: calling `$.use` in setup phase

**Symptom**:

```
[LogicPhaseError] $.use is not allowed in setup phase (kind=use_in_setup).
```

**Diagnostic code**: `logic::invalid_phase`

**Cause**: `$.use(Service)` reads dependencies from the runtime environment, so it can only be called in run phase (inside `Effect.gen`).

**Incorrect**:

```ts
const Logic = Module.logic(($) => {
  // ❌ Setup phase can't access Env
  const api = $.use(ApiService)

  return Effect.gen(function* () {
    /* ... */
  })
})
```

**Correct**:

```ts
const Logic = Module.logic(($) =>
  Effect.gen(function* () {
    // ✅ Run phase: yield* $.use is allowed
    const api = yield* $.use(ApiService)
    // ...
  }),
)
```

---

### 3. MissingModuleRuntimeError: missing imports

**Symptom**:

```
MissingModuleRuntimeError: Module 'Child' is not available in imports.
```

**Cause**: Logic tries to access a child module via `$.use(ChildModule)`, but the module was not provided in `imports` when calling `implement`.

**Incorrect**:

```ts
const HostModule = HostDef.implement({
  initial: {
    /* ... */
  },
  logics: [HostLogic],
  // ❌ Missing imports
})
```

**Correct**:

```ts
const HostModule = HostDef.implement({
  initial: {
    /* ... */
  },
  logics: [HostLogic],
  imports: [ChildImpl], // ✅ Provide the child module implementation
})
```

---

### 4. Reducer registered too late

**Symptoms**:

- After dispatching an Action, the primary reducer did not run.
- DevTools shows a `reducer::late_registration` warning.

**Diagnostic code**: `reducer::late_registration`

**Cause**: `$.reducer(tag, fn)` must be called in setup phase; reducers registered in run phase are not executed by the Runtime.

**Incorrect**:

```ts
const Logic = Module.logic(($) =>
  Effect.gen(function* () {
    // ❌ Registering reducers in run phase won't work
    $.reducer('increment', (s) => ({ ...s, count: s.count + 1 }))
  }),
)
```

**Correct**:

```ts
const Logic = Module.logic(($) => {
  // ✅ Register reducers in setup phase
  $.reducer('increment', (s) => ({ ...s, count: s.count + 1 }))

  return Effect.gen(function* () {
    /* ... */
  })
})
```

> Recommended: put the primary reducer directly in the `reducers` field of `Logix.Module.make`.

---

### 5. Declaring traits in run phase

**Symptom**:

```
[LogicPhaseError] $.traits.declare is not allowed in run phase (kind=traits_declare_in_run).
```

**Diagnostic code**: `logic::invalid_phase`

**Cause**: `$.traits.declare(...)` is setup-only. Traits are frozen after setup ends.

**Correct**:

```ts
const Logic = Module.logic(($) => ({
  setup: Effect.sync(() => {
    // ✅ Declare traits in setup phase
    $.traits.declare({
      /* ... */
    })
  }),
  run: Effect.void,
}))
```

---

### 6. “Service not found” noise during init

**Symptoms**:

- You see `Service not found: ...` warnings at app startup.
- Everything works fine afterwards.

**Diagnostic code**: `logic::env_service_not_found`

**Cause**: during init, Logic attempts to access an Env service that is not fully provisioned yet. Under certain initialization orders, this can be a known one-time noise.

**What to do**:

- If it happens only once on startup and the app works afterwards, you can ignore it.
- If it keeps happening, verify `Runtime.make` / `RuntimeProvider.layer` correctly provides the service.

---

## DevTools diagnostic events

When DevTools is enabled (`devtools: true`), all diagnostic events appear in the timeline with type `diagnostic`.

Typical event shape:

```ts
{
  type: 'diagnostic',
  moduleId: 'Counter',
  code: 'logic::invalid_phase',
  severity: 'error',
  message: '$.lifecycle.onInit is not allowed in run phase.',
  hint: 'Do not register $.lifecycle.* in run phase (setup-only). Move lifecycle registration into the synchronous part of the Module.logic builder (before return).',
  kind: 'lifecycle_in_run'
}
```

- `code`: diagnostic code (use the cheat sheet to locate)
- `severity`: `error` / `warning` / `info`
- `hint`: fix suggestion

---

## Next

- Learn to observe module behavior with DevTools: [Debugging and Devtools](./debugging-and-devtools)
- Error-handling strategy: [Error handling](./error-handling)
- Testing guide: [Testing](./testing)
