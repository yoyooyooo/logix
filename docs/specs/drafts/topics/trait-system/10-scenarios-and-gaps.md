---
title: Trait System · Scenarios & Gaps
status: draft
version: 2025-12-14
value: core
priority: next
related:
  - ../../../../specs/007-unify-trait-system/spec.md
  - ../../../../specs/007-unify-trait-system/review.md
  - ../../../runtime-logix/core/05-runtime-implementation.md
---

# Trait System · Scenarios & Gaps

> 目的：只保留“能帮助我们持续验证 007 主线是否支撑到位”的场景清单。  
> 不在此处发明新架构；所有结论以 007 为准。

## A. Form（高 Trait 密度基准）

- 动态数组（两层嵌套）：插入/删除/重排后，值/错误/交互态按 007 数组语义稳定对齐
- 局部输入：只触发受影响的校验/派生（scoped validate/execute/cleanup），并能在诊断中解释“为什么触发”
- 异步约束：key 失效时同一次可观察更新回到 idle（不出现“key 已空但 data 仍旧”的中间态）

## B. Query（对照组）

- 参数快速连变：旧请求结果不能覆盖新请求；诊断能解释“竞态丢弃原因”
- 缓存复用：同参数重复触发不会反复进入 loading；诊断能解释“复用命中原因”

## C. Link（跨模块派生）

- 本模块字段变化 + 远端模块字段变化：能稳定驱动本模块派生字段更新，且不跨模块写 state
- 回放模式：不触发真实网络；跨模块派生结果可复现

