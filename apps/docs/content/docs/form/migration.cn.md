---
title: 迁移指南（traits → rules）
description: 把常规校验从 traits.check 迁移到 rules，并保留 traits 作为高级入口。
---

## 1) 迁移目标

推荐把表单的校验收敛到 `rules`：

- 业务侧默认只写 `derived + rules`
- `traits` 保留但更偏高级能力（computed/source/link 或底层对照）

## 2) 字段校验：`traits.<path>.check` → `rules: z(z.field(...))`

迁移前（traits）：

```ts
traits: Form.traits(Values)({
  name: {
    check: Form.Rule.make({ required: "必填" }),
  },
})
```

迁移后（rules）：

```ts
const $ = Form.from(Values)
const z = $.rules

rules: z(
  z.field("name", { required: "必填" }),
)
```

## 3) 对象级 refine：写回 `$self`，避免覆盖子字段错误

当规则需要跨字段校验一个对象，建议写回 `errors.<path>.$self`：

```ts
rules: z(
  z.field(
    "profile.security",
    {
      deps: ["password", "confirmPassword"],
      validate: (security: any) =>
        security?.password === security?.confirmPassword ? undefined : "两次密码不一致",
    },
    { errorTarget: "$self" },
  ),
)
```

## 4) 列表校验：显式声明 identity + item/list 两个 scope

```ts
rules: z(
  z.list("items", {
    identity: { mode: "trackBy", trackBy: "id" },
    item: {
      deps: ["name", "quantity"],
      validate: (row: any) => (String(row?.name ?? "").trim() ? undefined : { name: "必填" }),
    },
    list: {
      validate: (rows) => ({ $list: Array.isArray(rows) && rows.length > 0 ? undefined : "至少一行" }),
    },
  }),
)
```

## 5) 常见坑

- 忘了写 `deps`：跨字段/跨行依赖不会触发增量校验（看起来像“规则不生效”）。
- 忘了写 list identity：动态数组会降级为不稳定 identity（重排时更容易出现错位）。
- 仍在 `traits` 里写大量 `check`：建议迁移到 `rules`，把 `traits` 留给派生/资源或必要的高级声明。
