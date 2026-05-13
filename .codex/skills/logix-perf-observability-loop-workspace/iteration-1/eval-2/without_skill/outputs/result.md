# 结论

有，但**只在 watcher 这条线**；`txnLanes` 这条线我当前判断 **不值得为了收益先动表面 API**。

更具体地说：

- `txnLanes`：继续砍的空间主要还在 runtime 内核常数、work loop 和测量语义，不在公开 API。
- `watcher`：有一个很明确、而且我认为值得先和你对齐的 API 收口方向：**把“同步 state 反应”从通用 watcher API 里硬拆出来，收敛成可被 runtime 直接编译进 dispatch txn 的窄表面。**

# 为什么 `txnLanes` 现在不值得动 API

## 1. 最近拿到的收益都不是靠表面 API 换来的

现有 perf 证据里，`txnLanes` 最近几刀的收益来源都很明确：

- `J-1` 先修 evidence 结构，让 `mode=default/off` 分开看，而不是隐式 forced-off 混在一起。
- `L-1` 直接砍 non-urgent 首片 chunk 常数，`mode=default` 从“50ms 全灭”推进到 `steps<=800` 可过。
- `P-1` 把计时改成 click-anchored，去掉 timer 排队噪声后，`mode=default, steps=2000` 已进 `50ms`。

对应证据：

- `docs/perf/2026-03-06-j1-txn-lanes-mode-matrix.md`
- `docs/perf/2026-03-06-l1-txn-lanes-initial-chunk-1.md`
- `docs/perf/2026-03-06-p1-txn-lanes-click-anchored.md`

其中 `L-1` 和 `P-1` 的裁决都很清楚：剩余问题已经收缩成 `mode=default` 下的少数尾点，不是“API 不够表达”导致的。

## 2. `txnLanes` 的公开控制面已经够大了，再加表面 API 大概率是噪声

当前 `TxnLanesPatch` 已经暴露了：

- `enabled`
- `overrideMode`
- `budgetMs`
- `debounceMs`
- `maxLagMs`
- `allowCoalesce`
- `yieldStrategy`

见：`packages/logix-core/src/internal/runtime/core/env.ts:123-154`

这已经不是“缺旋钮”，而是“旋钮很多，但真正稳定有收益的默认策略还在继续证据化”。现在再加表面 API，风险是：

- 先把实验性调度决策固化成产品语义；
- 让业务层开始依赖一组还没完全收敛的 scheduling knobs；
- 最终把应当留在 runtime 内核里的优化压力，转嫁给调用方调参。

## 3. 连 `inputPending` 这种最像 API 的候选项，现在都还不够稳

`P-1` 的专项实验已经说明：`inputPending` 在某些点位有帮助，但不是稳定的全局答案，当前不值得升成 builtin 默认，更不值得扩大成新的产品表面。

所以我对 `txnLanes` 的判断是：

- **现在不建议为了性能动表面 API。**
- 如果后面真要动，也更像是“收缩/隐藏 knobs，换成更少的 preset”，而不是继续扩表面。
- 但这一步至少要等到下一轮 evidence 证明“内核常数已经吃干净，瓶颈确实是调用方无法表达调度意图”再说。当前证据还没到这一步。

# 为什么 watcher 这条线值得动 API

## 1. 高收益优化已经明确指向“把同步写回编译回 dispatch txn”

`O-2` 的收益很硬：

- `watchers=512, reactStrictMode=false`: `p95 55.4ms -> 42.8ms`
- `watchers=512, reactStrictMode=true`: `p95 50.4ms -> 36.6ms`

证据：`docs/perf/2026-03-06-o2-watchers-direct-writeback.md:1-86`

这刀本质上不是“把 watcher 跑得更快一点”，而是：

- 不再把纯 state watcher 当普通 effect 跑；
- 而是直接在 dispatch 路径里改 draft / recordPatch；
- 也就是把同步反应重新并回原 action txn。

这说明 watcher 线最值钱的收益来源已经很清楚：

**不是给现有 watcher API 再加更多并发/调度参数，而是把“同步反应”从“普通 watcher”里语义上剥出来。**

## 2. 当前快路径只覆盖了很窄的一小段 API 形态

现在的优化入口只覆盖：

- `runFork` / `runParallelFork`
- 且传进去的不是函数，而是常量 `$.state.update(...)` / `$.state.mutate(...)`

见：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts:99-140`

也就是说，只有这种形态能被 setup-time 识别并注册成 action-side writeback。

而仓库里更常见的同步写 state 写法，其实是：

- `$.onAction(...).mutate(...)`
- `$.onAction(...).update(...)`

我做了一个粗扫，只看 `packages + examples`：

- `.onAction(...).mutate(...)` 大约 41 处
- `.onAction(...).update(...)` 大约 16 处
- 合计大约 57 处

相比之下，`runFork/runParallelFork` 虽然也不少，但当前 O-2 的快路径只覆盖其中“常量纯 state write effect”这一小撮子集。

这意味着现在最贵的优化，落在了**偏技巧性**的 API 形态上，而不是最主流、最直觉的业务写法上。

## 3. 当前主流写法实际上还在走“dispatch 后再经 actionHub 触发 watcher”的外层路径

`onAction(...)` 默认消费的是 `runtime.actions$ / actionsByTag$`，而这条流来自 `actionHub`：

- `actions$ = Stream.fromPubSub(actionHub)`
- 见：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts:1225-1231`

而 `actionHub` 的 publish 发生在：

- `enqueueTransaction(runDispatch(...))`
- 之后再 `zipRight(publishActionPropagationBus(...))`
- 见：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts:666-704`

这说明默认 watcher 路径天然带着：

- action 发布/订阅 fan-out
- watcher 流处理
- 再开一笔 state txn 写回

而不是“本次 action 的同步 state 反应就在原 txn 里完成”。

如果我们不动 API，只继续在内部猜测更多 pattern，当然也能继续优化；但这会越来越依赖“识别技巧”，而不是明确语义。

## 4. 这件事在评审结论里已经被点过，而且方向是对的

评审里已经明确写了：

- 目标是“一个 action 导致的所有同步派生在同一笔事务内完成，只 commit 一次”；
- 可选策略之一就是把 `$.onAction(...).update/mutate` 明确标记为“同步反应”，在 dispatch 事务内执行；
- 其他 `run/runTask` 保持事务外异步反应。

见：`docs/ssot/handbook/reading-room/reviews/03-transactions-and-traits.md:205-210`

这和 O-1/O-2 的 perf 结果是同向的，不是拍脑袋的新想法。

# 我建议先对齐的 watcher API 变更

如果你愿意花一笔轻微 breaking 的 API 预算，我建议优先花在下面这组收口上。

## 提案 A：把 `$.onAction(...).update/mutate` 定义成“同步反应专用面”

建议语义：

- `$.onAction(...).update/mutate` 只能表达**纯同步 state 反应**；
- 运行时保证它们在 dispatch txn 内执行；
- 不允许 IO、不允许 fork、不允许异步边界；
- 它们应该成为 Action -> State 的首选写法，而不是 `run* + $.state.*` 的一个等价替代品。

为什么值：

- 这能把 O-2 的收益面，从“常量 direct-state-write effect 的技巧写法”，扩到仓库里最常见的业务写法；
- 也能把“同步反应”与“异步 watcher”在 API 语义上切干净，让 runtime 不用继续靠 pattern 猜测。

我认为这是**值得为了收益动 API**的一刀。

## 提案 B：`IntentBuilder.update` 不再允许返回 `Effect<State>`

当前类型签名允许：

- `update((prev, payload) => nextState)`
- 也允许 `update((prev, payload) => Effect<State>)`

见：`packages/logix-core/src/internal/runtime/core/LogicMiddleware.ts:72-79`

而实现里也真的会在 `runWithStateTransaction(...)` 里执行这个 Effect。见：`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts:170-194`

这件事的问题不只是风格，而是直接违反你仓库自己的主方向：

- 事务窗口禁 IO；
- 同步反应应该可分析、可压缩、可 patch 化；
- 异步链路应该走 `run*Task` 或显式多 entry。

我做的 repo 粗扫里，没有发现明显依赖“`update` 返回 Effect”这种能力的现成用法；所以这是一刀**潜在收益高、迁移成本低**的破坏性收口。

建议：

- `IntentBuilder.update` 只保留纯同步 `(prev, payload) => nextState`
- 要做异步，统一改走 `run / runLatest / run*Task`

这刀我也认为值得对齐后推进。

## 提案 C：把 `runFork/runParallelFork($.state.update/mutate(...))` 从“推荐公开写法”降级

这类写法现在之所以有性能收益，是因为 runtime 已经对它做了特判。

但长期看，它更像：

- runtime 内部兼容/降解入口；
- 或 codegen/rewriter 可以产出的中间形态；
- 而不是业务侧最应该记住的首选 public API。

如果 A/B 成立，我建议顺手把这条口径也收掉：

- **同步写 state**：用 `onAction(...).update/mutate`
- **异步 watcher / 任务**：用 `run* / run*Task`
- `runFork/runParallelFork($.state.*)` 不再作为文档首选，必要时只保留兼容或加诊断提示

这刀更多是“配套口径收口”，不是必须先做，但和 A/B 一起才完整。

# 最终判断

## `txnLanes`

**现在没有值得为了收益先动 API 的地方。**

原因：

- 收益还主要来自内核常数和证据修正；
- 公开 knobs 已经很多；
- 剩余问题不足以支撑新 API 面；
- 继续动 API 只会把实验性调度决策泄漏给业务层。

## `watcher`

**有，而且值得。**

我建议优先对齐这两件事：

1. `$.onAction(...).update/mutate` 变成严格的“同步反应”API，并回 dispatch txn。
2. `IntentBuilder.update` 禁止返回 `Effect<State>`，异步统一走 `run* / run*Task`。

如果你认这两条，我会把 watcher 线后续优化的 API 方向定成：

- 公开面更窄；
- 语义更硬；
- runtime 更容易直接编译成 dispatch 内写 draft；
- 性能收益面也会比继续抠 pattern-recognition 更大、更稳。

# 如果要继续，我建议的对齐问题

1. 你是否接受把 `$.onAction(...).update/mutate` 明确提升为“同步反应专用面”，并让它们在语义上不再等价于普通 watcher？
2. 你是否接受把 `IntentBuilder.update` 的 `Effect<State>` 返回能力直接砍掉，强制异步逻辑改走 `run* / run*Task`？
3. 你是否接受把 `runFork/runParallelFork($.state.update/mutate(...))` 从对外推荐 API 降级成兼容/内部优化入口？
