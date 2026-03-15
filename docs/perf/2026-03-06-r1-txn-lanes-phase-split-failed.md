# 2026-03-06 · R-1 失败试验：blind first-host-yield phase split

本记录对应 `txnLanes` 主线的一次负收益实验。

目标是验证一种两阶段 backlog policy：
- startup：固定超小 slice，禁止自适应放大
- 完成首片后立刻做一次 host yield
- steady-state：再恢复现有自适应 chunk growth / catch-up

## 结论

- 这版 phase split **不值得保留**。
- 在 `budgetMs=1` 的当前配置下，它没有稳定降低 `first urgent after backlog start` 的等待，反而在 `mode=default` 的 3 个关键档位上都让 `urgent.p95` 变差。
- 因此这次实验只保留证据，不落代码。

## 证据

- `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.r1split.txn-lanes-policy-split.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.r1split.txn-lanes-policy-split.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1split.txn-lanes-policy-split.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.r1split.txn-lanes-policy-split.strict.targeted.json`

关键回归：
- `mode=default, steps=200`: `51.9 -> 63.5ms`（`+11.6ms`）
- `mode=default, steps=800`: `46.7 -> 51.1ms`（`+4.4ms`）
- `mode=default, steps=2000`: `45.4 -> 54.2ms`（`+8.8ms`）

## 为什么失败

在当前实现里，`budgetMs=1` 已经让 startup 阶段天然很小；这次实验真正新增的变量，不是“小 slice”，而是“首片后强插一次 host yield”。

证据说明：
- 这次 host yield 没有稳定帮 urgent lane 抢到更早的执行窗口
- 它反而给 `mode=default` 引入了额外 host 调度抖动
- 所以“blind first host yield”不是正确方向

## 后续方向

下一轮 `R-1` 不应重复这版 phase split，而应改成：
- `urgent-aware handoff`
- 只有在看到更强的 urgent waiter / urgent backlog / host input pending 证据时，再让 non-urgent backlog 明确让路

也就是说：
- 下一刀仍然是 `txnLanes` 主线
- 但策略应从“固定做一次 host yield”升级成“看 urgent 证据再 handoff”
