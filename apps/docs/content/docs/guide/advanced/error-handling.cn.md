---
title: 错误处理
description: 预期失败、defect、provider reporting 与 state writeback。
---

错误应留在拥有它的 lane。

## 预期失败

会影响 UI 的 service failure 应在 logic 中捕获，并写入 state 或领域 error carrier。

```ts
yield* api.save(input).pipe(
  Effect.catchAll((error) =>
    $.state.mutate((draft) => { draft.error = String(error) }),
  ),
)
```

## Defects

非预期 defect 应进入 runtime/provider reporting 路线。React 中使用 `RuntimeProvider.onError`，并用 Error Boundary 做 host-level 展示。

## Form errors

Form validation 与 submit errors 属于 Form rules、submit decode 或 Form error selectors。不要把它们镜像进另一套 React-local error store。

## Control-plane errors

`Runtime.check` 与 `Runtime.trial` 返回报告。CI、CLI 和 agent verification 使用这些报告。
