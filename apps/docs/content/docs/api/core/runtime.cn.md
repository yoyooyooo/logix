---
title: Runtime
description: 执行容器、一次性 runner、batch helper 与验证控制面。
---

`Runtime` 拥有执行。它创建 runtime container，运行 program，批处理 host work，并产出 control-plane reports。

## `Runtime.make`

```ts
const runtime = Logix.Runtime.make(Program, {
  label: "AppRuntime",
  layer: AppLayer,
  devtools: true,
})
```

React 应用和长生命周期 runtime 使用这条路线。

## `Runtime.run`

```ts
await Logix.Runtime.run(Program, ({ module }) =>
  Effect.gen(function* () {
    yield* module.dispatch({ _tag: "increment", payload: undefined })
    return yield* module.getState
  }),
)
```

测试、CLI task 和一次性执行使用这条路线。它 boot program，运行 `main`，然后 dispose runtime。

## Control plane

```ts
const check = yield* Logix.Runtime.check(Program)
const trial = yield* Logix.Runtime.trial(Program, trialOptions)
```

`check` 是 static。`trial` 运行 diagnostic scenario。二者都返回 `VerificationControlPlaneReport`。

## Batch

`Runtime.batch(fn)` 在当前 host tick 内组合同步 host work。它是 advanced helper，不替代 actions。
