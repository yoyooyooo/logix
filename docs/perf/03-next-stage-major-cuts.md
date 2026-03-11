# 03 · 下一阶段定向大改（持续维护）

本文件是执行裁决，不是讨论稿。默认目标：不计代价，优先性能上限与稳定性。

状态治理约定：本页只维护“还做不做”与“这刀具体是什么”；`R-1` 的当前路由、并行规则、以及已完成/已关闭副线的现状统一以 `docs/perf/07-optimization-backlog-and-routing.md` 为准。

编号说明：本页沿用 major-cut 历史编号；与 `07` 的 routing track 编号不是同一命名空间。例：本页 `F-1` = DevtoolsHub ring buffer，`07` 的 `F-1` = perf `fabfile.py` 自动化。

## 状态（作为任务清单维护）

说明：每一刀必须独立提交；做完一刀就把对应条目勾上，并在 `docs/perf/05-forward-only-vnext-plan.md` 同步状态。

- [x] A-1：Devtools full 懒构造（lazy materialization）+ Trace gate（`traceMode`）。
- [x] A-2：externalStore full/off 方差收敛（`traceMode=off` 时提前 `onCommit`，避免 full 延迟 notify）。
- [x] B-1：externalStore 批处理写回（同 module 写回 txn 合并）。
- [x] C-1：`Ref.list(...)` 自动增量（txn evidence -> `changedIndices`）。
- [x] D-1：DirtySet v2（统一索引证据协议）。
- [x] D-2：SelectorGraph/Converge 证据消费收口（`TxnDirtyEvidenceSnapshot`）。
- [x] E-1：mutative patchPaths 保留索引证据（array path -> listIndexEvidence；减少 list validate 降级）。
- [x] F-1：DevtoolsHub 事件窗口 O(1) ring buffer（去 `splice` trimming 抖动；full 诊断更稳）。
- [x] G-1：整状态替换推导 dirty evidence（`path="*"` 不再立刻 dirtyAll；commit-time best-effort diff 推导顶层 key/list evidence）。
- [x] G-2：整状态替换推导 if_empty（当 txn 已有精确 dirty evidence 时跳过推导，避免 perf harness 纯 overhead）。
- [x] H-1：converge(off-fast-path) perf hint 保留 + 冷启动样本隔离（并记录 fast_full guard 的失败尝试与回滚）。
- [x] H-2：negativeBoundaries.dirtyPattern 增加 `minDeltaMs=0.1`（sub-ms 相对预算地板），让 gate 可复测可执行。
- [x] I-1：`$.state.update/$.state.mutate` 批处理写回（生产态 microtask 合批 + in-flight drain，同 burst 收敛到 batched txn），优先打穿 `watchers.clickToPaint` 的 txn 固定成本。
- [x] J-1：`txnLanes.urgentBacklog` 改成显式 `mode(default/off)` 轴（evidence alignment）；broad matrix 不再依赖隐式 `forced_off` 默认值。
- [x] K-1：`react.strictSuspenseJitter` 改成真实 state-level suspend + 单次 interaction 计时（evidence correction）；不再把多次点击总耗时误判成 suspense jitter。
- [x] L-1：`txnLanes` 在 `budgetMs<=1` 时把 non-urgent 首片缩到 1（inner-loop constant cut）；`mode=default` 的 50ms 硬门从全灭提升到 `steps<=800` 可过。
- [x] M-1：`suspend` 路径加入 optimistic sync fast-path（行为前移优化）；`react.bootResolve` 的 `suspend` 冷启动从 `~320ms` 级降到 `~17-19ms`。
- [x] N-1：`defer` 增加 render 前 sync-warm 预热（行为前移优化）；去掉同步模块的 provider preload gating fallback，`bootToReady` 从 `~345ms` 级降到 `~60ms`。
- [x] O-1：纯 state action watcher 并回原 action txn（watcher→action fusion）；`watchers=512` 从 `~85-95ms` 级压到 `~50-55ms`。
- [x] O-2：纯 state action watcher 直接写 draft（watcher→action direct writeback）；`watchers=512` 进一步压到 `~36-43ms`，strict 下 `50ms` 线打穿到 `512`。
- [x] P-1：`txnLanes.urgentBacklog` 改成 click-anchored 计时（evidence correction）；去掉 timer 排队噪声，`mode=default, steps=2000` 已进 `50ms`。
- [x] Q-1：`converge auto->full (near_full)` 改成 slim decision summary（保留 evidence、去掉重资产）；`dirtyRootsRatio=1, steps=2000` 的 `auto<=full*1.05` 已回到门内。
- [x] R-1：`txnLanes` backlog policy split（历史 runtime 主线，已由 `S-10` native-anchor benchmark cut 收口；不再继续 queue-side runtime cut）。
  - 保留 `2026-03-06` 的失败/checkpoint 锚点：`docs/perf/2026-03-06-r1-txn-lanes-startup-phase-checkpoint.md`、`docs/perf/2026-03-06-r1-txn-lanes-handoff-lite-failed.md`、`docs/perf/2026-03-06-r1-txn-lanes-phase-split-failed.md`、`docs/perf/2026-03-06-r1-txn-lanes-urgent-aware-v3-failed.md`、`docs/perf/2026-03-06-r1-txn-lanes-invoke-window-failed.md`。
  - 正式收口记录：`docs/perf/2026-03-06-s10-txn-lanes-native-anchor.md`。


## Current-Head 裁决（2026-03-06，含 `S-11` blocker probe 回写）

证据锚点：
- `ulw123.current-head.full-matrix`：broad/current-head 盘面。
- `ulw124.external-store-current.targeted`：`externalStore` targeted 复核。
- `ulw120.watchers-direct-writeback.targeted`：`watchers` 最强 targeted。
- `s10 native-anchor targeted/recheck/confirm`：`txnLanes` native-anchor 三轮 targeted 收口证据。
- `docs/perf/2026-03-06-s11-post-s10-blocker-probe.md`：post-S10 real probe；remaining browser blocker queue 已清空。

四分法：
1. 默认 runtime 主线已清空：`S-11` real probe 对 remaining browser blocker queue 给出 `next_blocker: none`，current-head 不再存在新的默认 runtime 第一失败项。
2. 已由 benchmark 纠偏关闭：`txnLanes.urgentBacklog`。`S-10` 把 suite 改成 `nativeCapture -> MutationObserver DOM stable` 后，`mode=default/off` 的 `urgent.p95<=50ms` 都稳定通过到 `steps=2000`；`S-11` 进一步确认它不应继续留在默认 blocker probe 队列里。
3. 证据/benchmark 候选：`watchers.clickToPaint`。它仍更像 suite 语义混入 browser floor，而不是 current-head 的 runtime 主 blocker。
4. 已完成 residual audit 并关闭：`externalStore.ingest.tickNotify / full-off`。broad `watchers=256` 单点红样本已被 clean targeted audit 复核为 residual/noise，且 `S-11` real probe 继续通过。

当前路由裁决：
- `R-1` 已关闭，当前不再保留新的 `txnLanes` queue-side runtime 下一刀。
- 当前也没有新的默认 runtime 后继；若要继续推进，只能在 `S-2` benchmark 解释链或 `R-2` 架构/API 候选里显式选线。
- 当前执行路由与并行规则统一见 `docs/perf/07-optimization-backlog-and-routing.md`。
- 这里只保留 current-head 裁决：不要再继续拧 `budgetMs/chunkSize` 小常数。`txnQueue.*` observation 与 native-anchor 证据都显示，旧主延迟不在 queue 内；blind first-host-yield、handoff-lite、remembered-pressure pre-urgent cap、以及 post-urgent visibility window 已明确判失败。
- `dispatchShell.fixedCost` 的 follow-up current-head 证据表明：
  - `dispatchActionRecord / dispatchActionCommitHub / txnPrelude / queueResolvePolicy` 都不是 residual 主因
  - browser trace 已到时钟分辨率地板，继续拆这条线时优先用 Node 微基线而不是再堆 browser sub-phase
  - 当前 residual 更像 `enqueueTransaction` 外层 await / Effect 解释器成本；不要再先砍 inner txn body

当前不建议先做：
- `watchers`：先修 suite 语义，不再继续往 runtime 里塞 watcher 优化。
- `converge`：先修 gate 表达，把 `notApplicable` 从失败视图剥离。
- `externalStore`：`S-1` 已按 residual/noise 关闭；除非后续出现新的 clean/comparable 连续复现证据，否则不要重开。

## A 刀（优先级 P0）：full 诊断懒构造

目标：
- 把 full 诊断从“提交时重构造”改成“消费时构造”。

核心做法：
1. `state:update` 提交路径只保留 slim anchor：
- `moduleId/instanceId/txnSeq/txnId/opSeq/dirtySet摘要/hash`
2. 重 payload（state/traitSummary/replay）改为按需 materialize。
3. DevtoolsHub 只存可序列化轻对象和定位锚点。

收益预期：
- 直接降低 `externalStore.ingest.tickNotify` 的 `full/off`。

风险：
- Devtools 回放/时间旅行协议需要同步调整。

## B 刀（优先级 P0）：externalStore 批处理写回

目标：
- 从“每 callback 一笔 txn”改为“同窗口批处理 txn”。

核心做法：
1. 对同 module 的 externalStore 更新做 “in-flight 合并”：同一时刻同一 module 只允许一个 writeback txn in-flight。
2. 写回窗口内 burst 更新合并为更少的 transaction（通常 1~2 笔），减少每笔 txn 的固定成本。
3. 不引入额外 microtask 边界（避免把单次更新 latency 变差）；合并主要发生在 txn 背压/高频输入下。

实现细化（确定性，不再讨论）：
- 内核引入 `per-module externalStore writeback coordinator`：
  - key：`RuntimeInternals`（同 module 同 instance 共享）；
  - value：`pendingWrites(Map<fieldPath, { nextValue, traitNodeId, normalizedPatchPath, isEqual, commitPriority }>)` + `inFlight` 单 flush 锁。
- raw external store（manual/service/subscriptionRef/stream）触发写回时不再直接 `runWithStateTransaction`：
  - `inTxn=true`：仍立即写 draft（保持事务内语义）。
  - `inTxn=false`：enqueue 到 coordinator；由第一个 caller 在当前 fiber 内 drain queue（single-flusher），在 txn 里应用 pendingWrites。
  - fast-path：coordinator 无 backlog 时仍同步跑单笔 txn（保持 baseline latency）；只有出现 in-flight/backlog 才进入合并路径。
- Module-as-Source（DeclarativeLinkRuntime.applyForSources）保持“立即 writeback”：
  - 原因：TickScheduler fixpoint 依赖 `applyValue` 在同 tick 内立刻产生 commit 并回灌 queue；延迟会引入跨模块 tearing。
- 事务 originName 规则：
  - 单 field：`origin.name=fieldPath`（保持可诊断性与既有测试直觉）。
  - 多 field：`origin.name='externalStore:batched'`（具体写回路径靠 patches/dirty evidence 解释）。
- Perf 验收必须用现有 suite 防回归；如后续仍需继续榨干，可追加“burst 写回”专用 perf-boundary 证明 batching 覆盖率。

收益预期：
- 降低 per-txn 固定成本，显著减少高频输入下抖动。

风险：
- 写回可见时序从“同步即刻”变成“窗口最终一致”。

## C 刀（优先级 P1）：Ref.list 自动增量

目标：
- `Ref.list(...)` 默认吃到 `changedIndices`，不依赖调用方拆 `Ref.item(...)`。

核心做法：
1. 在 transaction 里沉淀 index-level hint（来自 patch path/valuePath）。
2. validate list-scope 默认读取该 hint 走增量分支。
3. 无法推导时显式降级 full（并产出可解释 degrade reason）。

实现细化（确定性，不再讨论）：
- `StateTransaction` 增加 list-index 证据通道（不依赖 diagnostics full）：
  - 由 `recordPatch(path:string)` 在检测到 numeric segment / bracket index 时提取索引证据：
    - key：`listInstanceKey = "${listPath}@@${parentIndexPath}"`（与 validate 的 `toListInstanceKey` 同口径）
    - value：`Set<changedIndex>`
  - 同时记录 `listRootTouched(Set<listInstanceKey>)`：当 patch 直接命中 list root（结构可能变化）时禁用增量 hint。
  - dirtyAll/unknownWrite 时一律禁用增量 hint（正确性优先）。
- `validate.impl.ts`：
  - 当 validate target 为 `list`（即 `Ref.list(...)`）时，优先从 txn list-index evidence 取 `changedIndices`；
  - 若命中 `listRootTouched` / dirtyAll / 无证据，则降级 full（`changedIndices=undefined`）。

收益预期：
- list/form 场景普遍减少 O(n) 扫描，降低 p95。

风险：
- patch 语义与 validate 证据结构要扩展。

## D 刀（优先级 P1/P2）：DirtySet v2（统一索引证据协议）

目标：
- 把 index-level 脏证据升级为内核统一协议，供 converge/validate/selector 共用。

核心做法：
1. 在 root-level dirtySet 之外增加 list-index delta 通道。
2. 统一消费接口，去掉各子系统重复路径解析。

实现细化（确定性，不再讨论）：
- 内核统一产出 `TxnDirtyEvidence`（只在事务窗口有效，禁止持久化引用）：
  - root-level：`dirtyAllReason | dirtyPathIds(Set<FieldPathId>) | dirtyPathsKeyHash/keySize`
  - list-level：`listIndexEvidence(listInstanceKey -> changedIndices)` + `listRootTouched(listInstanceKey)` + `listItemTouched(listInstanceKey -> indices)`
- `validate.impl.ts`：
  - 用 `ctx.txnDirtyEvidence?.list` 替代 `ctx.txnIndexEvidence`；
  - list-scope / item-scope 的 `changedIndices` 读取统一走 evidence（优先 request-scoped，回落 txn-scoped）。
- `rowId.updateAll` 的触发条件从“任何 list 子字段变化都更新”收敛到“结构变化/trackBy 变化才更新”：
  - 结构变化：dirtyRoot 是 listPath 的 prefix（含相等，覆盖 parent list reorder 对 nested list 的影响）
  - trackBy 变化：dirtyRoot overlaps `listPath + trackBy`
  - 其它 list 子字段变化（例如 `items.warehouseId`）默认 **不触发** `updateAll`
  - 目的：避免每次 row edit 都跑 O(n) RowId reconcile（这是 `form.listScopeCheck` 的隐藏大头）

收益预期：
- 最大化长期上限，减少重复计算与多处漂移。

风险：
- 破坏性重构面较广，需要分阶段切换。

### D-2（已做）：SelectorGraph/Debug/RowId 去 DirtySet（统一消费 TxnDirtyEvidenceSnapshot）

目标：
- 彻底移除 commit 热路径里 `dirtyPathIdsToRootIds(...)` 的排序/前缀消除成本（尤其是 full 诊断下的额外固定成本）。

核心做法：
1. committed txn 不再构造 `DirtySet(rootIds/keyHash)` 作为热路径输入；
2. 统一改为 snapshot `dirtyPathIds + dirtyPathsKeyHash/size + dirtyAllReason`（commit-time 一次性拷贝）；
3. `SelectorGraph.onCommit` / `RowId.shouldReconcile...` 直接消费 `dirtyPathIds`，用 `upsertDirtyRoot` 做 per-rootKey 的最小化（不排序）；
4. `state:update.dirtySet` 证据结构改为 `pathIdsTopK`（不再强制 rootIds），Devtools 用 registry 反查即可。

证据与实现记录：
- `docs/perf/2026-03-05-d2-dirtyevidence-snapshot.md`

## 如未来重开 vNext 的建议顺序

`S-11` 已确认 current-head 无默认 runtime 主线；下列顺序只在 future evidence / 新 SLA 明确要求 forward-only vNext 时启用，不代表当前默认排期。

1. A 刀
2. B 刀
3. C 刀
4. D 刀
5. E 刀

顺序理由：
- 当前没有默认 P1 runtime 阻塞；A/B/C/D/E 只保留为 future vNext 候选顺序；
- C 提升适用面；
- D 作为统一内核基础设施收口。
- E 继续压榨 list/form 场景：让 mutative 的 patch 路径也能产出 index evidence，提升增量化覆盖率。

## E 刀（优先级 P1）：mutative patchPaths 的索引证据

目标：
- 让通过 `mutative` 生成的 patchPaths（当前会丢掉数组索引）也能喂给 transaction 的 `listIndexEvidence`；
- 提升 `Ref.list(...)` 增量化覆盖率，减少 form/list 校验链路的 “无证据 → full” 降级。

核心做法（确定性，不再讨论）：
1. `mutativePatches.toPatchFieldPath`：把 patch path 里的数组索引（number）转换为数字字符串（如 `3 -> "3"`），并保留到 patchPaths 证据里（而不是直接丢弃）。
2. `StateTransaction.recordPatch`：对 array path 追加一条轻量 `recordListIndexEvidenceFromPathArray(...)` 分支：
   - 扫描 segments，识别数字段作为 index；
   - 生成与 string path 同口径的 `listInstanceKey`（`<listPath>@@<parentIndexPathKey>`）与 `changedIndices`；
   - 同时标记 listRootTouched（当 patch 命中 list root）。
3. dirtyPathId 仍沿用现有策略：通过 `normalizeFieldPath` 过滤掉数字段（索引），以 field-level id-first 作为 converge/selector 的稳定锚点。

证据与实现记录：
- `docs/perf/2026-03-05-e1-mutative-index-evidence.md`

## API forward-only 演进建议

1. `RuntimeOptions.stateTransaction`
- 新增：`diagnosticsMaterialization: 'eager' | 'lazy'`
- 建议默认：`lazy`

2. `StateTrait.externalStore`
- 新增：`writebackMode: 'sync' | 'batched'`
- 新增：`writebackWindow: 'microtask' | { budgetMs: number }`
- 建议默认：`batched + microtask`

3. validate 调用语义
- `Ref.list(...)` 默认自动增量化（由 txn evidence 驱动）
