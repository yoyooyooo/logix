---
title: Layered Map
status: living
version: 2
---

# Layered Map

## 目标

给当前 AI Native runtime-first 主线定义一份最小分层图。

## 当前总分层

```text
surface / domain kit / react-facing authoring
  -> authoring kernel
    -> field-kernel
      -> runtime core

runtime control plane
  -> runtime assembly / override / trial / replay / evidence

UI projection
  -> RuntimeProvider / subtree override / imports scope / root escape hatch
```

## 当前规则

- 分层的作用，是减少耦合、压缩公开面、稳定诊断与性能边界
- 分层不是为了证明“平台必须存在”
- 所有 surface、domain kit、React facade 都必须降到同一个 authoring kernel 与 runtime core
- `runtime control plane` 只负责装配、治理、验证与证据，不反向长出第二套 authoring surface
- `UI projection` 只表达 React 宿主语义，不承载新的运行时真相源
- 若某一层不能直接改善 Agent authoring、runtime clarity、performance 或 diagnostics，默认不提升它的存在感

## 当前一句话结论

当前分层只服务于 AI Native runtime-first 主线；任何层级若只是为了平台叙事存在，默认删除或后置。
