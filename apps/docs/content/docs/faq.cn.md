---
title: FAQ
description: 当前 Module → Program → Runtime 模型下的常见问题。
---

## Logix 和 Redux / Zustand 有什么区别？

Redux 和 Zustand 主要是状态容器。异步、依赖注入、诊断和验证可以围绕它们搭出来，但通常依赖项目约定。

Logix 把模块视为可执行单元：状态、逻辑、服务、ready gate、诊断和验证都收敛到同一条 Program 与 Runtime 边界。

```text
Module.logic(...)  声明可运行逻辑
Program.make(...)  装配业务单元
Runtime.make(...)  持有执行、服务、生命周期和证据
```

React 继续负责 UI。Logix 负责逻辑半边。

## Logix 和 XState 有什么区别？

XState 适合问题本身就是有限状态机的场景。

Logix 更适合应用逻辑：数据状态、异步任务、服务依赖、运行时生命周期和精确 React 读取。你仍然可以在 logic 内表达类似状态机的分支，但公开模型不是一张 machine chart。

## Logix 和 TanStack Query 有什么区别？

TanStack Query 持有 server-state cache 和请求协调。

Logix 持有可执行应用逻辑。Query 风格资源可以通过 source/resource 边界参与进来，但 Logix 不是 query cache。真实应用可以同时使用两者：Query 管远程数据行为，Logix 管模块执行和跨功能逻辑。

## 第一件事应该记住什么？

先记住这条主链：

```text
Module.logic -> Program.make -> Runtime.make -> RuntimeProvider -> useModule -> useSelector
```

本站大多数页面都在展开这条链上的某一段。如果一个 helper 不能机械还原到这条链，它应当被看成应用本地代码或 toolkit sugar，而不是第二套模型。

## traits 和 FieldKernel 去哪里了？

它们不再是当前用户文档的正面概念。

字段声明仍然可以出现在 `Module.logic(($) => { ... })` 或 Form 这类领域 DSL 中，但字段编译器和运行时机制退到 `Program.make(...)` 与 `Runtime.make(...)` 后面。用户文档解释行为和 owner 边界，不再把内部 trait 系统当主叙事。

## 为什么需要 `Program.make(...)`？

Module definition 是可复用定义。Program 是已经装配好的业务单元。

`Program.make(...)` 选择初始状态、导入子 program、安装 logic 声明，并生成 runtime 可以执行的单元。把装配固定在这里，可以避免 React、Form、Query 和 verification 各自长出第二套装配规则。

## React 里怎么读状态？

先获取模块实例，再从实例上选择数据。

```tsx
const counter = useModule(CounterProgram)
const count = useSelector(counter, fieldValue("count"))
```

读取走 selector。写入和命令走 `useModule(...)` 返回的 handle。

## 什么时候用 Form？

普通页面状态和少量命令，用 plain Logix。

当数据是用户可编辑输入时，用 Form：字段值、校验、错误、source-backed choices、companion facts、submit gating、row identity。Form 把这些关注点放进领域 DSL，同时仍然通过同一条 React host route 读取。

## 怎么测试模块？

测试执行行为时，用 runtime 跑你关心的 Effect。

测试诊断、依赖和装配问题时，用 `Runtime.check(...)` 或 `Runtime.trial(...)`。它们返回结构化报告，比检查临时 console 输出更稳定。

## 生产环境怎么配置 diagnostics？

保持显式。热路径使用 `off` 或 `light`，只有调查问题时才打开更重的 evidence。Devtools 不应进入生产 UI，除非应用明确提供 operator surface。

## SSR 和 RSC 呢？

Runtime API 可以在服务端执行，但当前文档主路线是客户端 React host projection：`RuntimeProvider`、`useModule`、`useSelector`。
