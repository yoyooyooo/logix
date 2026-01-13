---
title: 事务车道（Txn Lanes）
description: 让关键交互优先完成，后台补算/通知不再拖尾，并且可解释、可回退。
---

当你遇到“输入/点击很频繁时明显卡顿”，但卡顿主要来自**非关键补算/派生/通知**的堆积（backlog），Txn Lanes 用来把这类工作变成“可延后但有上界”的非紧急车道，让关键交互的 p95 不再被拖尾。

## 一句话心智模型

把运行时的工作粗分成两类：

- **紧急（urgent）**：必须优先完成的交互关键路径（例如一次 dispatch/一次状态提交窗口的核心动作）。
- **非紧急（non-urgent）**：允许延后执行的 follow-up work（例如 deferred flush、后台补算、批量通知），但必须在上界内追平。

Txn Lanes 的目标不是“中断事务”，而是让**事务之后的工作**不再堵住下一次交互。

## 关键词（≤5）

- `urgent`
- `non-urgent`
- `backlog`
- `budget`（按时间预算分片）
- `evidence`（可解释证据：为什么让路/合并/追平）

## 它不是什么

- 不是“可中断事务”：事务仍然同步、无 IO、按窗口做一次提交。
- 不是 React 的 `startTransition`：Txn Lanes 延后的是 Logix 内部的计算/调度；`startTransition` 延后的是 React 的渲染调度。两者可以组合，但不能互相替代。

## 你能得到什么

- **关键交互更稳**：backlog 存在时，urgent 仍然优先完成。
- **后台工作不失控**：non-urgent 允许延后，但有最大延迟上界（避免永远追不平）。
- **可解释**：在 Devtools/调试事件里能看见“为什么让路/为什么合并/是否触发饥饿保护”。

## 什么时候该启用？

把它当成一个“交互止血/治理杠杆”，优先解决：

- 已经启用 deferred work（例如某些派生/收敛/通知延后）后，出现明显的“队列拖尾”：输入不断时，后续每次交互都越来越慢。
- 明显的 p95 卡顿来自“非关键补算/派生/通知”，而不是一次事务本身做太多 IO（事务窗口本就禁 IO）。

如果你的卡顿来自“首次初始化/渲染期同步阻塞”，先看 [React 集成](../essentials/react-integration) 的启动策略与冷启动优化，再考虑 Txn Lanes。

## 怎么开启（最小示意）

Txn Lanes 默认开启；你通常只需要“调参”或“显式关闭”来做对照/止血。

显式关闭（回到 baseline）：

```ts
Runtime.make(impl, {
  stateTransaction: {
    txnLanes: { enabled: false },
  },
})
```

显式调参（保持开启）：

```ts
Runtime.make(impl, {
  stateTransaction: {
    txnLanes: {
      enabled: true,
      budgetMs: 1,
      debounceMs: 0,
      maxLagMs: 50,
      allowCoalesce: true,
      // 渐进增强：支持的浏览器里优先让路给输入（否则退化为 baseline）
      // yieldStrategy: 'inputPending',
    },
  },
})
```

## 怎么选（参数与策略）

- `budgetMs`：non-urgent 每次切片的时间预算。越小越“更积极让路”，但调度开销更高；建议从 `1` 开始，用证据再调。
- `maxLagMs`：backlog 的最大延迟上界。越小越“更快追平”，但更容易触发强制追平；建议从 `50` 开始。
- `allowCoalesce`：建议保持 `true`，允许中间态合并/取消，避免补算拖尾。
- `yieldStrategy`：优先用 `baseline`；只有在你确认环境支持且确实需要更偏交互优先时再启用 `inputPending`（不支持会自动退化为 baseline）。

## 怎么验证“真的生效了”

不要靠体感猜，至少做两件事：

1. 打开 Devtools/诊断后，确认能看到 Txn Lanes 的证据摘要（backlog、reasons、budget 等），并能与事务锚点（txnSeq）对齐。
2. 在稳定场景里做一次 off/on 对照：观察 urgent 的 p95 是否改善、输入停止后 backlog 是否能在上界内追平。

## 与 React `startTransition` 怎么配合？

- `startTransition` 负责“渲染优先级”（让某些 UI 更新更晚渲染）。
- Txn Lanes 负责“运行时 follow-up work 调度”（让补算/通知不堵住下一次交互）。
- 推荐组合：先用 Txn Lanes 治理内部 backlog；当你明确某些 UI 更新可以延后渲染时，再在 UI 层使用 `startTransition`，两者各司其职。

## 怎么回退/止血

遇到异常或需要对照定位时，优先用“运行期覆盖”做快速回退：

- `overrideMode: 'forced_off'`：强制关闭 Txn Lanes（回到 baseline）。
- `overrideMode: 'forced_sync'`：强制全同步（忽略 non-urgent 延后与 time-slicing，用于对照验证差异）。

> 建议：回退时同时保留证据输出（方便解释“当前处于哪种模式/为何回退”）。

## 渐进增强：`inputPending`

在支持 `navigator.scheduling.isInputPending` 的浏览器中，你可以把 non-urgent 的“让路判定”改为更偏向交互优先：

- `yieldStrategy: 'baseline'`：只用时间预算 + 硬上界（默认，跨环境一致）。
- `yieldStrategy: 'inputPending'`：输入待处理时更积极让路；空闲时更积极追平 backlog；不支持时自动退化为 baseline。

它只影响 **事务之外** 的 follow-up work 调度，不改变事务语义。
