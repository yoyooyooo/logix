---
title: Logix 核心术语（LLM 版）
---

# Logix 核心术语（LLM 版）

## 1) 基本对象

- `Module`：definition-time logic authoring owner，通过 `Module.logic(...)` 进入公开主链。
- `Program`：assembly-time business unit，通过 `Program.make(Module, config)` 装配。
- `Runtime`：execution-time container，通过 `Runtime.make(Program)` 运行。
- `Form object`：`Form.make(...)` 的返回值，直接进入 `Logix.Runtime.make(...)` 与 `useModule(...)`，不经 `Program.make(...)`。
- `React host law`：把 `Program` 或 `Form object` 投影到 React 实例与 selector read route。
- `Logic`：模块内部响应动作/状态变化的 Effect 程序。

## 2) 关键语义

- `Module.logic(id, build)` 的 builder 根部只做同步声明。
- builder 的返回值是唯一 run effect。
- 不允许生成 `{ setup, run }`、public phase object 或 public phase carrier 作为公开 API。
- 事务窗口：同步写入阶段，禁止 IO、禁止嵌套 dispatch、禁止 `run*Task`。
- 稳定锚点：`instanceId/txnSeq/opSeq/tickSeq`，用于可解释与回放。
