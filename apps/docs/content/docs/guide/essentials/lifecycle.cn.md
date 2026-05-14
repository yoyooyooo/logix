---
title: Lifecycle
description: 实例 readiness、运行中工作、dispose 与 React ownership。
---

Logix module instance 有两条生命周期 lane：readiness 和 running work。

## Readiness

```ts
yield* $.readyAfter(loadConfig, { id: "config" })
```

readiness requirement 必须完成后，实例才算 ready。如果失败，实例获取失败，runtime 会报告失败。

## Running work

`Module.logic` 返回的 effect 可以在 ready 后继续运行。watcher、stream 和长任务都在这条 lane。

```ts
const logic = Module.logic("watch", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("changed").runLatest(handleChange)
  }),
)
```

## Disposal

runtime dispose 会关闭 scope 和 finalizer。资源清理使用 Effect scope 与 service finalizer；不要创建第二套公开 destroy hook。

## React ownership

- `useModule(Module.tag)` 解析已经托管的实例。
- `useModule(Program, { key })` 在当前 provider 下创建或复用局部/keyed 实例。
- local owner 卸载后，会按 provider policy 释放 runtime cache entry。
