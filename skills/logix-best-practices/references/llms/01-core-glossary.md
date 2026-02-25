---
title: Logix 核心术语（LLM 版）
---

# Logix 核心术语（LLM 版）

## 1) 基本对象

- `ModuleDef`：模块定义，声明 state/actions 形状与逻辑入口。
- `ModuleImpl`：模块实现，绑定 initial/logics/imports/processes。
- `Logic`：模块内部响应动作/状态变化的 Effect 程序。
- `Process`：跨模块协作逻辑，负责 read/dispatch 协同。
- `Pattern`：可复用逻辑片段，通常是 `(input) => Effect`。
- `Runtime`：执行容器，托管模块实例、事务、诊断与生命周期。

## 2) 关键语义

- `setup/run` 两阶段：
  - `setup` 只做声明/注册。
  - `run` 才做 watcher、flow、service 调用。
- 事务窗口：同步写入阶段，禁止 IO、禁止嵌套 dispatch、禁止 `run*Task`。
- 稳定锚点：`instanceId/txnSeq/opSeq/tickSeq`，用于可解释与回放。

## 3) 协作语义

- `linkDeclarative`：白盒协作，适合可静态表达的 read->dispatch。
- `link`：黑盒桥接，适合 async/external bridge，默认 best-effort。

## 4) 单一事实源

- `Static IR`：可审阅、可对比的静态结构。
- `Dynamic Trace`：运行期证据事件链。
- 约束：两者分层存在，禁止并行真相源。
