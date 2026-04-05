# 2026-03-30 · dirty-evidence converge admission probe

## 目标

在 `main@299dfafc` 上做一条最小 node-side probe，只回答两件事：

1. `unknown_write / dirty_all / near_full` 这三类 `converge admission` 信号，当前各自对应什么写入形态
2. `dirty-evidence coverage` 是否值得升为下一刀

本次只做 evidence，不改 runtime 实现。

## probe 设计

- 入口：`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.AdmissionProbe.test.ts`
- 运行方式：`vitest run`，纯 node-side cheap-local
- 图规模：`64` 个一对一 computed step
- 采样口径：
  - 每个场景先跑 `1` 次 warmup，避开 `cold_start`
  - 再取后续 `5` 次样本
  - 记录 `requestedMode / executedMode / reasons / dirty summary / stepStats / duration`

## 命令

```sh
pnpm -C packages/logix-core exec vitest run \
  test/StateTrait/StateTrait.ConvergeAuto.AdmissionProbe.test.ts
```

## 结果

| 场景 | 写入形态 | requestedMode | executedMode | reasons | dirty reason | dirtyAll | dirtyRoots | executed / skipped steps | median exec / decision ms | 读数含义 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `covered_single_field` | `Reducer.mutate([in0])` | `auto` | `dirty` | `cache_hit=4/5, cache_miss=1/5` | `-` | `0/5` | `1` | `1 / 63` | `0.018 / 0.040` | 单字段且 dirty-evidence 完整时，admission 稳定走 `dirty` |
| `unknown_write_setState` | `setState(single-field, no patch)` | `auto` | `full` | `unknown_write=5/5` | `unknownWrite=5/5` | `5/5` | `0` | `64 / 0` | `0.283 / 0.010` | 单字段写入，只因没有 patch evidence 就退回全量 |
| `dirty_all_non_trackable` | `setState(single-field) + recordStatePatch(NaN)` | `auto` | `full` | `dirty_all=5/5, unknown_write=5/5` | `nonTrackablePatch=5/5` | `5/5` | `0` | `64 / 0` | `0.251 / 0.005` | `dirty_all` 是更强的退化信号，这里由 non-trackable patch 直接触发 |
| `plain_replace_single_field` | `plain reducer replaceOne(in0)` | `auto` | `full` | `unknown_write=5/5` | `unknownWrite=5/5` | `5/5` | `0` | `64 / 0` | `0.389 / 0.008` | plain reducer 单字段写回当前落在 `unknown_write`，没有命中 `dirty_all` |
| `near_full_broad_mutate` | `Reducer.mutate(58/64)` | `auto` | `full` | `near_full=5/5` | `-` | `0/5` | `116` | `64 / 0` | `0.284 / 0.005` | 宽写入时 `near_full` 稳定生效；`dirtyRoots=116` 是当前导出的 admission readout，不把它直接解释成“用户只写了 116 个字段” |

## 关键结论

### 1. `dirty-evidence coverage` 仍然值得升为下一刀

同样是单字段写入：

- 有精确 evidence：`1` 个 step 执行，`63` 个 step 跳过，`executedMode=dirty`
- 没有精确 evidence：直接退回 `64` 个 step 全量执行，`executedMode=full`

这已经足够说明问题在 admission 面本身，读数差异不是测量噪声。

### 2. 下一刀优先级应落在 `unknown_write` 覆盖，不该先追 `dirty_all`

本次 probe 里：

- `setState(single-field, no patch)` 命中 `unknown_write`
- `plain reducer replaceOne(in0)` 也命中 `unknown_write`
- 只有显式制造 non-trackable patch 时，才稳定命中 `dirty_all`

因此“收益面更宽”的切口是：

- 补窄写入场景的 patch evidence / admission input
- 让 `setState` 与 plain reducer writeback 不要因为缺证据就直接 full fallback

`dirty_all` 仍然是重要信号，但当前更像第二优先级。

### 3. `near_full` 目前像真实 route-level gate

当写入真的已经接近全量时，`near_full` 会稳定把 `auto` 推回 `full`。这类读数不该被当成 dirty-evidence coverage 缺陷。

## 路由裁决

- route classification: `accepted_with_evidence`
- next cut: `yes`
- cut order:
  1. 先做 `unknown_write` 覆盖面，重点看 `setState` 与 plain reducer writeback
  2. `dirty_all` 暂列第二层，优先盯 non-trackable/fallback 类场景
  3. `near_full` 先保留为 admission gate，不作为这一刀的主目标

## 直接回答

`dirty-evidence coverage` 值得升为下一刀，但切口应明确收敛到 `unknown_write` 覆盖，而不是把 `dirty_all` 和 `near_full` 混成同一类问题。
