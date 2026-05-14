---
title: 测试
description: 在正确边界测试 module、program、runtime run 与 React projection。
---

谁拥有行为，就测试哪个边界。

## Reducers 和 pure helpers

同步变换直接测试。

## Runtime behavior

module logic、services、imports 和 transaction behavior 使用 `Runtime.run`。

```ts
await Logix.Runtime.run(Program, ({ module }) =>
  Effect.gen(function* () {
    yield* module.dispatch({ _tag: "increment", payload: undefined })
    const state = yield* module.getState
    expect(state.count).toBe(1)
  }),
)
```

## Static checks

```ts
const report = await Effect.runPromise(Logix.Runtime.check(Program))
expect(report.verdict).toBe("PASS")
```

## React tests

React 测试断言 projection：provider wiring、instance ownership、selector updates 和 UI 行为。不要通过 DOM 重新测试 runtime internals。
