---
title: Devtools React Render Metrics · Auto Dedup (Heuristic)
status: draft
version: 2025-12-18
value: core
priority: later
---

# 背景

当前 `trace:react-render` 事件由 `@logix/react` 的 `useModule` 在 commit 后发出：

- 粒度是“每个 `useModule` 调用点每次 commit 一条”，不是“组件 render 次数”；
- 同一组件内如果对同一模块调用多次 `useModule`，Devtools 中会表现为多条 `trace:react-render`；
- 这对“渲染密度”评估仍有价值，但 `renderCount` 名称容易被误解为组件 render 次数。

# 目标

在不引入手动埋点、不依赖 React 私有 API（不稳定）前提下，提供一个**自动**的“近似组件级 render 计数”视角，
用于：

- 在 Devtools 概览/摘要里，减少同一组件内多次 `useModule` 导致的“计数放大”；
- 让 `renderCount` 的解释更接近开发者直觉（但必须明确它是 heuristic）。

# 方案（二）Heuristic：按 instanceId + 时间窗口去重

## 核心思路

在 Devtools 侧统计 `trace:react-render` 时，不直接按事件条数累加，而是做一次近似去重：

- **Key**：以 `instanceId` 为主键（可选带上 `moduleId`，但通常已在事件里体现）；
- **Window**：在一个很小的时间窗口内（例如同一 `commitTick`/同一 `operationWindow`/同一 `overview bucket`），
  同一 `instanceId` 的多条 `trace:react-render` 仅计 1 次。

直觉：同一组件内多次 `useModule` 往往发生在同一 commit 周期内，时间戳非常接近；
以 `instanceId` 去重可以压掉“同组件多 hook”的放大效应。

## 可能实现点（Devtools-only）

1) **OperationSummary 窗口**（`operationWindowMs`）：
   - 在 `groupEventsIntoOperationWindows` 中维护 `seenReactRenderInstanceIds: Set<string>`；
   - 每遇到 `ref.kind === "react-render"`，若 `instanceId` 已存在则不增加计数；
   - 输出字段改为 `reactRenderUniqueInstanceCommitCount`（或保留旧字段但明确语义）。

2) **OverviewStrip 时间桶**（bucketMs）：
   - 每个 bucket 维护 `seenInstanceIds: Set<string>`；
   - `react-render` 落入 bucket 时按 `instanceId` 去重计数。

## 误差与风险（必须显式标注）

- **低估风险**：多个不同组件在同一时间窗口内共同订阅同一 `instanceId` 时，会被去重为 1；
- **高估仍可能存在**：若同一组件在一次更新中发生多次 commit（例如连续 state 更新分批触发），仍会计多次；
- **时间窗口选择敏感**：window 太小去不掉，太大则更容易低估。

因此该指标应被命名/展示为：
“`trace:react-render` 近似去重计数（heuristic）”，而不是“真实组件 render 次数”。

# 开放问题

- 是否需要把该 heuristic 做成 Devtools setting（默认 off）？
- 是否应该在 Runtime 层补充一个稳定的 `componentId`（但这又变成“手动挡/HOC/Wrapper”）？
- 在 StrictMode / Concurrent features 下，事件时间戳的相关性是否足够强？
