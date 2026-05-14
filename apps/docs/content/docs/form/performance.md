---
title: Performance
description: Keep Form reads precise and large lists stable.
---

Form performance follows the core runtime hot-path rules: precise reads, stable identity, and no unnecessary second systems.

## Read narrowly

Prefer exact field selectors:

```tsx
const name = useSelector(form, fieldValue("name"))
const meta = useSelector(form, rawFormMeta())
```

Avoid broad selectors that force many components to re-render.

## Lists

- Use `identity: { mode: "trackBy", trackBy: "id" }` for reorder-heavy lists.
- Use `byRowId(...)` when a write must survive reorder or remove.
- Read only the list slice or row companion fact you render.

## Sources and companion

- Source handles async remote work and should be keyed by explicit deps.
- Companion must stay synchronous and local.
- Do not fetch inside React render/effects to duplicate the source lane.

## Evidence

Hard performance claims require comparable before/after evidence. Quick runs are diagnostic clues, not release claims.
