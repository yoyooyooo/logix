# 2.3 `ExecutionResult` + `Execution` 工具

场景运行结果统一使用：

```ts
interface ExecutionResult<Sh extends Logix.AnyModuleShape> {
  readonly trace: ReadonlyArray<TraceEvent<Sh>>
  readonly state: Logix.StateOf<Sh>
  readonly actions: ReadonlyArray<Logix.ActionOf<Sh>>
}

type TraceEvent<Sh extends Logix.AnyModuleShape> =
  | { _tag: "Action"; action: Logix.ActionOf<Sh>; timestamp: number }
  | { _tag: "State"; state: Logix.StateOf<Sh>; timestamp: number }
  | { _tag: "Error"; cause: unknown; timestamp: number }
```

辅助工具（抛错式断言）：

- `Execution.expectActionTag(result, tag, { times? })`
- `Execution.expectNoError(result)`
- `Execution.expectNoActionTag(result, tag)`：断言某个 tag 的 Action 不存在；
- `Execution.expectActionSequence(result, [...tags])`：按顺序断言完整的 Action tag 序列；
- 以及一些布尔工具（如 `Execution.hasAction`、`Execution.getErrors`）供平台/AI 分析使用。
