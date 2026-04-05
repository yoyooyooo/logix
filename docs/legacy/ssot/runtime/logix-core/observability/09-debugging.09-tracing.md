# 3. 追踪系统 (Tracing System)

## 3.1 Trace ID

每个外部触发（用户点击、WebSocket 消息）都会生成一个唯一的 `TraceID`。这个 ID 会随着逻辑链路传递。

```text
[Trace: abc-123] User Clicked Button
  -> Dispatch Action: SUBMIT
  -> Trigger Flow: SubmitForm
  -> Effect: Set Loading = true
  -> Effect: Call API
  -> Effect: Dispatch Action: SUBMIT_SUCCESS
    -> Trigger Flow: ShowToast
```

## 3.2 因果图 (Causality Graph)

基于 Trace ID，DevTools 可以构建出“因果图”，清晰地展示“谁触发了谁”。
