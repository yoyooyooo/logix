---
title: Lifecycle and watchers
description: Combine lifecycle hooks, watchers, and host ownership without splitting module truth.
---

Modules in Logix are long-lived runtime objects.
Watchers and lifecycle hooks both follow the instance scope that owns them.

## Lifecycle hooks

Use:

- `onInitRequired`
- `onStart`
- `onDestroy`
- `onError`

to express instance startup, background work, shutdown, and defect handling.

## Watchers

Use watchers to express long-running reactions:

- `$.onAction(...)`
- `$.onState(...)`

They are attached to the same instance lifecycle.
When the instance scope closes, those flows stop with it.

## React mapping

- shared instances resolved through `useModule(ModuleTag)` follow the hosting runtime
- local instances resolved through `useModule(Program, options?)` follow the owning subtree
- advanced local routes such as `useLocalModule(...)` remain component-local

## Notes

- lifecycle hooks describe instance phases
- watchers describe long-running reactions
- platform lifecycle still belongs to platform integration, not to component callbacks

## See also

- [Lifecycle](../essentials/lifecycle)
- [Cross-module communication](./cross-module-communication)
