---
title: Thinking in Logix
description: 用 declarations、assembled programs、runtime ownership 与 evidence 来思考。
---

把 Logix 理解成 React 旁边的逻辑半边最容易。

React 持有 UI 与 render。Logix 持有 declarations、composition、execution、state transactions、diagnostics 与 evidence。

## 主习惯

不要先问“我该写哪个 hook？”先判断事实应该归哪个 owner：

| 事实或行为 | Owner |
| --- | --- |
| module state and actions | `Module.make(...)` |
| actions/state 上的行为 | `Module.logic(id, ...)` |
| services/imports/initial state | `Program.make(...)` |
| runtime execution | `Runtime.make(...)` |
| React reads | `useSelector(handle, selector)` |
| React acquisition | `useModule(...)` |
| editable input semantics | `Form.make(...)` |
| verification report | `Runtime.check/trial/compare` |

## 一个模型，不是很多小框架

领域包必须能降到同一条主链。Form 是 Program。Query resources 是 services/resources。React 是 host projection。Devtools 与 CLI 消费 runtime truth；它们不定义 runtime truth。

## 避免什么

- 为每个领域包创建第二套 React hook family。
- 在 UI cache 或 logs 里制造第二套 state truth。
- 为 diagnostics 创建第二套 runtime/control-plane object。
- 保留旧心智模型的 compatibility routes。

## 下一步

- [Canonical spine](./canonical-spine)
- [Modules & State](./modules-and-state)
- [React 集成](./react-integration)
