# 2026-03-17 · P1-3 第三刀：externalStore large-batch-only 失败结论

## 结果分类

- `discarded_or_pending`

## 目标

在前两轮失败之后，把 `P1-3` 收窄成唯一还值得试的切口：

- `batch.length < 64` 继续走 legacy
- `batch.length >= 64` 才走 accessor batch path

目标是只在明显大 batch 上收回 path parse / set 成本，不再碰 `single / two / eight` 的混合双路径。

## RED

这轮补的真正 RED 是：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.LargeBatchOnly.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/StateTrait/StateTrait.ExternalStoreTrait.LargeBatchOnly.Perf.off.test.ts
```

初始失败点：

- `expected 'undefined' to be 'function'`

原因：

- 生产代码里还没有独立的 `large-batch-only` helper
- 也没有显式的 batch threshold

## targeted perf 为什么看起来为正

bad worktree 里的 targeted perf 结果是：

- `multi-8`
  - `ratio = 1.015`
- `multi-64`
  - `ratio = 0.683`
- `multi-256`
  - `ratio = 0.676`

这组证据只能说明一件事：

- `large batch` 的局部 micro-bench 的确转正了

它不能单独证明可合入，原因是这条线会穿过：

- externalStore runtime 语义
- module-as-source tick 语义
- downstream derived 同 tick 收敛

## 为什么仍然必须判失败

主会话独立复核了这组验证：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.LargeBatchOnly.test.ts \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.LargeBatchOnly.Perf.off.test.ts \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts \
  test/internal/Runtime/ModuleAsSource.tick.test.ts
```

真实失败 3 条：

1. `StateTrait.ExternalStoreTrait.Runtime.test.ts`
- `perf skeleton: externalStore ingest proxy phases`
- 失败：`waitUntil timed out`

2. `ModuleAsSource.tick.test.ts`
- `should settle A->B writeback and downstream derived within the same tick`
- 失败：target state 仍是旧值

3. `ModuleAsSource.tick.test.ts`
- `should apply Module-as-Source during scheduled microtask tick (no manual flushNow)`
- 失败：`Expected >=1 ticks, got 0`

这三条失败的含义很直接：

- 这版 large-batch-only 改动已经破坏 externalStore / module-as-source 的既有语义
- local micro-bench 即使转正，也不能覆盖语义回归
- 因此不能按 `accepted_with_evidence` 收口

## 收口

这条线当前只保留 docs/evidence-only：

- 不保留任何代码实现
- 不保留测试草稿

## 当前结论

- `P1-3` 直到目前仍然没有拿到可保留代码的切口
- `large-batch-only` 是目前最像正确方向的一次试探
- 但它同样被邻近 runtime / tick 语义回归否掉了

## 后续是否还值得重开

当前默认结论：`不值得继续`

只有在出现新的更窄切口，并且能同时满足下面两点时，才值得重开：

1. `large-batch` targeted perf 继续为正
2. `StateTrait.ExternalStoreTrait.Runtime` 与 `ModuleAsSource.tick` 全绿
