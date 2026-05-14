---
title: API Reference
description: Hand-written API docs for the current public surface, plus the generated signature index.
---

Use these pages to confirm object roles and canonical usage. Use the generated [API Reference](/api-reference) when you need exact signatures.

## Core

1. [Module](/docs/api/core/module)
2. [Program](/docs/api/core/program)
3. [Runtime](/docs/api/core/runtime)
4. [Bound API ($)](/docs/api/core/bound-api)
5. [Handle](/docs/api/core/handle)
6. [Match builder](/docs/api/core/match-builder)

## React

1. [RuntimeProvider](/docs/api/react/provider)
2. [useModule](/docs/api/react/use-module)
3. [useSelector](/docs/api/react/use-selector)
4. [useDispatch](/docs/api/react/use-dispatch)
5. [useImportedModule](/docs/api/react/use-imported-module)

## Removed from the user docs

The current public React docs do not include `useLocalModule`, `useModuleList`, or `ModuleScope`. Use `useModule(Program, options)` for local/keyed ownership and normal component composition for list mapping.
