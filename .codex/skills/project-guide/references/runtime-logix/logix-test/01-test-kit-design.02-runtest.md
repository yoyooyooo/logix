# 2.1 `runTest`（基础 runner）

`runTest` 是一个薄封装：提供 `TestContext` 后调用 `Effect.runPromise`。

```ts
import { runTest } from "@logix/test"
import { Effect, TestClock } from "effect"

const program = Effect.gen(function* () {
  // 带 TestClock / TestRandom 等 TestContext 能力
  yield* TestClock.adjust("1 seconds")
})

await runTest(program)
```

在引入 `@effect/vitest` 后，推荐优先用 `it.effect` / `it.scoped` 作为 runner，`runTest` 主要用于：

- 业务仓库刚接触 Effect 时的过渡期；
- 非 Vitest 环境下的简单测试或脚本；
- 在应用内嵌入「自检」场景（如 dev-only 自测命令），但依然复用 TestContext 能力。
