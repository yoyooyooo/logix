---
title: Pagination
description: Model page or cursor state as runtime state, not component-local bookkeeping.
---

Pagination has durable behavior: current page, query key, loading window, and stale response handling. Put those in a module when they affect business behavior.

## Page state

```ts
state: Schema.Struct({
  q: Schema.String,
  page: Schema.Number,
  pageSize: Schema.Number,
  total: Schema.Number,
  rows: Schema.Array(Row),
  loading: Schema.Boolean,
})
```

Use cursor fields instead of `page` when the backend is cursor-based.

## Transitions

- `queryChanged` resets `page` to `1`.
- `pageChanged` keeps the current query.
- `pageSizeChanged` usually resets the cursor/page.
- request completion writes rows only if it still matches the active key.

## React

Components dispatch page intents and read page state. They do not own request cancellation.
