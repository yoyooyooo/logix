---
title: Performance
description: Keep form reads narrow, list identity stable, and source work scoped.
---

Form performance follows the same runtime rules as core modules: narrow reads, sparse writes, stable identity, and bounded diagnostics.

## Values

Prefer field selectors over broad state reads.

```tsx
const email = useSelector(form, fieldValue("email"))
```

## Lists

Use stable row identity. Prefer row-id commands and row-scoped selectors for large lists.

## Sources

Keep `deps` minimal. Return `undefined` from `key` while a source is inactive. Use `debounceMs` and `concurrency` where user input can change quickly.

## Companion

Companion `lower` functions must stay synchronous and cheap. Heavy derivation belongs in services or explicit logic.
