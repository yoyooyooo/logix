---
title: Performance
description: 保持 Form 读取精确，大列表 identity 稳定。
---

Form 性能遵循 core runtime hot-path 规则：精确读取、稳定 identity、不引入不必要的第二系统。

## Read narrowly

优先使用 exact field selectors：

```tsx
const name = useSelector(form, fieldValue("name"))
const meta = useSelector(form, rawFormMeta())
```

避免让大量组件 re-render 的宽 selector。

## Lists

- reorder-heavy 列表使用 `identity: { mode: "trackBy", trackBy: "id" }`。
- 写入必须跨 reorder/remove 保持稳定时使用 `byRowId(...)`。
- 只读取实际渲染的 list slice 或 row companion fact。

## Sources and companion

- Source 处理 async remote work，并通过 explicit deps 生成 key。
- Companion 必须保持同步、本地。
- 不要在 React render/effects 里重复 source lane 的 fetch。

## Evidence

硬性能结论需要 comparable before/after evidence。Quick runs 只能当诊断线索，不是 release claims。
