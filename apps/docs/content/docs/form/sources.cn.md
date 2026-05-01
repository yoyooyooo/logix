---
title: Sources
description: 用 `field(path).source(...)` 把远端事实接入 Form 字段。
---

`field(path).source(...)` 用于把 Query owner 的远端事实接入某个 Form 字段。
它负责依赖读取、key 生成、加载调度、过期结果丢弃和 submit 影响。

远端数据仍由 Query resource 拥有。
Form 只消费 source snapshot，并把它纳入同一份 field、submit 和 explanation 流程。

## 默认路线

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

`deps` 是唯一依赖来源。
`key(...)` 接收 deps 对应的当前值；返回 `undefined` 表示当前 source inactive。

## 定义 resource

```ts
const ProfileResource = Query.Engine.Resource.make({
  id: "profile",
  keySchema: Schema.Struct({
    userId: Schema.String,
  }),
  load: ({ userId }) => fetchProfile(userId),
})
```

Form source 的 `resource` 应来自 Query owner。
不要把远端请求直接塞进 companion、rule 或 React 组件 effect 里。

## 读取 snapshot

source 字段本身就是表单 state 的一部分。

```tsx
const profile = useSelector(form, (s) => s.profileResource)
const explain = useSelector(form, Form.Error.field("profileResource"))
```

常见 snapshot 状态包括 idle、loading、success 和 error。
source failure 可以通过 `Form.Error.field(path)` 被解释，但它不会自动变成 canonical validation error leaf。

## `submitImpact`

`submitImpact` 决定 source lifecycle 是否阻塞提交。

| 值 | 语义 |
| --- | --- |
| `"block"` | pending 或 stale source 会进入 submit blocking |
| `"observe"` | source 刷新会更新事实，但不阻塞 submit |

需要“远端事实必须新鲜才能提交”时用 `"block"`。
只影响辅助显示或候选列表时用 `"observe"`。

## Row-scoped source

列表项里的 source 继续挂在字段路径上。

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

runtime 会按 row identity 解析每一行的 source。
用户代码不需要额外声明 row receipt、任务 id 或 public owner token。

## 调度选项

| 选项 | 作用 |
| --- | --- |
| `triggers` | 当前支持 `"onMount"` 和 `"onKeyChange"` |
| `debounceMs` | key 变化后延迟发起加载 |
| `concurrency` | `"switch"` 表示最新 key 获胜；`"exhaust-trailing"` 表示忙碌时保留最后一次触发 |
| `submitImpact` | 决定 pending/stale 是否影响 submit |

手动 refresh 不是当前 Form source 的默认公开路线。
需要用户主动刷新时，优先把刷新建模到 Query 或应用逻辑，再让 Form source 观察稳定的依赖。

## 边界

source 负责远端事实进入 Form。
它不负责：

- 最终字段有效性
- 跨行互斥
- 本地候选整形
- React 读取路线

最终有效性继续写在 field、list、root 或 submit rule 中。
本地候选整形用 `field(path).companion(...)`。
读取继续使用 `useSelector(...)`。

## 延伸阅读

- [Companion](/cn/docs/form/companion)
- [Selectors and support facts](/cn/docs/form/selectors)
- [Validation](/cn/docs/form/validation)
- [Performance](/cn/docs/form/performance)
