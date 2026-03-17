# 2026-03-15 · v4-perf 第一波实验状态

本页只回答三个问题：

1. 这波 worker 都做了什么
2. 哪些有明确收益证据
3. 哪些虽然已经合入 `v4-perf`，但不应被算作“已证实收益”

## 裁决口径

从现在开始，`v4-perf` 上的实验结果分三类：

1. `accepted_with_evidence`
- 已合入
- 有贴边、可复现、与目标路径直接相关的正向证据

2. `merged_but_provisional`
- 已合入
- 方向成立或结构更干净
- 但没有足够硬的收益证据
- 不计入“已证实 perf win”

3. `discarded_or_pending`
- 未合入，或只保留 docs/evidence-only

## 本波结果总表

| 方向 | 状态 | 是否已合入 `v4-perf` | 证据强度 | 备注 |
| --- | --- | --- | --- | --- |
| `P0-1 txn fastpath` | `accepted_with_evidence` | 是 | 强 | `off` 模式有 clean/comparable 对照 |
| `P0-2 deferred worker HotSnapshot` | `accepted_with_evidence` | 是 | 强 | deferred flush targeted 对照为正 |
| `P0-2 operation runner fast snapshot` | `accepted_with_evidence` | 是 | 强 | `runOperation` 空默认路径贴边 micro-bench 明显更好 |
| `P0 runSession-local opSeq allocator fast path` | `accepted_with_evidence` | 是 | 强 | `middleware=empty + runSession=on` 的 operation 热路径已拿到贴边证据 |
| `P0-2 existing-link inline operation fast path` | `accepted_with_evidence` | 是 | 强 | 只命中 `existingLinkId + middleware=[]` 残余壳税，贴边 micro-bench 继续为正 |
| `P0-2 transaction HotSnapshot` | `accepted_with_evidence` | 是 | 强 | transaction 返回路径直接收益为正，且 deferred/txn-lane 守门继续全绿 |
| `P0-2 transaction / operation shared hot context` | `accepted_with_evidence` | 是 | 强 | transaction 与 operation 共用热上下文后，贴边 micro-bench 在大 batch 下继续为正 |
| `P2 selector scratch reuse` | `accepted_with_evidence` | 是 | 强 | 有贴边 micro-bench，且目标路径直接收益明显 |
| `P1 whole-state fallback top-level dirty` | `accepted_with_evidence` | 是 | 强 | reducer/action-writeback 的 whole-state fallback 已收紧且证据为正 |
| `P0 post-commit slim path` | `accepted_with_evidence` | 是 | 强 | post-commit 公共壳在无额外观测时已拿到稳定正收益 |
| `P1 topic subscriber gate` | `accepted_with_evidence` | 是 | 强 | 无订阅 topic 的 commitTick/topic path 纯开销已拿到贴边证据 |
| `P1 topic fanout post-commit` | `accepted_with_evidence` | 是 | 强 | listener fanout 已脱离 tick critical section，贴边证据为正 |
| `P1-7 react cache identity decouple` | `accepted_with_evidence` | 是 | 强 | boot-time config churn 的 cache dispose/runtime rebuild 已拿到直接证据 |
| `P1-6 defer preload plan unification` | `accepted_with_evidence` | 是 | 强 | render/effect 共用 preload plan，直接相位证据成立 |
| `P2 process moduleAction shared upstream` | `accepted_with_evidence` | 是 | 强 | 共享上游订阅已拿到直接吞吐对照 |
| `P1 externalStore single-field specialized path` | `accepted_with_evidence` | 是 | 强 | single-field 高频路径稳定更好，邻近与 browser suite 不回退 |
| `P1 no-trackBy list RowId gate` | `accepted_with_evidence` | 是 | 强 | D-3 收口证据成立，并覆盖较早失败试探 `03ab1280` |
| `P1 onCommit scheduler minimal envelope` | `accepted_with_evidence` | 是 | 强 | onCommit 到 scheduler 的 envelope 已拿到直接对照，且合入后 current-head probe 仍为 clear |
| `P1-3 externalStore large-batch-only` | `discarded_or_pending` | 否 | 失败 | `64 / 256` 档位 micro-bench 虽转正，但 externalStore / module-as-source 邻近语义回归失败 |
| `P1-5 React selector activation grace hold` | `accepted_with_evidence` | 是 | 强 | 短 listener gap 内不再重复重启 readQuery drain，贴边 micro-bench 给出强正收益 |
| `P1-5 core selector retain/release` | `accepted_with_evidence` | 是 | 强 | static selector activation ownership 已下沉到 core retain/release，React store activation restart 为 0 |
| `P1-5 retain scope tax cut` | `accepted_with_evidence` | 是 | 中 | retain/release 冷路径去掉无效 scope 后，direct micro-bench 平均下降约 22.2% |
| `P1-5 selector entry reuse` | `accepted_with_evidence` | 是 | 强 | long-gap cold activation 复用 selector entry / hub 后，direct lifecycle micro-bench 平均下降约 82.3% |
| `P1-5 readQuery store idle GC` | `accepted_with_evidence` | 是 | 强 | 10k unique selector 的“只建 store 不订阅”常驻从约 54.4MB 降到约 0.12MB |
| `P1-5 cached entry cap + value reset` | `accepted_with_evidence` | 是 | 强 | corrected retained heap probe 从约 26.2MB 降到约 1.32MB，且不破坏 entry reuse 收益 |
| `P1-5 explicit cached entry eviction` | `discarded_or_pending` | 否 | 弱 | 当前没有比第六刀更硬的 retained heap 收益 |
| `P1-1 single-field pathId 直写链` | `discarded_or_pending` | 否 | 失败 | reducer 单字段 pathId 直写链在贴边 micro-bench 中稳定更慢 |
| `P1-6 react defer preload unresolved-only` | `discarded_or_pending` | 否 | 失败 | `effectPreloadCount` 降了，但 `bootToReady/deferReady` focused bench 更差 |
| `R3 react controlplane neutral config singleflight` | `discarded_or_pending` | 否 | 失败 | 问题存在，但这版切口会误伤动态配置刷新语义 |
| `P1 externalStore draft primitive` | `discarded_or_pending` | 否 | 失败 | `multi` 变快，`single` 变差，不满足稳定正收益门槛 |
| `P1 externalStore dual-path` | `discarded_or_pending` | 否 | 失败 | `single/two/eight` 收益不稳，双路径方案被否掉 |
| `P1 dispatch PatchAnchor precompile` | `discarded_or_pending` | 否 | 失败 | 贴边 micro-bench 收益不稳定，已回退代码 |
| `P1 topicId minimal cut` | `discarded_or_pending` | 否 | 失败 | `RuntimeStore.commitTick` 与 `TickScheduler` 邻近 bench 都明显更慢 |

## 各线摘要

### `P0-1 txn fastpath`

提交：
- `9f2242ec` `perf(txn): add off idle direct enqueue fastpath`
- `69ccc579` `docs(perf): add off comparable evidence for txn fastpath`

做了什么：
- 只在 `diagnostics=off`
- 且 queue 空闲
- 且没有 waiter

时，为 `enqueueTransaction(...)` 增加 direct fast path，跳过：

- `resolveConcurrencyPolicy`
- `acquireBacklogSlot`
- `Deferred.start`
- `enqueueAndMaybeStart`
- `Deferred.await(start)`

收益证据：
- clean/comparable `off` 模式 5 轮中位
  - 当前实现：`p50=0.063ms`, `p95=0.109ms`, `avg=0.077ms`
  - 对照基线：`p50=0.072ms`, `p95=0.120ms`, `avg=0.085ms`
- 相对变化
  - `p50`: `-0.009ms`
  - `p95`: `-0.011ms`
  - `avg`: `-0.008ms`
- 独立 worktree 复核：`2026-03-16-p0-1-txn-direct-worktree-revalidation.md`
  - `HEAD=11dfce72` 对 `9f2242ec^=d3f726e0` 的 `off` targeted perf 5 轮中位继续为正收益：
  - 当前实现：`p50=0.055ms`, `p95=0.105ms`, `avg=0.068ms`
  - 对照基线：`p50=0.072ms`, `p95=0.125ms`, `avg=0.088ms`

裁决：
- 这是明确正向收益
- 虽然绝对值很小，但命中的是 transaction 边界固定税，方向成立

### `P2 selector scratch reuse`

提交：
- `d8d0cbdf` `perf(selector): reuse invalidation scratch`
- `d3f726e0` `test(perf): add selectorgraph scratch evidence`

做了什么：
- 把按 root 的 selector candidate 索引前移到注册期稳定化
- 把 commit 时的 dirty-root 聚合改成可复用 scratch

收益证据：
- 贴边 micro-bench
  - `legacy.p95=7.592ms`
  - `optimized.p95=3.377ms`
  - `p95.ratio=0.445`
- 行为一致性
  - `scheduledLegacy=62543`
  - `scheduledOptimized=62543`

裁决：
- 这是明确正向收益
- 证据直接命中 `SelectorGraph.onCommit(...)` 的目标路径

### `P0-2 deferred worker HotSnapshot`

提交：
- `ee454288` `perf(txn): snapshot deferred worker hot config`

做了什么：
- 在 deferred worker 被启用时，提前快照：
  - `runtimeLabel`
  - `diagnosticsLevel`
  - `debugSinks`
  - `overrides`
  - `resolvedTxnLanePolicy`
- deferred worker 内环改成直接消费 snapshot
- 去掉每轮重复的：
  - `resolveTxnLanePolicy()`
  - `provideService(...)` 外壳组装

收益证据：
- 场景：`diagnostics=off`、`traitConvergeTimeSlicing.enabled=true`、`txnLanes.enabled=true`、`512` 个 deferred computed steps
- 中位对比：
  - `p50`: `39.626ms -> 39.127ms`
  - `p95`: `46.328ms -> 44.217ms`
  - `avg`: `41.352ms -> 40.243ms`

裁决：
- 这是明确正向收益
- 证据贴边命中 deferred flush 内环

### `P0-2 operation runner fast snapshot`

提交：
- `851bd66f` `perf(operation): snapshot empty default runner`

做了什么：
- 在 `ModuleRuntime.operation.ts` 增加默认空快照 fast path
- 在 `ModuleRuntime.impl.ts` 构造 `operationRunner` 时，预先解析默认 `OperationRuntimeServices`
- 只有默认值确实为空时，`runOperation(...)` 才跳过每次调用里的 `resolveOperationRuntimeServices()`

收益证据：
- 贴边 micro-bench：
  - `fast.p50=0.273ms`
  - `fast.p95=0.416ms`
  - `fast.avg=0.289ms`
  - `legacy.p50=0.520ms`
  - `legacy.p95=0.768ms`
  - `legacy.avg=0.564ms`

裁决：
- 这是明确正向收益
- 证据直接命中 `runOperation(...)` 的空默认路径

### `P0 runSession-local opSeq allocator fast path`

提交：
- `6ccb0631` `perf(logix-core): fast path runSession local opSeq allocator`

做了什么：
- 只覆盖 `middlewareStack.length===0` 且 `runSession` 存在的路径
- 在构造 `operationRunner` 时，把 `runSession.local` 和默认 `instanceId` 对应的 `opSeq` 分配器预先绑定进闭包
- 每次 `runOperation(...)` 不再重复走 `resolveOperationRuntimeServices()` 里的 `RunSessionTag` 读取
- 仍保留 `currentLinkId` 的按次读取，避免把链路传播语义做坏

收益证据：
- 贴边 micro-bench 直接命中 `middleware=empty + runSession=on + batch=256/1024` 路径
- 配套语义守门覆盖：
  - `opSeq` 单调递增
  - 不同 `instanceId` 的 key 不串
  - `linkId` 传播不变
  - `txnSeq / txnId` 回填不变

裁决：
- 这是明确正向收益
- 它是 `operation runner fast snapshot` 之后的次一级热路径专用快路径

### `P0-2 existing-link inline operation fast path`

提交：
- `bd006ee5` `perf(logix-core): inline existing-link operation runner fast path`

做了什么：
- 只覆盖 `runOperation(...)` 的一条窄路径：
  - `existingLinkId` 已存在
  - `middlewareStack=[]`
- 直接把 `currentOpSeq/currentLinkId` 注入 `eff`
- 跳过这条路径上的：
  - `baseMeta` 组装
  - `EffectOp.make(...)`

收益证据：
- 新增贴边 micro-bench：
  - `batch=1024`: `inline.avg=1.127ms`，`fallback.avg=1.185ms`，`saved=4.90%`
  - `batch=4096`: `inline.avg=4.317ms`，`fallback.avg=4.610ms`，`saved=6.36%`
- 语义守门：
  - `ModuleRuntime.operationRunner.FastPath.test.ts`
  - `Runtime.OperationSemantics.test.ts`
  - `FlowRuntime.test.ts` 中空 middleware 的 `opSeq` 语义守门
- 母线合入后相关测试与 `typecheck:test` 继续通过

裁决：
- `accepted_with_evidence`
- 这是 `P0-2` 族当前最窄、最贴边的一刀，后续若继续，只应考虑更广义的快照层

### `P0-2 transaction HotSnapshot`

提交：
- `a5ab0df1` `perf: snapshot transaction hot runtime services`

做了什么：
- 在普通 transaction 热路径里引入 `TxnHotSnapshot`
- 统一快照：
  - `runtimeLabel`
  - `diagnosticsLevel`
  - `debugSinks`
  - `overrides`
  - `resolvedTxnLanePolicy`
- 让普通 transaction 与 deferred backlog handoff 继续复用同一套热上下文思路

收益证据：
- worker 线内 targeted perf：
  - `return.avg`: `0.637ms -> 0.565ms`
  - `return.p50`: `0.571ms -> 0.539ms`
  - `return.p95`: `0.989ms -> 0.689ms`
- 母线复验：
  - `ModuleRuntime.transaction.HotSnapshot.test.ts`
  - `ModuleRuntime.TimeSlicing.Lanes.test.ts`
  - `ModuleRuntime.TxnLanes.Overrides.test.ts`
  - `TxnLaneEvidence.Schema.test.ts`
  - `typecheck:test`
  - `ModuleRuntime.transaction.HotSnapshot.Perf.off.test.ts`
- 母线当前样本：
  - `return.avg=0.640ms`
  - `return.p50=0.628ms`
  - `return.p95=0.761ms`

裁决：
- `accepted_with_evidence`
- 这刀把 `P0-2` 从“单点特例快路径”推进到“transaction 级热上下文快照”，后续若继续，应考虑更通用的 hot context 下沉

### `P0-2 transaction / operation shared hot context`

提交：
- `368ebc93` `perf(core): share txn operation hot context`

做了什么：
- 在 active transaction 上额外捕获 `operationRuntimeServices`
- `runOperation(...)` 优先复用 transaction 已捕获的 hot context
- 只继续收敛：
  - `RunSession`
  - `middlewareStack`
- 没有改：
  - `txnQueue`
  - `RuntimeStore`
  - `TickScheduler`
  - deferred worker 行为
  - 对外 API

收益证据：
- worker 线内贴边 micro-bench：
  - `batch=256`: `shared.avg=0.703ms`，`fallback.avg=1.031ms`，`saved=31.83%`
  - `batch=1024`: `shared.avg=3.002ms`，`fallback.avg=5.403ms`，`saved=44.44%`
- 母线复验：
  - `batch=256`: `shared.avg=1.407ms`，`fallback.avg=1.438ms`，`saved=2.14%`
  - `batch=1024`: `shared.avg=3.399ms`，`fallback.avg=4.808ms`，`saved=29.31%`
- 相关守门：
  - `ModuleRuntime.transaction.HotSnapshot.test.ts`
  - `ModuleRuntime.operationRunner.FastPath.test.ts`
  - `Runtime.OperationSemantics.test.ts`
  - `ModuleRuntime.TimeSlicing.Lanes.test.ts`
  - `ModuleRuntime.TxnLanes.Overrides.test.ts`
  - `TxnLaneEvidence.Schema.test.ts`
  - `typecheck:test`

裁决：
- `accepted_with_evidence`
- 这刀把 `P0-2` 继续推进到 transaction / operation 共享 hot context；若还要继续，优先考虑跳到更结构性的 `P1-1`

### `P1 whole-state fallback top-level dirty`

提交：
- `48a49420` `perf(dispatch): narrow whole-state fallback`

做了什么：
- 在 `StateTransaction.ts` 增加 `recordKnownTopLevelDirtyEvidence(...)`
- 在 `ModuleRuntime.dispatch.ts` 的两个 whole-state 写回分支接入这条入口
- 只覆盖：
  - plain reducer 的无 patchPaths 分支
  - `actionStateWriteback(kind:update)` 的 `pendingWholeStateWrite` 分支
- 一旦碰到 list root 或不可追踪 key，回退到旧的 `'*' + inferReplaceEvidence`

收益证据：
- 贴边 micro-bench：
  - `single`: `legacy.p95=0.020ms -> topLevel.p95=0.013ms`
  - `eight`: `legacy.p95=0.098ms -> topLevel.p95=0.021ms`
  - `many`: `legacy.p95=0.018ms -> topLevel.p95=0.018ms`
- 高层语义测试通过：
  - plain reducer 从 `dirtyAll=true` 收紧到 `dirtyAll=false, rootCount=1`
  - internal `actionStateWriteback(kind:update)` 同样收紧到 `dirtyAll=false, rootCount=1`

裁决：
- 这是明确正向收益
- 证据覆盖了语义和贴边 perf 两层

### `P1 no-trackBy list RowId gate`

提交：
- `23c616c3` `perf(logix-core): gate no-trackBy rowid reconcile`
- `29513007` `docs(perf): refresh no-trackby rowid gate evidence`

做了什么：
- 在 `packages/logix-core/src/internal/state-trait/rowid.ts` 新增 `canSkipNoTrackByListReconcile(...)`
- `validate.impl.ts` / `source.impl.ts` 的 no-trackBy list 路径先问 gate，再决定是否重复 `ensureList(...)`
- 明确保留 D-1 的 legacy 边界：commit-time `rowIdStore.updateAll(...)` 不改

收益证据：
- `validate` 贴边 bench
  - `rows=300`: `p50 0.060ms -> 0.022ms`，`p95 0.091ms -> 0.023ms`
  - `rows=1000`: `p50 0.138ms -> 0.048ms`，`p95 0.179ms -> 0.061ms`
- `source-like` 贴边 bench
  - `rows=300`: `p50 0.028ms -> 0.021ms`，`p95 0.049ms -> 0.031ms`
  - `rows=1000`: `p50 0.093ms -> 0.055ms`，`p95 0.106ms -> 0.069ms`
- 语义守门
  - `legacy.ensureListCalls = warmup + iterations`
  - `gated.ensureListCalls = 0`，本次复跑为 `70 -> 0`

裁决：
- 已升级为 `accepted_with_evidence`
- 当前母线口径以 D-3 收口结论为准
- 较早失败试探 `03ab1280` 仅作为历史试错记录保留

### `P0 post-commit slim path`

提交：
- `b3a74db5` `perf(runtime): slim post-commit path`

做了什么：
- 先打 `runPostCommitPhases(...)` 的公共壳
- 在满足以下条件时走更薄的提交后路径：
  - `diagnostics=off`
  - 无 `commitHub` 订阅者
  - 无 `rowId/list` 需要同步
  - 无额外 post-commit 观测需求

收益证据：
- module 路径：
  - `dispatchOnly.avg 0.078ms -> 0.075ms`
  - `dispatchOnly.p95 0.121ms -> 0.110ms`
- readQuery 路径：
  - `dispatchOnly.avg 0.080ms -> 0.067ms`
  - `dispatchOnly.p95 0.113ms -> 0.096ms`
- settle 指标同步下降

裁决：
- 这是明确正向收益
- 证据直接命中 post-commit 公共壳的减薄

### `P1 onCommit scheduler minimal envelope`

提交：
- `f41a7b89` `perf(runtime): tighten oncommit scheduler envelope`

做了什么：
- 只打 `ModuleRuntime.impl.ts` 里 `onCommit -> scheduler.onModuleCommit(...)` 这一小段
- `diagnostics=off` 时，不再为 scheduler 路径读取 `currentOpSeq`
- `diagnostics=off` 时，不再拼 `schedulingPolicy` 诊断包
- `tickSeq` 推进、module/readQuery 订阅更新、`diagnostics!=off` 路径保持原语义

收益证据：
- 基于 `b3a74db5` 的直接对照：
  - module：`dispatchOnly.avg 0.078ms -> 0.075ms`，`dispatchOnly.p95 0.121ms -> 0.110ms`
  - readQuery：`dispatchOnly.avg 0.080ms -> 0.067ms`，`dispatchOnly.p95 0.113ms -> 0.096ms`
  - settle 指标同步下降
- 母线合入后最小复验继续通过：
  - `ModuleRuntime.onCommitSchedulerEnvelope.test.ts`
  - `ModuleRuntime.postCommitSlim.test.ts`
  - `ModuleRuntime.onCommitSchedulerEnvelope.Perf.off.test.ts`
  - `python3 fabfile.py probe_next_blocker --json` 继续返回 `clear`

裁决：
- `accepted_with_evidence`
- 已合入母线，且没有把 current-head 重新带回 blocker 状态

### `P1-5 React selector activation grace hold`

提交：
- `93ad39fb` `perf(react): keep selector activation alive across short gaps`

做了什么：
- 只切 React 侧 selector external store 的 activation 生命周期
- 在 `RuntimeExternalStore.getRuntimeReadQueryExternalStore(...)` 上增加 `16ms` grace hold
- 短 listener gap 内复用已有：
  - `changesReadQueryWithMeta(...)`
  - `Stream.runDrain(...)`
  - selector store / topic 订阅

收益证据：
- worker 线内 targeted micro-bench：
  - `current.meanMs=1.614ms`
  - `baseline.meanMs=33.140ms`
  - `measuredActivationStarts=0 vs 2000`
- 母线复验：
  - `useSelector.sharedSubscription.test.tsx`
  - `useSelector.laneSubscription.test.tsx`
  - `useSelector.structMemo.test.tsx`
  - `packages/logix-react typecheck:test`
  - `useSelector.sharedActivation.microbench.ts`
- 母线当前样本：
  - `current.meanMs=1.973ms`
  - `baseline.meanMs=44.329ms`
  - `measuredActivationStarts=0 vs 2000`

裁决：
- `accepted_with_evidence`
- 这是 `P1-5` 的第一刀；后续若继续，优先考虑把 activation 生命周期继续下沉到 core-side retain/release

### `P1-5 core selector retain/release`

提交：
- 待当前 worktree 收口提交

做了什么：
- `RuntimeExternalStore` 在 static readQuery topic 上不再自己 `runDrain(changesReadQueryWithMeta(...))`
- core 内部新增 readQuery activation retain/release lease
- selector entry 生命周期改由 core retain/release 持有，React 侧只保留 topic facade 与 grace teardown

收益证据：
- `docs/perf/archive/2026-03/2026-03-17-p1-5-core-selector-retain-release.md`
- targeted micro-bench：
  - `current.meanMs=1.647ms`
  - `baseline.meanMs=38.093ms`
  - `measuredActivationStarts=0 vs 2000`

裁决：
- `accepted_with_evidence`
- `P1-5` 已完成从 React grace hold 到 core ownership 下沉的第二刀

### `P1-5 retain scope tax cut`

提交：
- 待当前 worktree 收口提交

做了什么：
- `SelectorGraph.ensureEntry(...)` 去掉外部 scope 依赖
- static selector retain 冷路径不再额外 `Scope.make()`
- release 不再关闭无效的临时 scope

收益证据：
- `docs/perf/archive/2026-03/2026-03-17-p1-5-retain-scope-tax.md`
- targeted micro-bench：
  - `current.meanMs=46.522ms`
  - `baseline.meanMs=59.826ms`

裁决：
- `accepted_with_evidence`
- `P1-5` 的第三刀只命中 retain/release 冷路径固定税，没有回滚前两刀语义

### `P1-5 selector entry reuse`

提交：
- 待当前 worktree 收口提交

做了什么：
- `SelectorGraph` 把 active entries 与 cached entries 分离
- 最后一个订阅者 release 后不再销毁 selector entry / hub
- 后续相同 selectorId 的 ensure 复用 cached entry / hub

收益证据：
- `docs/perf/archive/2026-03/2026-03-17-p1-5-selector-entry-reuse.md`
- targeted micro-bench：
  - `current.meanMs=4.152ms`
  - `baseline.meanMs=23.505ms`

裁决：
- `accepted_with_evidence`
- 这是 `P1-5` 的第四刀；当前下一类风险从“冷激活固定税”转成“cached entry 常驻增长”

### `P1 topic subscriber gate`

提交：
- `d3b950a7` `perf(topic-plane): gate unsubscribed topics`
- `afd0292d` `docs(perf): add topic gate evidence refresh`

做了什么：
- `module topic` 无订阅时，不再 `markTopicDirty`
- `readQuery topic` 无订阅时，不再 `markTopicDirty`

当前证据：
- 有直接回归测试，证明“无订阅 topic 不 bump version”
- 有贴边 micro-bench：
  - `commitTickModuleCurrent.mean = 1.226ms`
  - `commitTickModuleBaseline.mean = 2.035ms`
  - `commitTickSelectorCurrent.mean = 0.192ms`
  - `commitTickSelectorBaseline.mean = 0.476ms`
- 无订阅场景下，`moduleVersion / selectorVersion` 稳定为 `0`

裁决：
- 已升级为 `accepted_with_evidence`
- 当前证据足以证明它稳定降低了无订阅 topic 的 `commitTick/topic path` 纯开销

### `P1 topic fanout post-commit`

提交：
- `910334b1` `perf(topic-plane): defer listener fanout after commit`

做了什么：
- `flushTick(...)` 里先完成 snapshot / version bump / accepted drain 提交
- listener fanout 改成 tick 提交后统一执行
- 没有改 `RuntimeExternalStore.ts`

收益证据：
- module topic：
  - `listeners=64`: `legacyCommit.mean=0.0053609ms -> postCommit.mean=0.0005343ms`
  - `listeners=512`: `legacyCommit.mean=0.0179164ms -> postCommit.mean=0.0007407ms`
  - `listeners=2048`: `legacyCommit.mean=0.0587758ms -> postCommit.mean=0.0007333ms`
- readQuery topic：
  - `listeners=64`: `legacyCommit.mean=0.0019565ms -> postCommit.mean=0.0001036ms`
  - `listeners=512`: `legacyCommit.mean=0.0143534ms -> postCommit.mean=0.0001244ms`
  - `listeners=2048`: `legacyCommit.mean=0.0560033ms -> postCommit.mean=0.0003427ms`

裁决：
- 已接受
- 证据直接命中 `commitTick / flushTick` 临界区减薄

### `P1-7 react cache identity decouple`

提交：
- `e98d97d5` `perf(react): decouple module cache identity`
- `c67cafb5` `perf(react): decouple module cache identity`

做了什么：
- `ModuleCache` 身份从 `configVersion` 解耦
- `gcTime` 变化不再整仓 `dispose`
- 同时让 entry 的 `gcTime` 策略可以在命中时刷新

当前证据：
- 有明确回归测试，证明：
  - `gcTime` 从 `500` 到 `1500`，`configVersion` 仍是 `1`
  - `ModuleCache` 实例复用
  - `ModuleRuntime.instanceId` 复用
  - entry 的 `gcTime` 会更新
- 已补直接 boot/config churn 证据：
  - `cacheStable=true`
  - `disposeCount=0`
  - `distinctRuntimeCount=1`

裁决：
- 已升级为 `accepted_with_evidence`
- 现在可以把它算作“boot-time config churn 不再导致 cache dispose/runtime rebuild”的已证实收益

### `P1-6 defer preload plan unification`

提交：
- `84441052` `perf(react): unify defer preload plan`

做了什么：
- 把 `RuntimeProvider` 里 render 期 `syncWarmPreloadReady` 和 effect 期 `preload(...)` 的重复路径统一成共享 plan
- 新增 `preloadPlan.ts`
- 不碰 `ModuleCache.ts`、`useModule.ts`、`useModuleRuntime.ts`

收益证据：
- 直接相位证据测试通过
- 关键结果：
  - `layerAccessCount=1`
- 说明同一个 async preload handle 在 render 与 effect 间共用了同一份 plan

裁决：
- 已接受
- 这是继续推进 resolve engine 统一的最小正收益切口

### `P2 process moduleAction shared upstream`

提交：
- `7200f16e` `perf(process): share moduleAction upstream stream`
- `7eaa3ba6` `docs(perf): add throughput evidence for process shared upstream`

做了什么：
- 同一 `moduleId` 下的多个 `moduleAction` trigger spec 共享上游订阅
- 收敛 `actionsWithMeta$ / actions$` 的重复订阅

当前证据：
- 新增测试直接证明重复上游订阅已收敛
- 语义与回归通过
- 已补直接吞吐证据：
  - `legacy.subscribers=512`
  - `grouped.subscribers=1`
  - `legacy.p95=355.348ms`
  - `grouped.p95=2.290ms`
  - `p95GroupedOverLegacy=0.00644`

裁决：
- 已升级为 `accepted_with_evidence`
- 现在可以按正式收益计算

### `P1 externalStore single-field specialized path`

提交：
- `182c20ad` `perf(core): specialize externalStore single-field path`

做了什么：
- 给 `batch.length === 1` 的 externalStore 写回路径加了预编译 `fieldPath` accessor
- 单字段同步初始写回和 coordinator 单字段分支都复用它
- 运行时不再重复 `split('.')`

收益证据：
- `single-shallow`: `10.940541ms -> 8.465958ms`，ratio `0.7738`
- `single-deep`: `31.361750ms -> 28.340875ms`，ratio `0.9037`
- `same-value no-op`: `15.143750ms -> 8.188083ms`，ratio `0.5407`
- 邻近对照 `2 / 8 / 64 fields` ratio：
  - `0.9957 / 0.9868 / 0.9952`
- browser targeted suite：
  - `watchers=128/256/512` 的 `off/full` 全部 `status=ok`
  - `p95<=3ms` 全过
  - `full/off<=1.25` 的 `firstFailLevel=null`

裁决：
- 已接受
- 单字段高频路径已拿到稳定正收益，且邻近多字段路径与 browser suite 不回退

### `R3 react controlplane neutral config singleflight`

提交：
- 未合入代码
- 已合入 docs/evidence-only：
  - `f0ca598c` `docs(perf): record react controlplane singleflight failure`

做了什么：
- 尝试把 async、且对 config 无关的 `layerBinding` settle 场景收敛成 single-flight

当前证据：
- RED 稳定存在：会重复跑第二轮 async config snapshot load
- 但两类最小修复都会误伤 `gcTime / initTimeoutMs` 的动态刷新语义

裁决：
- 当前是明确失败
- 只能保留 docs/evidence-only

### `P1 externalStore draft primitive`

提交：
- 未合入代码
- 已合入 docs/evidence-only：
  - `d28808df` `docs(perf): record externalstore draft primitive failure`

做了什么：
- 尝试把 externalStore 写回从整 draft 重建改成事务内 draft mutate primitive

当前证据：
- `multi` 明显更快
- `single` 明显更差
- 收益不稳定

裁决：
- 当前是明确失败
- 后续若重开，应拆成：
  - 只优化 `single field`
  - 或只在 `batch size >= 2` 时启用

### `P1-3 externalStore large-batch-only`

提交：
- 未合入代码
- 本轮只保留 docs/evidence-only：
  - `docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`

做了什么：
- 尝试把 `P1-3` 收窄成 `batch.length >= 64` 才启用 accessor batch path
- `single / two / eight` 档位全部继续走 legacy

当前证据：
- targeted perf：
  - `multi-8 ratio = 1.015`
  - `multi-64 ratio = 0.683`
  - `multi-256 ratio = 0.676`
- 但主会话独立复核时，邻近回归失败 3 条：
  - `StateTrait.ExternalStoreTrait.Runtime.test.ts`
  - `ModuleAsSource.tick.test.ts` 两条

裁决：
- 当前是明确失败
- 这说明 large-batch-only 虽然比前两轮更像正确切口，但仍然碰坏了 externalStore / module-as-source 语义
- 只保留 docs/evidence-only，不合代码

### `P1-6 react defer preload unresolved-only`

提交：
- 未合入代码
- 已合入 docs/evidence-only：
  - `6c12fa98` `docs(perf): record unresolved-only preload failure`

做了什么：
- 尝试让 `RuntimeProvider` 在 `defer+preload` 的 effect 期只处理 render 期 `warmSync` 未命中的 handles
- 同时保留相位证据：
  - `planHandleCount`
  - `warmHitCount`
  - `effectPreloadCount`

当前证据：
- focused micro-bench `N=32/128`
- `effectPreloadCount` 从“接近整批”降到“只剩 unresolved”
- 但耗时没有变好：
  - `N=32`: `bootToReady 21.64ms -> 28.09ms`，`deferReady 15.92ms -> 21.08ms`
  - `N=128`: `bootToReady 23.75ms -> 30.85ms`，`deferReady 19.92ms -> 26.60ms`

裁决：
- 当前是明确失败
- 只保留 docs/evidence-only，不合代码
- 后续若重开，需要先解释“effect preload 计数下降但 ready 时间更差”的真实税点在哪里

### `P1 externalStore dual-path`

提交：
- 未合入代码
- 已合入 docs/evidence-only：
  - `1610ebac` `docs(perf): record externalstore dual-path failure`

做了什么：
- 尝试把 externalStore 改成双路径：
  - `batch.length === 1` 保持 legacy
  - `batch.length >= 2` 走 draft mutate primitive

当前证据：
- 放大样本后：
  - `single` 轻微变好
  - `two` 明显变差
  - `eight` 也没有稳定正收益

裁决：
- 当前是明确失败
- 不保留代码

### `P1 dispatch PatchAnchor precompile`

提交：
- 未合入代码
- 已合入 docs/evidence-only：
  - `7886e0dd` `docs(perf): record patchanchor precompile failure`

做了什么：
- 尝试只在 `dispatch / reducer` 热路径引入 `PatchAnchor` 预编译

当前证据：
- `single` 不稳定
- `8 fields` 局部正向
- `64 fields` 的 `p95` 明显更差

裁决：
- 当前不满足“明确且稳定正收益”门槛
- 保留为失败沉淀，不合代码

### `P1-1 single-field pathId 直写链`

提交：
- 未合入代码
- 已合入 docs/evidence-only：
  - `86056fa2` `docs(perf): record discarded p1-1 single-field pathid trial`

做了什么：
- 只试更窄的 `P1-1` 切口：
  - dispatch reducer 的单字段 path
  - externalStore single-field 的单字段 path
- 目标是让这两条链在进入 `StateTransaction.recordPatch` 前尽量直接写入 `FieldPathId`

当前证据：
- RED 明确命中缺口：
  - reducer 单字段仍收到 `['value']`
  - externalStore single-field 仍收到 `['value']`
- `typecheck:test` 和相关语义守门虽通过
- 但 reducer single-field A/B micro-bench 为明确负收益：
  - `fast.p95=0.136ms`
  - `slow.p95=0.068ms`
- externalStore 现有单字段 perf 本轮也没有给出足够硬的正收益

裁决：
- 当前是明确失败
- 不保留代码
- 若未来重开，只建议试 externalStore single-field 的一次性 `FieldPathId` 预取，不再做 reducer 侧运行时动态识别

### `P1 topicId minimal cut`

提交：
- 未合入代码
- 已合入 docs/evidence-only：
  - `d04f2243` `docs(perf): record topic id minimal cut failure`

做了什么：
- 尝试在 `RuntimeStore.ts` 内部引入稳定 `topicId`
- 给 `TickScheduler.ts` 做薄接线

当前证据：
- `RuntimeStore.commitTick` 贴边 bench：
  - `current.meanMs=0.02799`
  - `legacy.meanMs=0.00745`
- `TickScheduler` 邻近 topic 解析 bench：
  - `current.meanMs=17.639`
  - `legacy.meanMs=5.311`

裁决：
- 当前是明确失败
- 这版 `topicId minimal cut` 在目标路径上明显更慢

## 当前约束

1. 后续对外汇报时，只能把以下几条算作“已证实收益”
- `P0-1 txn fastpath`
- `P0-2 deferred worker HotSnapshot`
- `P0-2 operation runner fast snapshot`
- `P0 runSession-local opSeq allocator fast path`
- `P0-2 existing-link inline operation fast path`
- `P0-2 transaction HotSnapshot`
- `P0-2 transaction / operation shared hot context`
- `P2 selector scratch reuse`
- `P1 whole-state fallback top-level dirty`
- `P0 post-commit slim path`
- `P1 topic subscriber gate`
- `P1 topic fanout post-commit`
- `P1-7 react cache identity decouple`
- `P1-6 defer preload plan unification`
- `P2 process moduleAction shared upstream`
- `P1 externalStore single-field specialized path`
- `P1 onCommit scheduler minimal envelope`

2. 以下几条当前只保留为 `docs/evidence-only`
- `R3 react controlplane neutral config singleflight`
- `P1 externalStore draft primitive`
- `P1 externalStore dual-path`
- `P1 dispatch PatchAnchor precompile`
- `P1-1 single-field pathId 直写链`
- `P1 topicId minimal cut`

3. 若后续再有新的 provisional 线，只有补到硬证据后才能升级；在那之前，不得计入正式收益清单。
