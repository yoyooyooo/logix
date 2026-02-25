---
title: 平台集成手册（CLI / React / Worker / Alignment Lab）
---

# 平台集成手册（CLI / React / Worker / Alignment Lab）

## 1) 宿主无关原则

- Runtime 负责执行语义，宿主负责承载交互与生命周期。
- 组合根只做 imports/processes/layer，不承载业务编排真相源。
- 宿主切换不应改变业务控制律（同输入同语义）。

## 2) CLI 集成

- 用独立入口组装 Runtime 并执行场景。
- 结束时必须释放资源（dispose/close）。
- 错误输出包含诊断码与触发边界，便于回链。

## 3) React 集成

- hooks 运行在 RuntimeProvider 子树内。
- 实例身份由 key/scope 明确，不依赖隐式全局单例。
- selector 订阅优先细粒度，避免不必要重渲染。

## 4) Worker 集成

- worker 是消息驱动入口，不是第二套业务引擎。
- 协议必须可序列化，错误回传保留诊断信息。
- 生命周期（启动/健康检查/释放）应可观测。

## 5) Playground / Sandbox 的正确定位

- Playground 不是“在线跑代码”工具，而是 Runtime Alignment Lab 的交互前端。
- Sandbox Runtime 负责在受控环境执行 Logix/Effect，并输出结构化证据。
- 目标是回答“当前运行行为是否与 Spec/Intent 对齐”。

## 6) Alignment Lab 最小契约

RunResult 至少包含：

- tickSeq 锚定的事件流（Action/State/Service/Lifecycle/Flow）。
- 关键步骤后的状态快照（no-tearing，同次观测只读同 tickSeq）。
- 错误/告警与对应锚点。

Alignment 消费侧至少能：

- 将事件回溯到 IntentRule/LogicGraph。
- 将状态与 Scenario 预期对比并输出差异。
- 形成结构化 Alignment Report。

## 7) 平台侧 DoD

- 不是只给日志：必须有结构化 RunResult。
- 不是只看最终状态：必须能解释中间决策链。
- 不是单宿主偶然可用：跨宿主语义一致。

## 8) 延伸阅读（Skill 内）

- `references/llms/03-flow-process-basics.md`
- `references/llms/04-runtime-transaction-rules.md`
- `references/llms/06-diagnostics-perf-basics.md`
- `references/llms/08-builder-ir-basics.md`
- `references/llms/99-project-anchor-template.md`（可选）
