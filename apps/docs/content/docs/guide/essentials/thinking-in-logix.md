---
title: Thinking in Logix
description: Think in declarations, assembled programs, runtime ownership, and evidence.
---

Logix is easiest to understand as the logic half beside React.

React owns UI and render. Logix owns declarations, composition, execution, state transactions, diagnostics, and evidence.

## The main habit

Do not start by asking “which hook should I write?” Start by placing the fact in the right owner:

| Fact or behavior | Owner |
| --- | --- |
| module state and actions | `Module.make(...)` |
| behavior over actions/state | `Module.logic(id, ...)` |
| services/imports/initial state | `Program.make(...)` |
| runtime execution | `Runtime.make(...)` |
| React reads | `useSelector(handle, selector)` |
| React acquisition | `useModule(...)` |
| editable input semantics | `Form.make(...)` |
| verification report | `Runtime.check/trial/compare` |

## One model, not many small frameworks

Domain packages should reduce to the same spine. Form is a Program. Query resources are services/resources. React is the host projection. Devtools and CLI consume runtime truth; they do not define it.

## What to avoid

- A second React hook family for every domain package.
- A second state truth in UI cache or logs.
- A second runtime/control-plane object just for diagnostics.
- Compatibility routes that keep old mental models alive.

## Next

- [Canonical spine](./canonical-spine)
- [Modules & State](./modules-and-state)
- [React integration](./react-integration)
