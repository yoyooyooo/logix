---
title: Module handle extensions
description: Understand when custom handle fields are appropriate and when Actions remain the better protocol.
---

Module handles are the values returned by `useModule(...)` in React and by import resolution inside Logic. They expose standard capabilities such as reads, actions, dispatch, and domain-specific methods added by packages such as Form.

Handle extensions are an advanced package-authoring topic. They are not a replacement for Actions, reducers, services, or selectors.

## Preferred public route

For application code, prefer the normal route:

```ts
const handle = useModule(SomeProgram)
const value = useSelector(handle, someSelector)
await Effect.runPromise(handle.actions.save(payload))
```

If a domain package returns a richer handle, document the added fields as a thin convenience layer over the same Program and Runtime truth.

## When extensions are acceptable

Use a handle extension only when all of these are true:

- the module is a reusable package or domain factory;
- the added method reduces repetitive call-site code;
- the method delegates to actions, dispatch, services, or selectors that remain observable;
- the extension does not own state, a cache, a scheduler, or a separate lifecycle;
- the extension type is documented next to the factory that creates the Program.

## Actions vs commands

| Surface | Use it for |
| --- | --- |
| Action | public business intent, replayable protocol, diagnostics, cross-module coordination |
| command/helper | small convenience wrapper over existing actions, reads, or services |

If users need to know that something happened, make it an Action. If users only need a shorter call site, a helper may be appropriate.

## Anti-patterns

- hiding business writes in a method that does not dispatch an Action;
- storing mutable service instances on state;
- adding methods that require a React-only owner;
- creating a second EventEmitter, cache, or runtime behind the handle;
- documenting internal extension hooks as the normal user route.

## See also

- [Module](../../api/core/module)
- [Program](../../api/core/program)
- [React integration](../essentials/react-integration)
