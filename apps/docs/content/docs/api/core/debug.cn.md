---
title: Debug
description: 结构化调试事件、sinks 与 DevTools 快照导出能力。
---

Logix Debug 是一套结构化事件管道，用于观测运行时行为：

- 模块生命周期（`module:init` / `module:destroy`）
- Action 派发（`action:dispatch`）
- 状态更新（`state:update`）
- 运行时错误（`lifecycle:error`）
- 诊断提示（`diagnostic`）

在前端日常开发中，你通常通过 DevTools 来查看这些事件；在非 UI 环境（Node 脚本、测试、服务）里，可以通过 Debug layer 把事件路由到你的日志/监控系统。

## 常用入口

- `Debug.layer(...)`：启用内置 sink 预设（dev/prod/off）。
- `Debug.replace(...)` / `Debug.appendSinks(...)`：使用自定义 sinks。
- `Debug.record(event)`：向当前 fiber 的 sinks 发出事件。
- DevTools 快照：
  - `Debug.getDevtoolsSnapshot()` / `Debug.subscribeDevtoolsSnapshot(...)`
  - `Debug.exportEvidencePackage(...)`（导出可序列化的 evidence package，便于分享/回放类工具消费）

## 延伸阅读

- [Guide: 调试与 DevTools](../../guide/advanced/debugging-and-devtools)
- [API: Observability](./observability)
- [/api-reference](/api-reference)
