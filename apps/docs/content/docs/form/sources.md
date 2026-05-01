---
title: Sources
description: Connect remote facts to Form fields with `field(path).source(...)`.
---

`field(path).source(...)` connects Query-owned remote facts to a Form field.
It owns dependency reads, key generation, load scheduling, stale result drops, and submit impact.

Remote data remains owned by the Query resource.
Form consumes the source snapshot and feeds it into the same field, submit, and explanation flow.

## Default route

```ts
$.field("profileResource").source({
  resource: ProfileResource,
  deps: ["profileId"],
  key: (profileId) => (profileId ? { userId: String(profileId) } : undefined),
  triggers: ["onMount", "onKeyChange"],
  concurrency: "switch",
  submitImpact: "block",
})
```

`deps` is the only dependency source.
`key(...)` receives the current values for those deps; returning `undefined` makes the source inactive.

## Define the resource

```ts
const ProfileResource = Query.Engine.Resource.make({
  id: "profile",
  keySchema: Schema.Struct({
    userId: Schema.String,
  }),
  load: ({ userId }) => fetchProfile(userId),
})
```

The `resource` should come from the Query owner.
Do not put remote requests directly inside companion lower functions, rules, or React effects.

## Read the snapshot

The source field is part of form state.

```tsx
const profile = useSelector(form, (s) => s.profileResource)
const explain = useSelector(form, Form.Error.field("profileResource"))
```

Common snapshot states include idle, loading, success, and error.
A source failure can be explained by `Form.Error.field(path)`, but it does not automatically become a canonical validation error leaf.

## `submitImpact`

`submitImpact` decides whether the source lifecycle can block submit.

| Value | Semantics |
| --- | --- |
| `"block"` | pending or stale source work contributes to submit blocking |
| `"observe"` | source refreshes update facts without blocking submit |

Use `"block"` when submit requires fresh remote facts.
Use `"observe"` when the source only affects support UI or candidate lists.

## Row-scoped source

Sources inside list items still attach to field paths.

```ts
$.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
})

$.field("items.profileResource").source({
  resource: ProfileResource,
  deps: ["items.profileId"],
  key: (profileId) => (profileId ? { userId: String(profileId) } : undefined),
  triggers: ["onMount", "onKeyChange"],
  concurrency: "switch",
  submitImpact: "observe",
})
```

The runtime resolves a source per row through row identity.
User code does not need to declare row receipts, task ids, or public owner tokens.

## Scheduling options

| Option | Role |
| --- | --- |
| `triggers` | currently `"onMount"` and `"onKeyChange"` |
| `debounceMs` | delays loading after key changes |
| `concurrency` | `"switch"` means latest key wins; `"exhaust-trailing"` keeps the final trigger while busy |
| `submitImpact` | decides whether pending/stale source work affects submit |

Manual refresh is not the default public route for Form source.
When a user-triggered refresh is required, model refresh in Query or application logic and let Form source observe stable dependencies.

## Boundary

Source is the remote-fact ingress into Form.
It does not own:

- final field validity
- cross-row exclusivity
- local candidate shaping
- React read routes

Final validity stays in field, list, root, or submit rules.
Local candidate shaping belongs in `field(path).companion(...)`.
Reads still go through `useSelector(...)`.

## See also

- [Companion](/docs/form/companion)
- [Selectors and support facts](/docs/form/selectors)
- [Validation](/docs/form/validation)
- [Performance](/docs/form/performance)
