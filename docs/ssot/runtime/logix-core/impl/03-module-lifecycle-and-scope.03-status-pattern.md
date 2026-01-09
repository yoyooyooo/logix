# 3. 错误处理最佳实践：Status Pattern

由于 `onInit` 不能抛错，推荐使用 **Status Pattern** 将错误内化为领域状态：

```ts
type Status = "idle" | "initializing" | "ready" | "error"

const onInit = Effect.gen(function* () {
  yield* $.state.update(s => ({ ...s, status: "initializing" }))

  // 尝试执行可能失败的操作
  const result = yield* Effect.tryPromise(fetchConfig).pipe(
    Effect.either
  )

  if (result._tag === "Left") {
    // 失败：写入错误状态，不抛错
    yield* $.state.update(s => ({
      ...s,
      status: "error",
      error: result.left
    }))
  } else {
    // 成功
    yield* $.state.update(s => ({
      ...s,
      status: "ready",
      config: result.right
    }))
  }
})
```
