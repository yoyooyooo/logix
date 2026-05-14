---
title: API
description: Contract pages for the public Logix packages.
---

Use these pages as public contract notes. For full signatures and exported types, use the generated [API Reference](/api-reference).

## Core

| Page | Export |
| --- | --- |
| [Module](/docs/api/core/module) | `@logixjs/core/Module` and `Logix.Module` |
| [Program](/docs/api/core/program) | `@logixjs/core/Program` and `Logix.Program` |
| [Runtime](/docs/api/core/runtime) | `@logixjs/core/Runtime` and `Logix.Runtime` |
| [Bound API](/docs/api/core/bound-api) | `$` inside `Module.logic` |
| [Handle](/docs/api/core/handle) | module handle read/dispatch view |
| [Match builder](/docs/api/core/match-builder) | fluent matching helper |

## React

| Page | Export |
| --- | --- |
| [RuntimeProvider](/docs/api/react/provider) | `RuntimeProvider` |
| [useModule](/docs/api/react/use-module) | shared and local instance acquisition |
| [useSelector](/docs/api/react/use-selector) | precise reads |
| [useDispatch](/docs/api/react/use-dispatch) | dispatch helper |
| [useImportedModule](/docs/api/react/use-imported-module) | child program handle lookup |

## Domain packages

Form has its own guide under [Form](/docs/form). It still compiles back to the same `Program` and React host law.
