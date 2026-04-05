---
title: Capabilities And Runtime Control Plane
status: living
version: 2
---

# Capabilities And Runtime Control Plane

## 当前规则

`Program.capabilities` 只承接：

- `services`
- `imports`
- `roots`

治理与验证统一收敛到：

- `Runtime.make(Program)`
- `runtime.*`

验证控制面的第一版主干固定为：

- `runtime.check`
- `runtime.trial`
- `runtime.compare`

它们的边界、默认升级路径和报告契约，以 [09-verification-control-plane.md](./09-verification-control-plane.md) 为准。

硬边界：

- 这些能力属于 `runtime control plane`
- 它们不属于公开 authoring surface
- 它们不反向长出新的业务建模入口

## React facade

React 宿主面的三条正交轴继续保留：

- `RuntimeProvider.layer`
- imports scope
- `Root.resolve`

## 当前一句话结论

`Program.capabilities` 只表达 `services / imports / roots`；治理、验证和比较全部归 `runtime control plane`，并由 `runtime.check / runtime.trial / runtime.compare` 承担第一版主干。
