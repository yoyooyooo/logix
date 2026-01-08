---
title: Traits（能力声明与收敛）
description: 理解 traits 如何把“派生/联动/校验/异步资源”收敛为可解释、可调参的运行时能力。
---

Traits 是 Logix 的一层“能力声明”（capability rules）：它允许你把 **派生、联动、校验、异步资源的写回策略** 等规则，用可序列化的声明挂到 Module 上，由 Runtime 在每次事务窗口内统一执行与收敛。

你可以把它理解成：

- UI/组件：只负责渲染与派发意图（Action）
- Logic/Flow：负责“步骤链 + 并发策略 + IO 编排”
- **Traits**：负责“字段级能力规则”（派生/校验/资源快照等），并保证这些规则在事务窗口内被一致地应用

## 1) Traits 解决什么问题

当业务进入“联动与约束的密集区”时，手写 watcher 很容易出现：

- 规则散落、难以复用：同一套联动/校验被复制粘贴到多个页面
- 解释困难：为什么某个字段被改了？是哪条规则触发的？链路断在哪？
- 性能不可控：每次输入都触发全量重算/全量校验；热路径缺少可调参的控制面

Traits 的价值在于：把“规则”变成 Runtime 可理解的声明，让运行时可以做：

- 在事务窗口结束前统一收敛（converge）：**一次窗口最多一次可观察提交**
- 只重算受影响的部分（依赖于 dirtySet 质量与规则依赖图）
- 在必要时退化为更稳的模式，并给出诊断证据

## 2) Traits 与事务窗口：什么时候会“看不到中间态”

Logix 的基本保证是：**单入口 = 单事务 = 单次对外提交**。也就是说，在一个同步事务窗口里发生的多次写入会被合并；React 订阅者通常只会看到最终提交结果。

这并不是“吞状态”，而是事务语义：窗口内的写入先进入 draft，窗口结束时一次性 commit。

你需要关注的边界是：

- **同步窗口内不要做 IO/await**：否则会把“短事务”拉长，甚至导致中间态被最后一次写回覆盖（并在开发环境触发 `state_transaction::async_escape`）。
- **长链路交互要拆分提交**：点击按钮立刻进入 loading、等待请求、成功/失败写回，推荐用 `run*Task` 的 `pending → IO → writeback`（见下文链接）。

相关页面：

- [Task Runner（长链路：pending → IO → writeback）](../learn/escape-hatches/task-runner)
- [排错：state_transaction::async_escape / enqueue_in_transaction](../advanced/troubleshooting)

## 3) Traits 与 Form：你大概率不需要“手写表单状态”

`@logixjs/form` 是最典型的“基于 traits 的领域包”：

- `derived`（computed/link/source）会被编译为 StateTrait 的派生/联动/资源快照规则
- `rules` 会被编译为校验规则（增量触发依赖于 `deps` 契约与列表 identity）
- Runtime 会在事务窗口内统一执行“写 values/ui → 收敛派生 → 增量校验 → 写 errors”，并保证一次窗口最多一次提交

因此：当你做多字段/校验/动态数组时，优先走 Form 主线，而不是在 Get Started 里手写一套表单模块。

推荐阅读：

- [Form 概览：Form 的模型](../../form/introduction)
- [派生与联动（derived / Trait）](../../form/derived)
- [Rules DSL（z）](../../form/rules)
- [性能与优化](../../form/performance)

## 4) 什么时候需要“直接用 traits”

大多数应用层代码不需要直接写 StateTrait；你更可能在以下场景接触到它：

1. 你在封装可复用的业务能力（Pattern/领域包），希望把规则随 Logic 一起复用。
2. 你需要对收敛策略做局部调参（例如 `traitConvergeMode/budget/time-slicing`），以止血或优化。
3. 你在排查“为什么某个派生/校验在抖动”并需要更可解释的证据链。

相关页面：

- [收敛调度控制面](../advanced/converge-control-plane)
- [性能与优化（Traits 成本模型）](../advanced/performance-and-optimization)
- [调试与 DevTools](../advanced/debugging-and-devtools)

## 5) 声明 traits 的两种入口（都属于 setup-only）

### 5.1 Module 级（领域包/模块实现常用）

当一个模块本身就“自带能力规则”（例如表单、动态列表、资源快照），通常会在模块实现阶段把 traits 固化进去（由对应领域包封装完成）。

你在应用层更常用的是“直接消费领域包”，而不是自己拼底层 traits。

### 5.2 Logic setup 级：`$.traits.declare(...)`

当你写一个可复用 Logic，希望“复用逻辑时也复用能力规则”，可以在 setup 阶段声明 traits：

```ts
Module.logic(($) => ({
  setup: Effect.sync(() => {
    const traits = Logix.StateTrait.from(StateSchema)({
      /* ... */
    })
    $.traits.declare(traits)
  }),
  run: Effect.void,
}))
```

关键约束：

- setup-only：setup 结束后 traits 会冻结，避免运行期漂移。
- 纯数据声明：不要依赖随机/时间/外部 IO 才能确定最终 traits。

更多 API 细节见：

- [Bound API：Traits（Setup-only）](../../api/core/bound-api)

