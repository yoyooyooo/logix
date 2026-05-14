---
title: 实例
description: 在不引入第二条 host route 的前提下选择 shared、local 与 keyed Form instances。
---

`Form.make(...)` 返回 Program-compatible 的 form definition。实例 ownership 由 Runtime 与 React 决定。

## Shared route

如果 runtime root 就是 form Program，通过 tag 读取托管实例：

```ts
const runtime = Logix.Runtime.make(ContactForm)
```

```tsx
const form = useModule(ContactForm.tag)
```

## Local/keyed route

如果路由或组件需要自己的 form instance，把 Program 传给 `useModule`：

```tsx
const form = useModule(ContactForm, { key: `contact:${contactId}` })
```

用 `gcTime` 在卸载后短暂保留实例：

```tsx
const form = useModule(ContactForm, {
  key: `contact:${contactId}`,
  gcTime: 60_000,
})
```

## 不要添加另一套 hook family

不要把 `useForm`、`useField`、`useFieldArray` 或任何 Form-owned instance hook 重新抬成 canonical route。实例获取是 `useModule(...)`；读取是 `useSelector(...)`；写入是 Form handle。
