# 2026-03-25 · V3 control time-slicing redline note

## Fact

当前 `v3-control.accepted-cuts` worktree 上，下面这条测试单独运行会 timeout：

- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`

Failure:

- `deferred flush should not block an urgent transaction when txnLanes is enabled`
- timeout:
  - `5000ms`

## Boundary update

这个 redline 在以下动作之后仍然存在：

1. 撤掉 `5D-lite`
2. 撤掉 queue 链 `6B/6C` live code

因此当前至少可以确定：

- 它不是 `5D-lite` 单独引入的
- 它也不能再直接算到 `6B/6C` 头上

## Practical consequence

当前 `time-slicing lane` timeout 属于一条独立 correctness redline。

它和 `O-024` 一样，需要单独建 control，再决定是否要在 perf 主线里一起处理。

## Resolution update on 2026-03-25

在把 `v3-control` 的 live `txnQueue` 从 `6B/6C` 试线清回 `main`-style consumer loop 之后：

- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
- result:
  - green

因此这条 redline 现在可以收口为：

- resolved by queue live-state cleanup
- no longer treated as branch-ready blocker
