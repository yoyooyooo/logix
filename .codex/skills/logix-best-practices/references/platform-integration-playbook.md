---
title: 平台集成手册（CLI / React / Worker）
---

# 平台集成手册（CLI / React / Worker）

## 1) 宿主无关原则

- Runtime 负责执行与组合，不感知业务 UI/交互细节。
- 组合根只做 imports/processes/layer，不堆业务流程。
- 业务能力通过模块与 process 暴露，不绕过 runtime 私有通道。

## 2) CLI 集成

- 用独立入口装配 Runtime 并执行场景。
- 程序结束前必须释放资源（dispose/close）。
- 错误输出保留可追踪上下文（触发源 + 诊断码）。

## 3) React 集成

- hooks 必须运行在 RuntimeProvider 子树内。
- 实例身份由 key/scope 明确，不依赖隐式全局单例。
- 多 selector 场景优先细粒度订阅与稳定 equality 策略。

## 4) Worker 集成

- worker 仅承载消息驱动入口，不内嵌业务编排真相源。
- 消息协议保持可序列化，错误回传保留诊断信息。
- 生命周期与主线程一致：启动、健康检查、释放资源可观测。

## 5) 集成验收

- 宿主切换不改变业务控制律语义。
- 跨宿主仍可输出统一诊断与 trace 结构。
- 发生故障时可回链到模块/process/事务边界，而不是只看到宿主错误。
