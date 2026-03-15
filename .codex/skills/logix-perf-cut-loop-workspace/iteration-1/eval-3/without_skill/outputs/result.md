# Baseline 结果（不使用 skill）

## 结论

当前最值得继续的一刀，不是 `watchers.clickToPaint`，而是：

- **R-1：`txnLanes` 的单调高精度预算时钟 + 首次 host yield 前的 chunk 增长限幅**

原因很直接：

1. `watchers` 证据当前被工作区里的未提交试探污染，不能拿来做干净提交。
2. `externalStore` 当前 targeted 证据已经过线，不是最高收益点。
3. `txnLanes.urgentBacklog` 仍然稳定贴着/略高于 `50ms`，而且已有多组未提交试探都指向同一个根因：
   - `Date.now()` 的粗时钟
   - 首次 yield 前 `chunkSize` 倍增过快

所以如果按“一刀一提交”的方式继续，下一刀应该打 `txnLanes` 调度常数，而不是继续跟 `watchers` 的脏测量纠缠。

## 这次评估的硬约束

- 按要求，**没有修改仓库源码**。
- 只做了只读检索/分析，并把结果写到本文件。
- 当前工作区存在并行改动与未提交 perf 试探，不能把这些试探混进后续单刀 commit。

## 先排除：为什么现在不该先做 `watchers`

### 1) 工作区里有未提交的 `watcher` 测试试探

`git diff -- packages/logix-react/test/browser/watcher-browser-perf.test.tsx` 显示：

- 新增了 `nextFrame()`
- 在真正开始点击计时前多等了一帧：`await nextFrame()`

这说明当前有人正在试探 `watchers.clickToPaint` 的测量语义。

### 2) 所以当前 `watchers` 结果不干净

当前 dirty tree 下新跑出来的报告：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw121.watchers-fused-state-pass.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw122.watchers-settled-click.targeted.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw123.current-head.full-matrix.json`

都带 `git.dirty=true`，并且与 `O-2` 文档里的结论不一致。

例如：

- `ulw121` 里 `reactStrictMode=true, watchers=512` 还是 `55.7ms`
- `ulw122` 更是整体回到 `58~66ms`
- `ulw123` 里 `watchers.clickToPaint` 几乎整条轴都在 `49~63ms`

这更像“测量口径仍在动”，而不是一个已经收敛到可安全提交的新 runtime 热点。

### 3) 按任务要求，这些失败/半成品试探都不该混进 commit

所以结论不是“继续打 watchers”，而是：

- 先把 watcher 的测量试探留在工作区外面，不进入下一刀 commit；
- 下一刀转去一个**证据更干净、收益更确定**的热点。

## 为什么不是 `externalStore`

`externalStore` 当前 targeted 证据已经不构成最高优先级：

文件：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw124.external-store-current.targeted.json`

关键点：

- `watchers=128`: off `1.6ms`, full `1.4ms`
- `watchers=256`: off `1.1ms`, full `1.1ms`
- `watchers=512`: off `1.0ms`, full `1.0ms`

也就是：

- 绝对预算 `p95<=3.0ms` 明显在门内；
- 相对预算 `full/off<=1.25` 在 targeted 报告里也已经稳定过线。

`ulw123` full matrix 里 256 档出现过 `1.3x`，但同一 dirty tree 下紧接着的 `ulw124` targeted 又恢复到 `1.0x`，更像 broad collect 噪声，而不是明确的“下一刀”。

## 当前真正值得继续的点：`txnLanes.urgentBacklog`

文件：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw123.current-head.full-matrix.json`

关键点：

### `mode=default`

- `steps=200`: `45.8ms`
- `steps=800`: `51.0ms`
- `steps=2000`: `56.1ms`

### `mode=off`

- `steps=200`: `47.5ms`
- `steps=800`: `52.2ms`
- `steps=2000`: `54.5ms`

这组数据说明两件事：

1. `txnLanes` 还没有彻底把 `50ms` 打穿。
2. 当前剩下的不是“大块业务逻辑成本”，而是**调度常数 / 预算判断误差 / 首次 yield 前阻塞**。

因为连 `mode=off` 都已经很贴近 `50ms`，说明现在再搞大结构重写，性价比不高；真正该打的是调度回路里的常数。

## 现有试探已经给出方向，但这些试探本身不要混进 commit

我把现有未提交 `txnLanes` 试探摊开后，方向非常一致。

### 试探 1：限制 chunk 上限

文件：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw104.txn-lanes-max-chunk-8.targeted.json`

结果：

- `steps=200`: `45.4ms`
- `steps=800`: `51.3ms`
- `steps=2000`: `50.4ms`

说明：

- 限制前期 chunk 膨胀，确实能压 urgent latency。
- 但单独做还不够，`800/2000` 仍贴线。

### 试探 2：首次 yield 前延迟增长

文件：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw106.txn-lanes-delay-growth-until-yield.targeted.json`

结果：

- `steps=200`: `55.5ms`
- `steps=800`: `51.1ms`
- `steps=2000`: `50.2ms`

说明：

- 这个方向也对，尤其对 `800/2000` 更有效。
- 但它单独会把 `200` 拖坏。

### 试探 3：高精度时钟

文件：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw97.txn-lanes-default-hires-clock.json`

结果：

- `steps=200`: `63.4ms`
- `steps=800`: `54.2ms`
- `steps=2000`: `50.1ms`

说明：

- 单独只换时钟，并不能自动解决问题；
- 但它至少说明 `2000` 这种长 backlog 档位确实受预算判定精度影响。

### 试探 4：first host yield large

文件：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw114.txn-lanes-first-host-yield-large.targeted.json`

结果整体更差，尤其：

- `steps=800`: `65.0ms`
- `steps=2000`: `58.9ms`

说明这条路不值得继续，属于应留在工作区、不要混进 commit 的失败试探。

## 所以真正该提交的下一刀是什么

建议命名：

- **R-1：txn-lanes monotonic budget clock + bounded pre-yield growth**

### 刀口定义

目标不是再改 suite，也不是再换一堆策略，而是只做一个明确内核收口：

1. **把 `txnLanes` 的 lag / budget / sliceDuration 计算从 `Date.now()` 切到单调高精度时钟**
2. **在首次 `Effect.yieldNow()` 之前，限制 `chunkSize` 的增长上限**

### 为什么这是一刀

虽然包含两个动作，但它们针对的是同一个根因：

- 当前调度回路里，“预算是否超了”和“chunk 要不要继续长大”共用同一组粗粒度时间与增长逻辑；
- 把时钟改准、把首次 yield 前的增长夹住，本质上是在打同一段热路径。

这不是两刀，而是一刀里把“预算判定”和“预算执行”一起校正。

## 具体落点

主落点：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

重点位置：

- 当前 deferred converge / txn lanes 主循环
- `firstPendingAtMs`
- `lastYieldAtMs`
- `sliceDurationMs`
- `chunkSize` 的倍增/减半逻辑

## 具体改法（建议实现）

### 1) 时钟改成单调高精度

现状：

- 多处直接用 `Date.now()`

建议：

- 在该循环附近引入局部 `nowMs()` helper，优先 `performance.now()`，失败回退 `Date.now()`；
- `firstPendingAtMs`、`lastYieldAtMs`、`sliceStartedAtMs`、`lagMs`、`elapsedSinceLastYieldMs` 全部统一用这套单调时钟。

理由：

- `budgetMs=1` 时，`Date.now()` 太粗；
- 当前 `chunkSize` 增长逻辑对 0/1ms 的离散抖动过于敏感。

### 2) 首次 host yield 前限制 chunk 增长

现状：

- `initialChunkSize = budgetMs <= 1 ? 1 : 32`
- 每轮若 `sliceDurationMs < budgetMs / 2` 就直接 `chunkSize *= 2`

这意味着：

- 在快速 CPU 上，很多 slice 会被测成 `0ms`；
- `chunkSize` 会在真正 yield 之前连续翻倍；
- 等 urgent interaction 真的进来时，已经被一个过大的 non-urgent slice 卡住。

建议：

- 增加 `hasYieldedToHost` 或等价状态；
- 在 `yieldCount===0 && budgetMs<=1` 的阶段，限制 `chunkSize` 最大只长到 `8`；
- 一旦发生过第一次真实 yield，或者已经 `lagExceeded`，再恢复现有自适应增长。

这相当于把 `ulw104(max-chunk-8)` 和 `ulw106(delay-growth-until-yield)` 的有效部分合并成一个干净实现，而不是把各自的半成品试探直接提交。

## 预期收益

保守预期：

- `txnLanes.urgentBacklog` 的 `mode=default, steps=800/2000` 从 `51~56ms` 压回 `<=50ms`
- `runtime.backlogCatchUpMs` 继续留在 `200ms` 远内，不引入大的吞吐回退

更重要的是：

- 这刀是在现有内核主路径上做小而硬的常数切除；
- 改动面小，适合“一刀一提交”；
- 不需要改协议、不需要改 API、不需要改诊断 schema。

## 如果真的开干，提交边界应该长这样

### 应该进 commit 的内容

1. `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
2. 新增一篇 perf 记录，例如：
   - `docs/perf/2026-03-06-r1-txn-lanes-monotonic-budget-bounded-growth.md`
3. 更新长期清单：
   - `docs/perf/03-next-stage-major-cuts.md`
   - `docs/perf/05-forward-only-vnext-plan.md`
4. 新的最终证据：
   - 一个 after report
   - 一个 diff report

### 不应该进 commit 的内容

1. `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
   - 这是当前脏工作区里的测量试探。
2. 这批 exploratory perf JSON
   - `ulw92/93/94/95/96/97/99`
   - `ulw104/105/106/108/114`
   - `ulw121/122/123/124`

这些文件应该只当分析材料，不应直接混进“下一刀”的最终 commit。

## 验证建议

### 基础验证

- `pnpm -C packages/logix-core typecheck:test`
- `pnpm -C packages/logix-react typecheck:test`
- `pnpm -C packages/logix-core test`

### perf 主验证

先跑 targeted：

- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<after>.json`
- `pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw116.txn-lanes-click-anchored.targeted.json --after specs/103-effect-v4-forward-cutover/perf/<after>.json --out specs/103-effect-v4-forward-cutover/perf/<diff>.json`

判定口径：

- 至少把 `mode=default, steps=800/2000` 压回 `<=50ms`
- `runtime.backlogCatchUpMs` 继续明显低于 `200ms`

### 收口验证

如果 targeted 过线，再补一轮 broad/full matrix，确认：

- `externalStore` 不回退
- `watchers` 不被误伤
- `react.bootResolve` / `converge` 不回退

## 最终裁决

如果现在必须选“下一刀”，我的结论是：

- **选 `txnLanes`，不选 `watchers`。**
- **具体切法：高精度预算时钟 + 首次 yield 前 chunk 增长限幅。**
- **所有现有脏工作区试探都不要混进 commit。**

这条路线最符合当前仓库“继续按一刀一提交推进”的方式，也最符合“失败试探不要混进 commit”的要求。
