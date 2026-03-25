# 2026-03-25 · V3 control O-024 redline note

## Fact

在当前 `v3-control.accepted-cuts` worktree 上，下面这条测试当前是红的：

- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts`
- failing case:
  - `captured policy snapshot keeps seq-1 semantics when later override re-captures seq-2`

Failure shape:

- `waitUntil timed out after 100000 iterations`
- file:
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts`

## Boundary

这条红线不能直接归因到本轮 `5D-lite`。

原因：

1. `5D-lite` 的 hunk 已经回退
2. 回退后再次运行同一组测试，这条用例仍然失败

因此当前能确定的只有：

- 这条红线存在于当前 worktree 状态
- 它不是“只要回退 `5D-lite` 就会消失”的即时回归

当前不能确定的部分：

- 它最早是哪一步引入的
- 它和 `6B/6C` 或更早的 accepted-cut 迁移之间的精确关系

## Practical consequence

后续若继续评估 `5D`，不要把这条红线直接算到 `5D-lite` 头上。

更稳的做法是二选一：

1. 先在更早 checkpoint 上复测这条用例，建立 control
2. 明确接受当前 worktree 已有这条红线，再继续做后续 perf 试刀

## Additional evidence on 2026-03-25

补做的两条局部复现说明：

1. 单独只跑这一个用例时，它能通过：
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts -t "captured policy snapshot keeps seq-1 semantics when later override re-captures seq-2"`
2. 一旦整文件一起跑，它又会失败：
  - `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts`

这说明当前 `O-024` 更像：

- order-dependent
- file-scope interaction
- 不能直接当成单场景稳定语义回归

当前最保守的解读：

- 该用例依然是红线
- 但它已经从“稳定产品回归嫌疑”缩小成了“文件内顺序污染或测试形态问题嫌疑”

## Resolution update on 2026-03-25

在把 `v3-control` 的 live `txnQueue` 从 `6B/6C` 试线清回 `main`-style consumer loop 之后：

- `pnpm -C packages/logix-core test -- test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnLanePolicy.test.ts`
- result:
  - all green

因此这条 redline 现在可以收口为：

- resolved by queue live-state cleanup
- no longer treated as branch-ready blocker
