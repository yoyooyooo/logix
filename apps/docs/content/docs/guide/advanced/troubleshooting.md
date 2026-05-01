---
title: Troubleshooting
description: Logix diagnostic codes explained, with common failure scenarios and fixes.
---

Use diagnostic codes as the primary locator when Logix emits a warning or error. The table below maps the most common codes to their runtime meaning and the shortest repair direction.

## Diagnostic code cheat sheet

| Code                           | Severity | Meaning                 | Fix direction                |
| ------------------------------ | -------- | ----------------------- | ---------------------------- |
| `logic::invalid_phase`         | error    | API used in wrong phase | move the call into the correct phase |
| `logic::env_service_not_found` | warning  | Env service not ready (common startup noise) | check Layer provisioning order |
| `assembly::missing_module_runtime` | error | missing imports/scope for a child module | provide `imports` or a root singleton |
| `reducer::late_registration`   | warning  | Reducer registered late | move `$.reducer` into setup            |
| `state_transaction::dirty_all_fallback` | warning | missing field-level dirty evidence | prefer `$.state.mutate` / `immerReducers` / `ModuleTag.Reducer.mutate` |
| `state_transaction::async_escape` | error | async/await escaped txn window | no IO/await inside a synchronous transaction; use `run*Task` or split entries |
| `state_transaction::enqueue_in_transaction` | error | dispatch/setState inside txn window | move dispatch outside the transaction window; use a multi-entry pattern |
| `logic::invalid_usage`         | error    | `run*Task` called inside txn window | call `run*Task` from watcher run section, not inside reducers/update/mutate bodies |
| `runtime.hot-lifecycle`        | evidence | development runtime reset/dispose occurred | inspect owner id, previous/next runtime id, cleanup status, and residual active count |

---

## Common failure scenarios

### 0. Active demo stops after a source edit

**Symptom**: a timer, task runner, watcher, or form demo stops responding after development HMR and works again after a full refresh.

**Evidence event**: `runtime.hot-lifecycle`

**Cause**: the runtime was created outside a single hot lifecycle owner, or stale runtime-owned resources survived a module replacement.

**Fix direction**:

- create the runtime at an app/example boundary that owns replacement;
- enable `logixReactDevLifecycle()` in Vite or `installLogixDevLifecycleForVitest()` in test setup once at the host boundary;
- let that owner apply `reset` when a successor runtime exists;
- let that owner apply `dispose` when no successor exists;
- keep `RuntimeProvider` as projection-only;
- avoid per-component HMR cleanup snippets.

### 1. LogicPhaseError: calling `$.lifecycle.*` in run phase

**Symptom**:

```
[LogicPhaseError] $.lifecycle.onInit is not allowed in run phase (kind=lifecycle_in_run).
```

**Diagnostic code**: `logic::invalid_phase`

**Cause**: lifecycle registration APIs like `$.lifecycle.onInit` / `$.lifecycle.onDestroy` are declaration-only. They must be called in the synchronous declaration part of the Logic builder (before `return`), not inside `Effect.gen`.

**Incorrect**:

```ts
const Logic = Module.logic(($) =>
  Effect.gen(function* () {
    // ❌ This is run phase: lifecycle registration is not allowed here
    $.lifecycle.onInitRequired(Effect.log('init'))

    yield* $.onAction('foo').run(/* ... */)
  }),
)
```

**Correct**:

```ts
const Logic = Module.logic(($) => {
  // ✅ declaration part: before return
  $.lifecycle.onInitRequired(Effect.log('init'))

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

**Cause**: Logic tries to access a child Program via `$.imports.get(Child.tag)`, but the child Program was not provided in `Program.make(..., { capabilities: { imports } })`.

**Incorrect**:

```ts
const HostProgram = Logix.Program.make(HostDef, {
  initial: {
    /* ... */
  },
  logics: [HostLogic],
  // ❌ Missing imports
})
```

**Correct**:

```ts
const HostProgram = Logix.Program.make(HostDef, {
  initial: {
    /* ... */
  },
  logics: [HostLogic],
  capabilities: {
    imports: [ChildProgram], // ✅ Provide the child program
  },
})
```

```ts
const HostLogic = HostDef.logic(($) =>
  Effect.gen(function* () {
    const child = yield* $.imports.get(Child.tag)
    const value = yield* child.read((s) => s.value)
    // ...
  }),
)
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

### 5. Declaring fields in run phase

**Symptom**:

```
[LogicPhaseError] $.fields.declare is not allowed in run phase (kind=fields_declare_in_run).
```

**Diagnostic code**: `logic::invalid_phase`

**Cause**: `$.fields(...)` is declaration-only. Field declarations are frozen after the declaration phase.

**Correct**:

```ts
const Logic = Module.logic(($) => {
  // ✅ Declare fields in the synchronous declaration part
  $.fields({
    /* ... */
  })

  return Effect.void
})
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
  hint: 'Do not register $.lifecycle.* in run phase. Move lifecycle registration into the synchronous declaration part of the Module.logic builder (before return).',
  kind: 'lifecycle_in_run'
}
```

- `code`: diagnostic code (use the cheat sheet to locate)
- `severity`: `error` / `warning` / `info`
- `hint`: fix suggestion

---

## See also

- Error-handling strategy: [Error handling](./error-handling)
- Testing guide: [Testing](./testing)
