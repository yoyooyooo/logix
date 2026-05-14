---
title: Sources
description: Connect Query-owned remote facts to fields with field(path).source(...).
---

`field(path).source(...)` is the Form lane for remote facts.

```ts
$.field("profileResource").source({
  resource: ProfileResource,
  deps: ["profileId"],
  key: (profileId) => (profileId ? { userId: profileId } : undefined),
  triggers: ["onMount", "onKeyChange"],
  concurrency: "switch",
  submitImpact: "block",
})
```

## Resource owner

The resource is Query-owned:

```ts
const ProfileResource = Query.Engine.Resource.make({
  id: "profile",
  keySchema: Schema.Struct({ userId: Schema.String }),
  load: ({ userId }) => fetchProfile(userId),
})
```

Install the resource and optional engine middleware through runtime services/layers, not through React effects or companion functions.

## Inactive keys

`key(...)` may return `undefined`. That means the source is inactive for the current dependency state.

## Submit impact

| Value | Meaning |
| --- | --- |
| `"block"` | Pending/stale source work can block submit. |
| `"observe"` | Source refresh is visible but does not block submit. |

A source failure can be explained by `Form.Error.field(path)`, but final validation truth still belongs to rules, root/list rules, and submit decode.

## Not an options API

Source does not create `Form.Source`, `useFieldSource`, public refresh hooks, or an options/candidates API. Use companion for local availability/candidates, and rules/submit for final truth.
