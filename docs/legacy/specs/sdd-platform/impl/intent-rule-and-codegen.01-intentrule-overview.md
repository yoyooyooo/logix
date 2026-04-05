# 1. IntentRule 回顾

核心结构（简化版）：

```ts
interface IntentRule {
  source: {
    context: "self" | string
    type: "state" | "action"
    selector: string        // AST 引用或序列化表达式
  }
  pipeline: Array<{
    op: "debounce" | "throttle" | "filter" | "switchMap" | "exhaustMap" | "custom"
    args: ReadonlyArray<unknown>
  }>
  sink: {
    context: "self" | string
    type: "mutate" | "dispatch" | "service"
    handler: string        // AST 引用或序列化表达式
  }
}
```

平台职责：

- 尽可能从规范化的 Logix 代码恢复为 IntentRule；
- 在平台 UI 中编辑 IntentRule，再生成规范化的 Logix 代码。
