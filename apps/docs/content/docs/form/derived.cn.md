---
title: Derived values
description: 派生 form state 应放在哪条 lane。
---

Form 派生值分三条 lane。

| Lane | 用途 |
| --- | --- |
| React selector | 便宜的 view-only derivation。 |
| Companion | availability、candidates 这类 local soft facts。 |
| Rule/source/Form state | 影响 validation、submit 或 persistence 的 business truth。 |

## View-only derivation

```tsx
const displayName = useSelector(form, (state) => `${state.firstName} ${state.lastName}`.trim())
```

## Companion derivation

当派生值需要复用、row-scoped 或作为领域 fact 消费时，用 companion。

## 边界

不要把每个派生 UI 值都存进 form state。存 durable truth；presentation 在 read edge 派生。
