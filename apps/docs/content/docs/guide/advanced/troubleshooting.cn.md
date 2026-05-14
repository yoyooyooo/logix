---
title: Troubleshooting
description: 诊断 provider、imports、services、selector breadth 与 lifecycle failures。
---

从失败的边界开始查。

## Provider missing

React hook 找不到 runtime 时，需要在上方放置 `RuntimeProvider`，或在测试 wrapper 中提供一个。

## Import missing

parent program 如果读取 child tag，必须 import child program。

```ts
Logix.Program.make(Parent, {
  initial,
  capabilities: { imports: [ChildProgram] },
})
```

`Runtime.check` 可以在 startup 前报告 missing program imports。

## Service missing

logic 使用 `$.use(Api)` 时，需要在 program、runtime 或 provider scope 提供 service layer。

## Broad selector

如果 selector 每次 commit 都返回新对象，可能频繁 re-render。使用 `fieldValue`、`fieldValues` 或 equality function。

## Lifecycle failure

实例获取失败时，检查通过 `$.readyAfter` 注册的 readiness effects，以及 provider `onError` 输出。

如果 active demo 在 source edit 后停止响应，先检查 `runtime.hot-lifecycle` evidence。开发期 HMR 应通过 host dev lifecycle carrier 一次性启用，使用 `logixReactDevLifecycle()` 或 `installLogixDevLifecycleForVitest()`。`RuntimeProvider` 保持只投影 runtime，由 runtime owner 在存在 successor runtime 时选择 `reset`，没有 successor 时选择 `dispose`。
