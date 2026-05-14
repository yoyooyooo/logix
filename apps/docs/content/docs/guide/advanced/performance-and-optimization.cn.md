---
title: 性能与优化
description: Selector precision、transaction cost、diagnostics level 与证据纪律。
---

性能工作从 owner 与测量开始。相比宽 snapshot 和临时 effect，runtime 更容易优化精确读取和稀疏写入。

## 窄读取

```tsx
const name = useSelector(form, fieldValue("name"))
const [name, email] = useSelector(form, fieldValues(["name", "email"]))
```

除非 equality function 能稳定结果，否则不要在 selector 里派生大型对象。

## 明确写入

Reducer 和 logic write 都进入 transaction。优先使用少量清晰 action，不要堆很多组件级 incidental write。

## Diagnostics level

runtime diagnostics 很有价值，但 heavy evidence 不应默认进入 hot path。通过 diagnostics level 与 perf evidence 判断，不靠感觉声明变快。

## Evidence

性能结论需要同 profile、matrix、environment、sampling policy 的 before/after 数据。quick run 适合诊断；release claim 需要项目规定的更强 profile。
