---
title: Search + detail
description: Keep search state, selection, and detail fetches in the runtime.
---

Search/detail screens split naturally into three state atoms: query parameters, result rows, and selected identity.

## State

```ts
state: Schema.Struct({
  q: Schema.String,
  page: Schema.Number,
  selectedId: Schema.NullOr(Schema.String),
  rows: Schema.Array(Row),
  detail: Schema.NullOr(Detail),
})
```

`selectedId` is the stable authority. Do not use array index as detail identity.

## Actions

```ts
actions: {
  queryChanged: Schema.String,
  pageChanged: Schema.Number,
  rowSelected: Schema.NullOr(Schema.String),
}
```

Changing query normally resets page and selection. Selecting a row should not rewrite the list.

## Runtime work

Use `runLatest` for query and detail fetches. The newest query wins; stale responses should not write back over newer state.

## React reads

```tsx
const [q, page, selectedId] = useSelector(browser, fieldValues(["q", "page", "selectedId"]))
const rows = useSelector(browser, fieldValue("rows"))
const detail = useSelector(browser, fieldValue("detail"))
```

Group fields only when the UI consumes them together.
