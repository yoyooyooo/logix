---
title: Sources
description: 用 field(path).source(...) 把 Query-owned remote facts 接到字段。
---

`field(path).source(...)` 是 Form 的 remote fact lane。

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

resource 由 Query 持有：

```ts
const ProfileResource = Query.Engine.Resource.make({
  id: "profile",
  keySchema: Schema.Struct({ userId: Schema.String }),
  load: ({ userId }) => fetchProfile(userId),
})
```

通过 runtime services/layers 安装 resource 与可选 engine middleware，不要放进 React effects 或 companion functions。

## Inactive keys

`key(...)` 可以返回 `undefined`。这表示当前 dependency state 下 source inactive。

## Submit impact

| 值 | 含义 |
| --- | --- |
| `"block"` | pending/stale source work 可以阻塞 submit。 |
| `"observe"` | source refresh 可被观察，但不阻塞 submit。 |

source failure 可由 `Form.Error.field(path)` 解释，但 final validation truth 仍属于 rules、root/list rules 与 submit decode。

## 不是 options API

Source 不创建 `Form.Source`、`useFieldSource`、公开 refresh hooks 或 options/candidates API。local availability/candidates 用 companion；final truth 用 rules/submit。
