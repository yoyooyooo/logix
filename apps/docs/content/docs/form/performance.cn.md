---
title: Performance
description: 保持 form 读取窄、list identity 稳定、source work 有 scope。
---

Form performance 遵循与 core modules 相同的 runtime 规则：窄读取、稀疏写入、稳定 identity、有界 diagnostics。

## Values

优先使用 field selectors，不要宽读整个 state。

```tsx
const email = useSelector(form, fieldValue("email"))
```

## Lists

使用稳定 row identity。大型列表优先使用 row-id commands 与 row-scoped selectors。

## Sources

`deps` 保持最小。source inactive 时从 `key` 返回 `undefined`。用户输入变化快时使用 `debounceMs` 与 `concurrency`。

## Companion

Companion `lower` 必须同步且便宜。重型派生应放进 services 或显式 logic。
