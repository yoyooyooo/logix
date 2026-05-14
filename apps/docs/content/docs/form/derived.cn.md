---
title: Derived values
description: 把 derivation 保持在 selectors、submit decode、rules 或 runtime logic 中。
---

Form 不公开单独的 `derived` family。

按 owner 选择路线：

| 需求 | 路线 |
| --- | --- |
| view-only derivation | `useSelector(form, selector)` |
| typed payload derivation | `submit({ decode })` |
| final validation derivation | `Form.Rule.make(...)` |
| local UX support fact | `field(path).companion(...)` |
| remote fact | `field(path).source(...)` |

```tsx
const canSubmit = useSelector(
  form,
  (state) => state.$form.errorCount === 0 && !state.$form.isSubmitting,
)
```

不要添加 Form-specific derived hook 或公开 derived namespace，除非它能机械降解到现有 owners 且不创建第二条 read law。
