# 结论

有，但只在 **watcher 这条线** 上值得认真考虑动表面 API；`txnLanes` 这条线目前 **不值得为了性能去动 API**。

更具体地说：

- 如果你的目标是“下一刀先把真实 P1 剩余问题继续压下去”，那我会先继续砍 **`txnLanes` 的内核调度常数**，不是 API。
- 如果你的目标是“愿意用一次轻度 API 收敛，换后续一整条线更稳定的性能上限和更小的运行时特判”，那我认为 **watcher 的同步 state writeback API** 有价值先对齐。

---

# 当前瓶颈排行

## 1. `txnLanes.urgentBacklog` 仍有真实内核瓶颈

当前 head 的最新 broad/full 证据是：

- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw123.current-head.full-matrix.json`

其中 `txnLanes.urgentBacklog` 的 `urgent.p95<=50ms` 结果：

- `mode=default, steps=200`: `45.8ms`，通过
- `mode=default, steps=800`: `51.0ms`，失败
- `mode=default, steps=2000`: `56.1ms`，失败
- `mode=off, steps=200`: `47.5ms`，通过
- `mode=off, steps=800`: `52.2ms`，失败
- `mode=off, steps=2000`: `54.5ms`，失败

这说明：

- `txnLanes` 现在剩下的是 **真实 runtime scheduler 尾部问题**；
- 而且它不是“表面 API 不够表达”导致的，而是 **non-urgent work loop 的切片/yield/lag 策略** 还没把 `800/2000` 档位压进 50ms。

结合既有实验：

- `L-1`（`docs/perf/2026-03-06-l1-txn-lanes-initial-chunk-1.md`）证明 `initialChunkSize` 这类内核常数是有效杠杆；
- `ulw103/104/105/106/108/114/117` 这批实验表明，继续暴露/放大 `yieldStrategy` 一类开关，并没有呈现出稳定、横向可复用的收益面。

我的分类：`txnLanes` 目前属于 **真实运行时瓶颈**，但还没有看到“必须靠改表面 API 才能继续推进”的证据。

## 2. `watchers.clickToPaint` 当前 50ms 失败，证据里混有语义漂移

已落文档的最后一刀是：

- `docs/perf/2026-03-06-o2-watchers-direct-writeback.md`

它给出的结论是：

- `watchers=512, reactStrictMode=true`: `p95 50.4ms -> 36.6ms`
- `watchers=512, reactStrictMode=false`: `p95 55.4ms -> 42.8ms`

这说明 O-2 已经打掉了一大块真实结构税：

- watcher 不再离开 action txn；
- 对可识别的纯 state write，不再绕通用 Effect 分支，而是直接在 dispatch txn 内改 draft/recordPatch。

但 current-head 的 broad/full 证据 `ulw123` 又显示：

- `watchers.clickToPaint` 的 `p95<=50ms` 在 strict / non-strict 都回到全灭；
- `p95<=100ms` 仍然全绿。

这里我不会把它直接判成“runtime 真回退”，因为当前 worktree 里还有一个**未落文档的 suite 语义变化**：

- `packages/logix-react/test/browser/watcher-browser-perf.test.tsx` 的工作区 diff 在点击前额外插入了一次 `await nextFrame()`；
- 与之对应地，仓库里也出现了未文档化的探索证据：
  - `s2.after.local.quick.ulw121.watchers-fused-state-pass.targeted.json`
  - `s2.after.local.quick.ulw122.watchers-settled-click.targeted.json`
  - `s2.after.local.quick.ulw123.current-head.full-matrix.json`

所以 watcher 这条线当前更像是：

- **O-1/O-2 已经证明存在真实结构税，并且已经砍掉一大段；**
- **current-head 的 50ms 全灭里，混进了 suite 语义漂移/探索样本，不能直接当作“新的纯 runtime 硬结论”。**

我的分类：

- watcher 的“当前 broad/full 失败”里，既有 **真实剩余结构问题**，也有 **证据语义漂移**。
- 但它确实暴露出另一个更深的问题：**当前快路径依赖内部 heuristic，而不是稳定、显式的表面语义。**

---

# 我认为是伪影 / 门禁噪声 / 证据漂移的项

## A. `txnLanes` 的旧 timer 排队噪声已经被 P-1 纠偏

- `docs/perf/2026-03-06-p1-txn-lanes-click-anchored.md` 已经把 `urgentToStableMs` 改成 click-anchored；
- 因此现在再看 `txnLanes` 的剩余超线，优先应视为真实 scheduler 尾部，而不是再把锅甩给 suite。

也就是说：

- `txnLanes` 这条线 **已经不该再用“测量语义有问题”来逃避内核优化**。

## B. `watchers` 的 current-head broad/full 不应直接拿来否定 O-2

原因有两个：

- 已提交文档的最后一刀（O-2）和 current-head broad/full 之间，缺少一份正式 `docs/perf` 级别的语义对齐说明；
- 当前 worktree 中 `watcher-browser-perf.test.tsx` 本身存在未提交 suite 改动，这会让 `ulw120` 与 `ulw123` 不再是严格可比的一组证据。

因此：

- `watchers` 当前 broad/full 失败，**可以当风险信号**；
- 但不能直接当作“runtime 从 O-2 回退了十几毫秒”的硬结论。

## C. 不建议把 `txnLanes` 的 yield/inputPending 之类旋钮继续上浮成用户 API

已有专项结果：

- `ulw117`（click-anchored + `inputPending`）只把 `steps=200` 拉回门内；
- `steps=800/2000` 仍在 `53.6/58.5ms`；
- 收益不稳，而且容易把 scheduler tuning 责任推给调用方。

所以这类旋钮更适合作为：

- 运行时内部实验轴；
- 或 provider/debug override；
- 而不是新的主表面 API。

---

# 建议下一刀

## 如果不动 API：先继续打 `txnLanes`

原因：

- 它是当前两条线里更“干净”的真实瓶颈；
- `mode=default, steps=800/2000` 的失败已经不太像 measurement artifact；
- 这条线下一刀更像是继续做 `initialChunkSize / growth / yield cadence / lag-exceeded policy` 的内核常数优化。

我不会先为 `txnLanes` 提 API 提案。

## 如果愿意为了长期收益动一次轻度 API：优先对齐 watcher 同步写回语义

原因：

- O-1/O-2 已经证明：**“同步 action 触发的纯 state 写” 一旦并回 dispatch txn，收益非常大**；
- 但当前这条快路径靠的是内部 `Symbol` metadata + pattern matching：
  - 只对 `runFork/runParallelFork($.state.update(...))` 这类“非函数、常量 effect” 形态稳定命中；
  - 对 payload-dependent 写法、轻度包装后的 effect、以及更复杂但仍然纯 sync 的写法，覆盖面天然有限；
- 这会导致引擎继续在“猜用户是不是想要 sync writeback”，而不是让用户显式表达这个语义。

所以若要动 API，我建议 **只动 watcher 线**，不动 `txnLanes`。

---

# 是否需要 API 变动

## `txnLanes`：不需要

我的判断：**现在不值得为了 `txnLanes` 动 API。**

### 问题

- 现在的瓶颈是 non-urgent deferred flush 的切片/yield 策略，还没把 `steps=800/2000` 压进 `50ms`。

### 当前内补丁为什么还够用

- `L-1` 已经证明内部切片常数能直接改善结果；
- `inputPending` / aggressive-yield / host-yield 这一批探索没有呈现出“API 不变就无路可走”的信号；
- 继续暴露更多表面开关，收益不大，反而会把 runtime policy 泄漏给业务侧。

### 裁决

- 保持 `txnLanes` API 不动；
- 继续在 runtime 内部收敛策略；
- 最多保留 provider/debug override 作为实验面，不升格成更显式、更常用的主表面配置。

## `watcher`：有一个值得对齐的 API 提案

我的判断：**有，值得先跟你对齐。**

这不是因为“现在不改 API 就完全做不下去”，而是因为：

- 这条线已经证明“同步 state write 合并进 dispatch txn”是高收益模式；
- 继续完全依赖内部 heuristic，边际收益会越来越差，而且不稳定。

---

# API 变动提案（watcher 线）

## 问题

当前高收益快路径其实是在优化一类很具体的语义：

- “某个 action 触发后，做 **纯同步、无 IO、只写 state** 的联动逻辑”。

但现在这层语义并没有被表面 API 显式表达出来。

当前实现靠的是：

- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - 给 `$.state.update / $.state.mutate` 返回的 effect 打内部 metadata；
  - `runFork / runParallelFork` 遇到这类 effect 时，偷偷注册成 `actionStateWriteback`。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
  - dispatch 事务里消费这些 writeback handler。

问题在于：

- 这本质上是 **runtime 在猜测“这个 watcher 其实是同步 writeback”**；
- 一旦用户写成 payload-dependent resolver、或者 effect 外面再包一层，命中率就会下降；
- 引擎最值钱的那条 fast-path，没有变成用户可见、LLM 可稳定生成、文档可明确约束的 contract。

## 当前内补丁为什么不够

继续只做内部 pattern matching，会遇到三个上限：

1. 覆盖面上限
- 非函数常量 effect 好识别；
- payload-dependent 或轻度组合后的写法很难既安全又稳定地自动识别。

2. 语义上限
- 当前 API 没有显式告诉用户：“这是一条同步反应，会被并入 dispatch txn，因此禁止 IO / 禁止 fork / 最好只有纯 state write”。
- 运行时只能靠隐式约定 + diagnostics 兜底，不利于长期收敛。

3. 可解释性上限
- 对 Devtools、文档、LLM、代码评审来说，`runParallelFork($.state.update(...))` 看起来仍像“普通 watcher”；
- 但它在运行时却被特判成“同步 action writeback”。
- 语法与执行模型不一致，会妨碍后续继续做 compile-to-IR / 更激进优化。

## 建议 API 变化

我建议二选一，倾向 A：

### A. 直接把 `$.onAction(...).update/mutate` 升格为“同步反应”的唯一主路径

语义改成：

- `$.onAction(tag).update(...)`
- `$.onAction(tag).mutate(...)`

默认就是：

- 在 dispatch txn 内执行；
- 只能做同步 state write；
- 不允许 IO / 不允许 fork；
- 目标是一个 action 只 commit 一次。

同时把：

- `runFork/runParallelFork($.state.update/mutate(...))`

降级为：

- 兼容内部原语/低层写法；
- 或至少不再作为推荐主路径。

### B. 如果你觉得复用 `update/mutate` 名字太容易和现有语义混淆，就新开一个显式 API

例如：

- `$.onAction(tag).syncUpdate(...)`
- `$.onAction(tag).syncMutate(...)`
- 或 `$.onAction(tag).writeback(...)`

然后明确规定：

- `run*` 系列只表达异步/普通 watcher；
- `sync* / writeback` 才是 action 内同步联动的性能主路径。

## 预期收益

### 1. 横向收益比继续抠 heuristic 更大

- 不再只优化当前 benchmark 里的字面形态；
- 可以覆盖 payload-dependent 的纯 state write 场景；
- 后续更多真实业务 watcher 都能稳定命中同一条快路径。

### 2. 单事务/单提交语义会更稳

- reducer + sync action reaction + trait converge 更容易收敛到“一次 action，一次 commit”；
- 这对 click-to-paint、dirty evidence、Devtools 可解释链路都有正收益。

### 3. API/IR/文档会更一致

- 表面语义直接暴露“同步反应”；
- 运行时不再需要把用户代码反编译成猜测；
- 更符合仓库里已经写出来的方向：
  - `docs/ssot/handbook/reading-room/reviews/03-transactions-and-traits.md`
  - `docs/ssot/handbook/reading-room/reviews/02-mental-model-and-public-api.md`

## 影响面

### 会受影响的用户写法

主要是这类：

```ts
yield* $.onAction('inc').runFork($.state.update(...))
yield* $.onAction('inc').runParallelFork($.state.mutate(...))
```

### 迁移方向

如果选 A：

```ts
yield* $.onAction('inc').update((prev, payload) => next)
yield* $.onAction('inc').mutate((draft, payload) => {
  ...
})
```

如果选 B：

```ts
yield* $.onAction('inc').syncUpdate((prev, payload) => next)
yield* $.onAction('inc').syncMutate((draft, payload) => {
  ...
})
```

### 风险

- 这会改变部分 watcher 的时序语义；
- 必须把“事务窗口禁 IO”写死到 API contract 和 diagnostics 里；
- 需要同步更新：
  - Logic API 文档
  - WatcherPatterns 测试
  - examples / LLM 推荐写法
  - perf suite，避免继续混淆“普通 watcher”和“同步 reaction”

---

# 最终裁决

## 我的明确建议

- **`txnLanes`：现在不要动 API。**
  继续砍 runtime 内核调度策略即可。

- **`watcher`：有一个值得动 API 的点，而且现在就值得先对齐。**
  不是为了救眼前某一个点位，而是为了把已经被 O-1/O-2 证明有价值的快路径，从“内部 heuristic”升级成“显式 contract”。

## 如果你要我给一个最简洁的 yes/no

- `txnLanes`：**No**
- `watcher`：**Yes，但先对齐 API 语义再动**

## 我建议你拍板的方向

如果你愿意动 API，我建议先对齐这个问题：

- 你更倾向于：
  1. 直接把现有 `$.onAction(...).update/mutate` 改造成同步 dispatch-in-txn 主路径；
  2. 还是新开 `syncUpdate/syncMutate/writeback` 之类更显式的名字，把旧写法降级为低层原语。

我个人偏向 **1**，因为它更小、更一致，也更符合“同步反应是第一公民”的方向；但如果你更重视语义显式度，**2** 也成立。
