---
title: Lifecycle
description: 通过 scope、启动阶段和实例 owner 理解生命周期钩子。
---

Logix 的生命周期由 `Scope` 决定。

当一个 scope 关闭时：

- 挂在该 scope 上的长生命周期 fiber 会被中断
- destroy 或 finalizer 相关工作会执行

## 常见 scope 边界

1. `Runtime` scope
2. 局部模块 scope
3. provider layer scope

这些边界共同决定 logic 何时启动、停止和清理。

## 主要钩子

### `onInitRequired`

`onInitRequired` 适合放“实例可用前必须完成”的初始化工作。

```ts
$.lifecycle.onInitRequired(
  Effect.gen(function* () {
    yield* $.state.mutate((draft) => {
      draft.ready = true
    })
  }),
)
```

### `onStart`

`onStart` 适合放不阻塞可用性的后台工作。

### `onDestroy`

`onDestroy` 适合放实例关闭时的清理逻辑。

### `onError`

`onError` 用来处理后台逻辑中的未捕获 runtime defect。

## Logic phases

Logic 分成两个阶段：

- declaration phase
- run phase

生命周期钩子在 declaration phase 注册。
watcher、flow 和依赖读取在 run phase 执行。

## React 对应关系

- 通过 `useModule(ModuleTag)` 获取的共享实例，会跟随承载它的 runtime 生命周期
- 通过 `useModule(Program, options?)` 获取的局部实例，会跟随对应子树 owner 的生命周期
- `useLocalModule(...)` 这类高级局部路线，继续遵循组件局部 owner

## 相关页面

- [Flows & Effects](./flows-and-effects)
- [React integration](./react-integration)
