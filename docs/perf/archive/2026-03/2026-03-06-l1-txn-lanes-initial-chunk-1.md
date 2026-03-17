# 2026-03-06 · L-1：`txnLanes` non-urgent 首片缩到 1（先让 urgent 插队）

本刀目标：继续打 `txnLanes.urgentBacklog` 的 `urgent.p95<=50ms` 硬门，不做大改协议，只切一个高收益常数项。

## 问题判断

在当前 `txnLanes` 路径里，non-urgent deferred flush 的 work loop 在 `budgetMs<=1` 时，初始 slice 大小是 `4`。这意味着：

- 即使 budget 非常激进（`1ms`），第一次 non-urgent flush 仍然至少会吞 4 个 deferred step；
- urgent 交互想插队，必须先等这第一个 slice 跑完；
- 对 `steps=200/800/2000` 这类 backlog，`urgent.p95<=50ms` 经常就差在这第一口固定阻塞。

结论：先把“第一口 non-urgent work”砍小，优先改善 urgent 首响应，比继续调 yield 策略更像直接命中根因。

## 改了什么

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

- `txnLanePolicy.budgetMs <= 1` 时，`initialChunkSize` 从 `4` 改成 `1`。

这意味着：

- 在最激进的 lane budget 下，non-urgent backlog 不再一上来就跑 4 步；
- urgent 交互更容易在第一轮 slice 之后立即插入；
- 后续 chunk 仍然保留现有自适应扩缩容逻辑：
  - slice 太慢就减半；
  - slice 明显低于 budget/2 才继续放大。

因此这刀只改变“第一刀切多大”，不改 lane 协议、yield 语义、evidence 结构，也不改 catch-up 的上界控制。

## 证据

### before

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw100.txn-lanes-mode-matrix.targeted.json`

### after

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw102.txn-lanes-initial-chunk-1.targeted.json`

### triage diff

- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw100-to-ulw102.l1-txn-lanes-initial-chunk-1.targeted.json`

说明：这份 diff 是 triage 口径，因为中间穿过了 K-1 的 matrix hash 变化；硬结论以前后各自报告里的 threshold 为准。

## 关键结果

### 1) `mode=default` 的 50ms 硬门明显改善

- 之前：`urgent.p95<=50ms {mode=default}` 全部失败（`maxLevel=null`）
- 现在：`urgent.p95<=50ms {mode=default}` 提升到 `maxLevel=800`，只在 `steps=2000` 首次失败

也就是：

- `steps=200`: `p95 50.1 -> 47.3 ms`
- `steps=800`: `p95 53.7 -> 50.0 ms`
- `steps=2000`: `p95 51.2 -> 50.8 ms`

### 2) catch-up 没有被打爆

- `runtime.backlogCatchUpMs` 仍然全部在 `p95<=200ms` 内。
- `mode=default, steps=200` 甚至从 `104.2 -> 93.4 ms`。

### 3) `mode=off` 不是本刀优化对象

- `mode=off` 下有改善也有回摆；这不是主目标。
- 当前产品真实路径是 `mode=default`，所以本刀只以 `default` 的门限改善作为裁决依据。

## 回归验证

- `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw102.txn-lanes-initial-chunk-1.targeted.json`
- `pnpm perf diff:triage -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw100.txn-lanes-mode-matrix.targeted.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw102.txn-lanes-initial-chunk-1.targeted.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw100-to-ulw102.l1-txn-lanes-initial-chunk-1.targeted.json`

## 裁决

- 这刀值得保留。
- 它已经把 `txnLanes.urgentBacklog` 从“default 全灭”打到“default 过 200/800，只剩 2000”。
- 下一刀如果继续打 `txnLanes`，应继续围绕 `mode=default, steps=2000` 的尾部残差，而不是回去纠缠 `mode=off`。
