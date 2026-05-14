---
title: Canonical spine
description: The object roles that stay stable across core, React, and domain packages.
---

The Logix public route is a small spine. Keep these roles separate and most API decisions become mechanical.

## Objects

| Object | Role | Typical owner |
| --- | --- | --- |
| `Module` | Definition-time state and action contract. | package or feature file |
| `Module.logic` | Logic authoring bound to one module. | feature logic file |
| `Program` | Assembly-time business unit. | app, route, domain factory |
| `Runtime` | Execution container and control plane. | app shell, test, CLI |
| `RuntimeProvider` | React projection of a runtime. | React root or subtree |
| `useModule` | Instance acquisition. | component boundary |
| `useSelector` | Narrow state/read projection. | component read site |

## Default application shape

```text
feature.ts
  Module.make(...)
  Module.logic(...)
  Program.make(...)

runtime.ts
  Runtime.make(Program, { layer, devtools, middleware })

view.tsx
  <RuntimeProvider runtime={runtime}>
  const feature = useModule(Feature.tag)
  const value = useSelector(feature, fieldValue("value"))
```

`Program` is the reusable unit. A root application can import child programs through `Program.capabilities.imports`. React can instantiate a program locally with `useModule(Program, { key })` when the instance should be owned by a component or route.

## Boundary rules

- `Module` defines shape; it does not run the app.
- `Program` assembles declarations, initial state, imports, and services.
- `Runtime` executes and reports; it is not an authoring surface.
- React reads through selector descriptors or selector functions; whole-state no-arg reads are not part of the public route.
- Domain packages such as Form compile back into the same `Program` and React host law.

## See also

- [Modules and state](/docs/guide/essentials/modules-and-state)
- [React integration](/docs/guide/essentials/react-integration)
- [Program API](/docs/api/core/program)
