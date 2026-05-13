# baseline 结论（不使用任何 skill）

## 证据基线

- 最新 full-matrix：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw123.current-head.full-matrix.json`
  - `createdAt=2026-03-06T03:25:27.930Z`
  - `git.commit=124fa7aa96228ee06d1f432384e21672b096aebf`
  - `dirty=true`
- 对照 clean baseline：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw115.stable-head.full-matrix.json`
  - `createdAt=2026-03-06T02:01:12.911Z`
  - `git.commit=2d60e6ebf9227e165b8e8651492aa6e794692204`
  - `dirty=false`
- 最新 `docs/perf` 记录停在 2026-03-06 10:48 左右，文档覆盖到 `Q-1` / `O-2`，但没有覆盖 `ulw121/122/124` 这些更晚的 targeted 结果。
- 所以如果 `docs/perf` 和 `ulw123 current-head` 冲突，我以 `ulw123` 为当前真相，以更晚 targeted 结果做冲突裁决。

## 现在真正还剩的性能瓶颈

### 1. `txnLanes.urgentBacklog` 还是实打实没收口

这是当前 full-matrix 里唯一还像“真实 runtime 剩余问题”的项。

当前 `ulw123`：

- `mode=default`
  - `steps=200`: `urgent p95 = 45.8ms`，过线
  - `steps=800`: `urgent p95 = 51.0ms`，失败
  - `steps=2000`: `urgent p95 = 56.1ms`，失败
- `mode=off`
  - `steps=200`: `47.5ms`
  - `steps=800`: `52.2ms`
  - `steps=2000`: `54.5ms`
- `catchUp p95` 都还在 `200ms` 门内，但 `default@800` 已经到 `98ms`

为什么我把它判成“真瓶颈”：

- 这条线已经经过两轮 benchmark 纠偏：
  - `J-1` 去掉了 broad matrix 默认偷偷测 `forced-off` 的证据偏差。
  - `P-1` 去掉了 `setTimeout(0)` 排队噪声，改成真正 click-anchored 计时。
- 在纠偏后，它仍然随 `steps` 增长而变慢，这不是随机抖动，而是 workload 相关的残余成本。
- `stable-head -> current-head` 还出现了真实回摆：
  - `default@800`: `45.6 -> 51.0ms`（+5.4ms）
  - `default@2000`: `52.5 -> 56.1ms`（+3.6ms）
- 这说明 `txnLanes` 不是“文档里说已经好了，所以就算了”，而是当前 head 仍然卡在高 backlog 档位。

## 哪些主要是 benchmark 测歪了，或者已经不值得继续拿来当“下一刀”目标

### 1. `watchers.clickToPaint` 现在更像 e2e 地板，不再像 watcher 数量扩张瓶颈

这是当前最容易误判的一条。

当前 `ulw123`：

- `reactStrictMode=false`: `1/8/32/64/128/256/512 = 56.8 / 61.5 / 58.2 / 49.1 / 59.3 / 53.1 / 54.9 ms`
- `reactStrictMode=true`: `60.1 / 49.6 / 62.9 / 56.6 / 52.6 / 55.0 / 58.1 ms`

关键观察：

- 这些值几乎不随 `watchers` 单调增长。
- `watchers=1` 和 `watchers=512` 是同一量级，甚至有时 512 还更低。
- 这说明当前失败的主因不是 watcher scaling，而是接近常数的 click/render/paint/settle 地板。

更关键的是，文档里的 `O-2` 已经过时了：

- `docs/perf/2026-03-06-o2-watchers-direct-writeback.md` 记录的是 `ulw120`，里面的 `512` 档是 `36.6~42.8ms`。
- 但更晚的 targeted 结果 `ulw122.watchers-settled-click.targeted.json` 已经显示：
  - non-strict 平均约 `60.0ms`
  - strict 平均约 `59.9ms`
  - 而且几乎对 `watchers` 数量不敏感
- 这说明 `O-2` 里那组更漂亮的数字，不是当前最可信的“真实 click-to-stable 地板”。它更像旧口径下的低估值。

结论：

- `watchers` 不是完全没问题，而是“继续沿 watcher runtime 路径砍”已经不是最高收益。
- 现在这条 fail 更多是 benchmark/harness/React commit floor，不是 watcher 数量扩张还没打掉。
- 所以它不该是下一刀。

### 2. `externalStore.ingest.tickNotify` 在 full-matrix 里的 1 个失败，基本是噪声，不是主瓶颈

`ulw123` 里唯一失败点：

- `watchers=256`: `full/off = 1.30 / 1.00 = 1.30x`
- 但绝对值只是 `1.3ms vs 1.0ms`，delta 只有 `0.3ms`

更晚的 targeted 结果 `ulw124.external-store-current.targeted.json`（11:28，比 full-matrix 更晚）直接显示：

- `128`: `off 1.6ms`, `full 1.4ms`
- `256`: `off 1.1ms`, `full 1.1ms`
- `512`: `off 1.0ms`, `full 1.0ms`

也就是：

- 同一时间窗的 targeted 复测已经把它跑回门内了。
- 这条线现在不是“还得狠狠干”的地方，更多是 full-matrix 单次采样抖动/量化效应。

### 3. `react.strictSuspenseJitter` 已经明确是修 benchmark，不是 runtime 瓶颈

`K-1` 已经把旧的“多次点击总耗时”伪失败改成真实 suspend 路径。

当前 `ulw123`：

- `p95<=100ms` 全部通过

所以这条线不用再碰。

### 4. `converge` / `form.listScopeCheck` / `negativeBoundaries` / `runtimeStore` 现在都不是阻塞项

- `converge.txnCommit`：所有 hard budget 都过；`decision` 的 `notApplicable` 是 gate 语义问题，不是 perf 问题。
- `form.listScopeCheck`：相对预算全过。
- `negativeBoundaries.dirtyPattern`：纠偏后全过。
- `runtimeStore.noTearing.tickNotify`：全过。

## 只选一刀：继续打 `txnLanes`，但不要再做 slice/yield 小旋钮，直接做“urgent-only commit / notify 与 deferred backlog 解耦”

我只选这一刀，不给第二候选。

### 为什么是它

- 它是现在唯一在最新 full-matrix 里仍然具备“随 workload 增长而恶化”的真实剩余瓶颈。
- `watchers` 的 fail 已经不再跟 watcher 数量相关，继续砍 watcher runtime 不值。
- `externalStore` 的 fail 已被更晚 targeted 复测推翻，不值。
- `txnLanes` 这条线上，前面已经试过一圈小旋钮：
  - `initial-chunk-1`
  - `aggressive-yield`
  - `max-chunk-8`
  - `long-backlog-cap-4`
  - `delay-growth-until-yield`
  - `delay-growth-large-only`
  - `first-host-yield-large`
- 这些实验说明：继续拧 `chunkSize / yieldStrategy / cap` 这种小参数，不够稳，收益也不够确定。

### 为什么不是继续调 `yieldStrategy`

当前 `ulw117 inputPending` 的结果并不稳：

- `default@200` 能到 `45.3ms`
- 但 `default@800/2000` 还是 `53.6 / 58.5ms`

这说明问题不是“少一个 inputPending 开关”，而是 urgent 更新仍然和 deferred backlog 的 flush/notify/commit 有耦合。

### 我建议的这刀具体是什么

目标不是再让 non-urgent slice 更小，而是让 urgent 点击的可见结果先独立提交：

- 当 `urgent` action 到来时，如果当前只有 deferred trait backlog 在跑：
  - 允许 urgent reducer/state 写入先形成一次独立 commit/notify；
  - deferred trait flush 继续留在 non-urgent backlog；
  - 不要让 `B` 这种 urgent 可见字段继续被 `d*` 的 deferred converge/notify 绑在同一波里。
- 换句话说：下一刀应该砍“urgent 可见提交”和“deferred trait backlog”之间的耦合，而不是继续调 yield 小参数。

### 这刀最可能落点

按当前代码形态看，主要会落在：

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`

原因：

- 现在 non-urgent deferred flush 仍在 `ModuleRuntime.impl.ts` 里按 slice 驱动；
- urgent/non-urgent 的排队与优先级在 `ModuleRuntime.txnQueue.ts`；
- 真正剩下的值钱改动，不是继续改 slice 参数，而是改“urgent 到来时怎样绕开已经排队的 deferred flush 的 commit/notify 耦合”。

## 最终裁决

- 真正还剩的主瓶颈：`txnLanes.urgentBacklog`
- benchmark 测歪/不值得继续追的：`watchers.clickToPaint`（当前更像 e2e 地板，不再是 watcher scaling）、`externalStore.ingest.tickNotify` 的单点 ratio fail、`react.strictSuspenseJitter` 旧口径
- 只选的一刀：`txnLanes` 的 **urgent-only commit / notify 与 deferred backlog 解耦**

如果下一步真要“继续狠狠干”，我会只沿这条线做，不会再把刀浪费在 `watchers` 或 `externalStore` 上。
