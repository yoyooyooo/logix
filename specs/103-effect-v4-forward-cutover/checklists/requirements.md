# Requirements Checklist: 103-effect-v4-forward-cutover

## 主线定位校正

- [x] 明确 `103` 仍是全仓 Effect v4 迁移主线。
- [x] 明确 runtime-core closure 只是当前已完成 slice，而不是整体终态。
- [x] 明确 Stage 1 / 3 / 4 / 5 / 6 仍属于主线剩余工作。
- [x] 明确历史 `G5` artifact 只保留为历史证据，不代表当前 `HEAD`。

## Runtime-Core Closure

- [x] 保留 forward-only、无兼容层、无双栈。
- [x] 记录已落地的 `T020/T021/T022/T024/T031/T033/T035/T036` 子轨。
- [x] 绑定 schema gate、typecheck、tests、diagnostics comparison 作为 closure 证据。

## Gate Truthfulness

- [x] `GP-1` 已刷新为当前远端事实。
- [x] `G1` 保持 truthful `NOT_PASS`，不再与“继续实现任务”相冲突。
- [x] `G1.0/G2/G3/G4/G5` 已被改写为与当前主线状态一致，不再冒充整体完成。
