# 2026-03-15 · v4-perf 后续尝试候选库

本页记录 current-head 已经 `clear` 之后，后续仍值得尝试的性能切口池。

它的职责只有两个：

- 给后续 agent / subagent 提供“还能砍什么”的稳定候选库
- 把这些候选和已关闭方向分开，避免下一轮又回去重踩旧路径

## 使用约束

1. 本页不是当前 backlog 状态源。
- current-head 的活跃排期仍以 `07-optimization-backlog-and-routing.md` 为准。

2. 本页不能单独触发开线。
- 是否允许重开 perf worktree，先按 `09-worktree-open-decision-template.md` 裁决。

3. 触发器成立后，再从本页选线。
- 若 `09` 里的 trigger 不成立，本页只保留为候选库，不进入当前排期。

4. 后续实验默认以 `v4-perf` 为母分支继续拉独立 worktree。
- 一刀一线。
- 成功和失败都按单提交收口。

## 2026-03-20 状态总览（母线口径）

说明：
- 这张表是候选池的 top 级状态真相源。
- 各候选详情段落按历史顺序保留，状态冲突时以本表为准。

| Top 级项 | 当前分类 | 当前口径（母线） | 证据锚点 |
| --- | --- | --- | --- |
| `P0-1` | 已吸收 | `txn fastpath` 与 `P0-1+ dispatch/txn outer-shell` 已吸收到母线 | `2026-03-15-v4-perf-wave1-status.md`、`archive/2026-03/2026-03-19-p0-1plus-dispatch-shell.md` |
| `P0-2` | 已吸收 | `HotSnapshot/hot-context` 族已吸收到母线 | `2026-03-15-v4-perf-wave1-status.md`、`archive/2026-03/2026-03-19-p0-2plus-hot-context.md` |
| `P0-3`（新增） | 当前 phase 已关闭 | `N-3` 已把 attribution 合同与 `reasonShare` 读取面吸收到母线；当前 phase 未再形成稳定唯一 nextcut，`N-0` 不再继续排期 | `docs/perf/archive/2026-03/2026-03-23-n-3-runtime-shell-impl.md`、`docs/perf/2026-03-23-current-phase-terminal-closeout.md` |
| `P1-1` | 部分吸收 | `P1-1.1` 已吸收；旧 `single-field pathId` 直写链为 docs-only 失败结论 | `2026-03-19-p1-1-1-fieldpathid.md`、`2026-03-15-v4-perf-wave1-status.md` |
| `P1-2` | 已吸收（继续扩面） | `whole-state fallback` 主线、v2/v3 与 `p1-2-wholestate-fallback-next`（mixed-known/unknown 收紧）已吸收；module-source 主线由 `P1-2.2c` 吸收，`P1-2.2b` 保留 docs-only；`p1-2-next-expansion` 未形成硬收益，按 docs/evidence-only 收口（无代码吸收） | `archive/2026-03/2026-03-19-p1-2-1-v3-state-write.md`、`archive/2026-03/2026-03-20-p1-2-wholestate-fallback-next.md`、`archive/2026-03/2026-03-19-p1-2-2c-module-source-tick.md`、`archive/2026-03/2026-03-20-p1-2-next-expansion-evidence-only.md` |
| `P1-3` | 部分吸收 | `draft primitive` 与 `large-batch-only` 维持否决；`P1-3R accessor reuse` 已吸收到母线 | `archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`、`archive/2026-03/2026-03-20-p1-3r-accessor-reuse.md` |
| `P1-4` | 已吸收（续线已收口到 `P1-4F`） | `P1-4B`、`P1-4C`、`P1-4F` 已吸收到母线；后续不再作为 future-only watchlist 保留 | `docs/perf/2026-03-21-p1-4b-module-pulse-hub-impl.md`、`docs/perf/archive/2026-03/2026-03-23-p1-4f-single-pulse-impl.md` |
| `P1-5` | 已吸收（已关闭） | selector activation retention 线已 closeout | `2026-03-17-p1-5-closeout.md` |
| `P1-6` | 已吸收（更大 full phase-machine 继续 future-only） | `G5`、`G6`、`P1-6'' owner-aware resolve engine` 已吸收到母线；后续仅保留更大的 `react controlplane phase-machine` trigger package watchlist | `docs/perf/2026-03-20-react-controlplane-phase-machine.md`、`docs/perf/2026-03-22-identify-react-controlplane-next-cut-post-g6-owner-resolve.md`、`docs/perf/archive/2026-03/2026-03-23-react-controlplane-full-phase-machine-nextcut-scout.md` |
| `P1-7` | 已吸收 | provider singleflight 显式分轨已吸收 | `2026-03-19-p1-7-provider-singleflight.md` |
| `P2-1` | 当前 phase 已关闭 | `P2-1A v5` 与 `P2-1B impl` 已吸收；后续 fresh reopen check 未形成 converge/lanes 的唯一切口，当前 phase 不再继续排期 | `archive/2026-03/2026-03-21-p2-1-env-ready-recheck.md`、`docs/perf/2026-03-23-current-phase-terminal-closeout.md` |
| `P2-2` | 部分吸收 | `P2-2A` 已吸收；`P2-2B` 为 rejected/docs-only | `2026-03-19-p2-2a-dispatch-plan.md`、`2026-03-19-p2-2b-dispatch-plan.md` |
| `P2-3` | 已吸收（分拆收口） | selector index v2 + process shared bus 已落地；后续只在新证据下再扩面 | `2026-03-19-p2-3-selector-index-v2-fix.md`、`2026-03-19-p2-3b-process-bus.md` |
| `P2-4`（新增） | 已吸收（observability） | `projection budget`、`dirty materialization` 与 `live budget visibility` 已落地 | `archive/2026-03/2026-03-20-p2-4-live-budget-visibility.md`、`2026-03-19-p2-4b-dirty-materialization.md` |
| `R-2`（独立 API 轨） | external-blocked | `R2-A`、`R2-B`、provider rollout/widening 与 `r2-controlplane-synergy` 已落地；`R2-U` trigger bundle 已齐，但当前唯一阻塞仍是外部 `SLA-R2` 输入 | `docs/perf/2026-03-22-r2-u-trigger-bundle-v1.md`、`docs/perf/2026-03-23-current-phase-terminal-closeout.md` |

wave2 补充（`2026-03-19`）：

- `react subscription residual` 识别后的 Top2 已吸收：
  - `2026-03-19-react-selector-multiplex.md`
  - `2026-03-19-selector-topic-eligible.md`
- 上述两条吸收后，top 级分类不新增新项，继续并入既有 `P1-5/P2-3` 收口口径。

## 三分分类快照（用于开线前快速判定）

已吸收（母线）：
- `P0-1`、`P0-2`、`P1-4`、`P1-5`、`P1-6`、`P1-7`、`P2-3`、`P2-4`
- wave2 新增吸收：`react selector listener multiplex`、`selectorTopicEligible` 覆盖提升（并入 `P1-5/P2-3`）

rejected/docs-only：
- `P1-3` 旧 `draft primitive / large-batch-only` 路线
- `P2-2B`（dispatch plan 的 rejected/docs-only 分支）
- `P1-1` 旧 `single-field pathId` 直写链（已保留为 docs-only 失败结论）
- `P0-3 / N-1 runtime-shell.freeze`（同机对照未形成硬收益，已回滚实现）

future-only（watchlist）：
- `R-2` public API proposal（仅在外部 `SLA-R2` 输入到位后重开）

## 候选详情

### `P0-1` · 边界事务直达 fast path

问题：
- 当前所有 transaction 入口在队列空闲时，仍完整走 `resolvePolicy -> backlog slot -> Deferred -> enqueue -> await baton`。
- 这笔固定税横跨 dispatch、watcher 写回、deferred flush、direct state writeback。

主要落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

为什么值：
- 这是当前最宽的横切固定税。
- 一刀能同时覆盖多条入口链。

风险：
- 会碰到 lane 公平性、backpressure、Provider overlay 语义。

API：
- 默认先不动公开 API。

### `P0-2` · HotEnv / RuntimeSnapshot 快照层

更新（2026-03-20）：

- `p0-2-hot-snapshot-next` 已按 `accepted_with_evidence` 收口。
- 切口：事务入口捕获并复用 `StateTransaction runtime snapshot`，把 `txnLanePolicy + traitConvergeConfig` 的重复 `serviceOption/provideService` 壳税压到一次捕获。
- 证据锚点：
  - `docs/perf/archive/2026-03/2026-03-20-p0-2-hot-snapshot-next.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.validation.json`

更新（2026-03-20, rollout-next）：

- `p0-2-rollout-next` 已按 `accepted_with_evidence` 收口。
- 切口：把 snapshot 快路径扩到相邻 resolver 入口，在 `txnLanePolicy/traitConvergeConfig` 引入 snapshot 对象级缓存，继续压缩重复 resolve/config shell。
- 相对 `v4-perf@e97ec6d3` 既有锚点（`speedup=1.289x`）提升到 `speedup=3.138x`。
- 证据锚点：
  - `docs/perf/archive/2026-03/2026-03-20-p0-2-rollout-next.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-rollout-next.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-rollout-next.validation.json`

更新（2026-03-20, operation-rollout）：

- `p0-2-operation-rollout` 已按 `accepted_with_evidence` 收口。
- 切口：把 runtime snapshot / resolve shell 复用扩到 `concurrencyPolicy` resolver（新增 snapshot capture + snapshot/object cache），同时把 resolve-shell 微基准扩展到该路径。
- expanded resolve-shell 结果：`noSnapshot.avg=0.715ms`，`snapshot.avg=0.302ms`，`speedup=2.368x`。
- 证据锚点：
  - `docs/perf/archive/2026-03/2026-03-20-p0-2-operation-rollout.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-rollout.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-rollout.validation.json`

更新（2026-03-20, operation-shell-next）：

- `p0-2-operation-shell-next` 已按 `accepted_with_evidence` 收口。
- 切口：把 snapshot / resolve-shell 复用继续下沉到 `ModuleRuntime.operation.ts`，新增 `OperationRuntimeSnapshot`、`resolveOperationRuntimeServices(snapshot?)` 与 `middlewareEnv + runSession` 维度的 canonical cache，压缩 fallback 路径重复壳层分配与 hot-context 重建。
- 贴边结果（相对 `v4-perf@97be4b0c`）：
  - `resolve-shell noSnapshot.avg: 0.715ms -> 0.633ms`
  - `resolve-shell snapshot.avg: 0.302ms -> 0.258ms`
  - `operationRunner batch=256 speedup: 1.452x -> 1.544x`
  - `operationRunner batch=1024 speedup: 1.497x -> 1.642x`
- 证据锚点：
  - `docs/perf/archive/2026-03/2026-03-20-p0-2-operation-shell-next.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.validation.json`

更新（2026-03-21, operation-empty-default-next recheck）：

- 本轮按 `docs/evidence-only` 收口，`accepted_with_evidence=false`。
- 复核结论：未发现遗漏的最小代码切口。`ModuleRuntime.operation/transaction` 与 `FastPath` 守门已在母线收口提交中。
- 最小验证全绿，`probe_next_blocker` 为 `clear`。
- 贴边复核结果：
  - `resolve-shell`：`noSnapshot.avg=0.626ms`，`snapshot.avg=0.256ms`，`speedup=2.442x`
  - `operationRunner`：`batch=256 speedup=1.526x`，`batch=1024 speedup=1.623x`
- 证据锚点：
  - `docs/perf/archive/2026-03/2026-03-21-p0-2-operation-empty-default-next.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p0-2-operation-empty-default-next.summary.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p0-2-operation-empty-default-next.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-21-p0-2-operation-empty-default-next.validation.json`

问题：
- `operation / txn / deferred slice` 周围反复做 `Effect.service / serviceOption / provideService / 配置合并`。
- 这些查找与 re-provide 更像解释器壳税，不是业务逻辑本身。

主要落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.traitConvergeConfig.ts`

为什么值：
- 同时覆盖 `off / light / full` 和多类入口。
- 很适合作为 transaction fast path 的第二刀。

风险：
- 容易把动态覆盖语义做扁。

API：
- 默认不需要。

### `P1-1` · PatchAnchor / `FieldPathId` token 化

更新（2026-03-20, `p1-1-patchanchor-next`）：

- 本轮按 `docs/evidence-only` 收口，分类：`discarded_or_pending`。
- 最小试探切口是“仅补齐 `dispatch/BoundApi` 里尚未 token 化的 producer-side patchPath array 预取”。
- 贴边 micro 证据显示负收益（`ratio=1.9815`，prefetched 慢于 raw），实现已全部回退，不保留代码改动。
- 证据锚点：
  - `docs/perf/archive/2026-03/2026-03-20-p1-1-patchanchor-next.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-1-patchanchor-next.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-1-patchanchor-next.validation.json`

补充（2026-03-21）：
- 广域 state-write/data-plane 复盘与“唯一建议下一线”见 `docs/perf/2026-03-21-identify-state-write-nextwide.md`。

问题：
- reducer、watcher、trait、external store 仍在热路径里做字符串扫描、路径归一化、list index evidence 提取。

主要落点：
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- `packages/logix-core/src/internal/state-trait/external-store.ts`

为什么值：
- 几乎所有高频状态写都能吃到。
- list-heavy、watcher-heavy 模块收益更大。

风险：
- 要锁住稳定 id、IR 锚点、list root 语义。

API：
- 纯内部实现可不改。
- 若向 `$` / `Ref` 暴露预编译 anchor，可能引出表层 API 调整。

### `P1-2` · whole-state fallback 收紧

更新（2026-03-20）：

- `p1-2-wholestate-fallback-next` 已按 `accepted_with_evidence` 收口。
- 收紧点：`recordKnownTopLevelDirtyEvidence` 从“全量 key 可映射才接受”调整为“部分已知 key 接受”，使 mixed-known/unknown 顶层变更不再整笔回退到 reducer `'*'` fallback。
- `p1-2-next-expansion` 对 `BoundApi.state.update` 做了 mixed-known/unknown 扩面试探，三轮采样结果未形成稳定正收益，且出现回摆；已按 failure gate 回滚实现，仅保留 docs/evidence-only。
- 证据锚点：
  - `docs/perf/archive/2026-03/2026-03-20-p1-2-wholestate-fallback-next.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.validation.json`
  - `docs/perf/archive/2026-03/2026-03-20-p1-2-next-expansion-evidence-only.md`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.evidence.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-next-expansion.validation.json`

补充（2026-03-21）：
- state-write 方向剩余空间与下一线建议已收敛到契约面收紧，见 `docs/perf/2026-03-21-identify-state-write-nextwide.md`。

问题：
- `kind:'update'` watcher 写回和无 patch sink 的 reducer 仍会落到 `'*'`，commit 时再做 replace evidence 推断。
- 这会把 O(1) 写入重新拉回 O(state width)。

主要落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`

为什么值：
- 一旦业务大量使用 `.update` 风格，这条税会很重。
- 同时影响 validate、selector、converge 的后续调度成本。

风险：
- 会压到一部分当前写法。

API：
- 大概率需要 forward-only 收紧。

### `P1-3` · externalStore 直接写 txn draft primitive

更新：

- 这条候选线已继续试到 `large-batch-only` 切口
- 当前统一结论见 `docs/perf/archive/2026-03/2026-03-17-p1-3-large-batch-only-discarded.md`

问题：
- `applyWritebackBatch` 当前即便单字段更新，也会 `readState + create(prevState) + updateDraft(nextDraft)`。

主要落点：
- `packages/logix-core/src/internal/state-trait/external-store.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

为什么值：
- raw externalStore 与 module-as-source 都能受益。
- 这是 external-store 链里最像真 runtime 税点的一刀。

风险：
- 会碰事务窗口、不变量、dirty evidence。

API：
- 可能需要内部 `txn.applyPatchBatch` 一类能力。

### `P1-4` · cross-plane pulse coalescing（bigger design v2）

更新：

- `2026-03-17-p1-4-normal-notify-shared-microtask-flush.md` 已给出失败结论：计数收敛成立，但 wall-clock 未形成正收益。
- `2026-03-20-p1-4-crossplane-topic-next.evidence-only.md` 已否决 `TickScheduler dirtyTopics single-pass classification` 的最小切口。
- `2026-03-21-p1-4-crossplane-bigger-design-v2.md` 已完成更大 cross-plane 识别，并把下一条 implementation-ready 线定义为 `P1-4B module-scoped pulse coalescing`。
- `2026-03-21-crossplane-pulse-topic-reactbridge-nextwide-identify.md` 已补充 nextwide 识别：Top1 继续锁定 `P1-4B-min`，Top2 新增 `P1-4C moduleInstance pulse envelope + selector delta payload`（docs/evidence-only）。
- 本轮 `probe_next_blocker` 为 `failure_kind=environment`，继续按 docs/evidence-only 收口，不保留代码改动。

问题：
- 旧小切口只覆盖单段成本，未覆盖 runtime 到 react bridge 的重复 pulse 税。
- module/readQuery 混合订阅场景仍可能在同 tick 内触发多次 bridge pulse。

主要落点：
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`（仅在诊断计数字段需要时触达）

为什么值：
- 目标从“每个 dirty topic 一次 pulse”收敛到“每个 moduleInstance 每 tick 一次 pulse”。
- 覆盖 module/readQuery 两类 topic，收益面大于旧小切口。

风险：
- 需要保证 pulse 合并后 topicVersion/priority 语义不漂移。
- 需要新增 bridge pulse 统计，维持可诊断性。

API：
- 保持内部重构，不改 public API。

### `P1-5` · selector retain/release + shared activation

更新：

- 这条候选线已在后续多刀里完成收口
- 当前统一结论见 `docs/perf/archive/2026-03/2026-03-17-p1-5-closeout.md`

问题：
- React readQuery store 首次订阅会 `Stream.runDrain(changesReadQueryWithMeta(...))`，相当于每个 selector store 常驻一条 fiber 和 stream 管线。

主要落点：
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

为什么值：
- selector 多时收益明显。
- 能同时减少 fiber 数、stream 开销、生命周期噪声。

风险：
- 需要把 retain/refCount 语义更明确地下沉到 core。

API：
- 可能需要内部 retain/release 能力。

### `P1-6` · React resolve engine 统一

更新：

- `2026-03-17-p1-6-boot-config-owner-conflict.md` 已把更窄的 `boot-epoch config singleflight` 尝试落成 blocker note
- 当前已确认的冲突是：
  - 若保证 async layer config 在首个 ready render 生效
  - 当前切口就不再满足原先的 `boot async trace count = 1`
- 因此这条更窄切口当前默认不记作 accepted
- 若未来继续推进 `P1-6`，应先把题目改成更准确的 owner-aware config refresh，而不是继续沿用这次小切口标题
- `2026-03-20-react-controlplane-phase-machine-stage-g-design.md` 已定义 Stage G 的最小可实施切口。
- `2026-03-20-react-controlplane-phase-machine-stage-g1-owner-lane-registry-adapter.md` 已完成 `G1` 实施并 `accepted_with_evidence`：
  - `config/neutral/preload` 已统一到同一 owner-lane registry 载体
  - `configLane ready` executor 继续保持 `legacy-control`
- `2026-03-20-react-controlplane-phase-machine-stage-g2-cancel-boundary-isomorphic.md` 已完成 `G2` 实施并 `accepted_with_evidence`：
  - preload `retainedCancels` 与 config/neutral cancel boundary 已同构合并
  - 三 lane phase-machine 事件统一 `cancelBoundary=owner-lane` 诊断字段
- `2026-03-20-react-controlplane-phase-machine-stage-g3-owner-lane-phase-contract.md` 已补齐 `G3` implementation-ready 设计包：
  - 下一层统一点落在 owner-lane phase contract 归约层
  - 当前保持 docs/evidence-only，等待 trigger 满足后实施
  - `G4` 边界已固化为“executor 收敛与潜在 public API proposal”分线处理
- `2026-03-21-react-controlplane-phase-machine-stage-g5-kernel-v0-evidence.md`、`2026-03-22-react-controlplane-stage-g6-kernel-v1.md`、`archive/2026-03/2026-03-23-p1-6pp-owner-resolve-engine-impl.md` 已把当前 implementation-ready 微切口吃完。
- `archive/2026-03/2026-03-23-react-controlplane-full-phase-machine-nextcut-scout.md` 已把后续方向收敛为：先补 full phase-machine trigger package，再判断是否值得开更大的 controlplane 重建线。
- `2026-03-23-current-phase-terminal-closeout.md` 已把更大的 full phase-machine 定位改写为“当前 phase 终局关闭”，后续只有在新症状或新产品级目标出现时才允许重开。

问题：
- `read / readSync / warmSync / preload` 是四套近似状态机。
- `RuntimeProvider / useModule / useModuleRuntime` 又在外面再分流一遍。

主要落点：
- `packages/logix-react/src/internal/store/ModuleCache.ts`
- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/hooks/useModule.ts`
- `packages/logix-react/src/internal/hooks/useModuleRuntime.ts`

为什么值：
- 这是 React 侧最大的结构税。
- 同一 handle 的快路径与生命周期可以被统一。

风险：
- Promise suspension、preload cancel、retain handoff 语义重写成本高。

API：
- 大概率需要。

### `P1-7` · Provider 单飞化 + cache identity 解耦

问题：
- render/effect 会重复探测 config 和 preload。
- `gcTime` 变化还会整仓 dispose cache。

主要落点：
- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/store/ModuleCache.ts`

为什么值：
- 直接减少 boot churn 和大面积重渲染。
- 与 `P1-6` 能形成配套。

风险：
- 失效时机、热更新、GC 策略切换都要重裁。

API：
- 可选。

### `P2-1` · deferred converge continuation

更新（`2026-03-20` / `2026-03-21`）：

- `P2-1 next-stage` 接手线已按 `discarded_or_pending` 收口，仅保留 docs/evidence。
- 当前没有新的硬收益证据，不保留该线代码改动。
- 收口锚点：`archive/2026-03/2026-03-20-p2-1-next-stage-evidence-only.md`
- `P2-1 fresh reopen check` 已执行，结果为 trigger 不成立。
- reopen check 锚点：`archive/2026-03/2026-03-20-p2-1-reopen-check.md`
- `P2-1 env-ready fresh reopen check` 已确认环境就绪，但 `probe_next_blocker` 失败点仍是 `externalStore` residual gate noise，未形成 `P2-1` 唯一最小切口。
- env-ready recheck 锚点：`archive/2026-03/2026-03-21-p2-1-env-ready-recheck.md`
- `2026-03-23-current-phase-terminal-closeout.md` 已把 `P2-1` 定位改写为“当前 phase 已关闭”。

问题：
- time-sliced converge 的每个 slice 都会重开 `enqueueTransaction -> runOperation -> runWithStateTransaction`。
- slice 间重复付事务壳税。

主要落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`

为什么值：
- 对大图、deferred steps 多的模块收益很可能很高。

风险：
- `txnSeq / opSeq / replay / lane evidence` 都会被波及。

API：
- 很可能需要内部协议级变化。

### `P2-2` · DispatchPlan 预编译

问题：
- 每次 dispatch 仍动态做 action 分析、reducer/writeback 查找、topic hub fanout 分组。

主要落点：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`

为什么值：
- 调用面极广。
- 属于“把解释成本前移到安装期”。

风险：
- late registration 和动态 action 语义要收紧。

API：
- 可选。

### `P2-3` · selector invalidation index v2 + process shared bus

问题：
- `SelectorGraph.onCommit` 仍在 commit 时构造 `dirtyRootsToProcessByRoot`。
- process 安装又会为每条 trigger 分别建 stream、wrap dispatch、`mergeAll`。

主要落点：
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/src/internal/runtime/core/process/concurrency.ts`

为什么值：
- 同时覆盖 selector 与 process 两条链。
- 对复杂业务流程和 readQuery 密集场景都有帮助。

风险：
- 这条线跨模块比较广，实施时要严格拆刀。

API：
- 可选。

## 已排除方向

1. 不再把 `watchers.clickToPaint` 继续当 runtime 主线。
- 现在更像 suite / browser floor 语义问题。

2. 不再回到 `txnLanes` 的 queue-side 微调。
- 包括 `handoff-lite`、`visibility window`、`urgent-aware v3/v4`、`budgetMs/chunkSize` 一类旧路线。

3. 不再把 `dispatchActionRecord / dispatchActionCommitHub / txnPrelude / queue resolvePolicy` 当残余主因。
- `dispatch shell` probe 已排除。

4. 不再把 `scheduleTick startImmediately` 当成仍未收口的主线。
- `U-1` 已经收口 externalStore 主债。

5. 不再优先回到 `bootResolve.sync` 的旧小固定税叙事。
- RAF 轮询语义已经被剥离。

## Future-only 默认路由（2026-03-20）

当前 `current-head=clear_unstable`，future-only 池没有“默认第一刀”。

触发器成立后，按下面顺序裁决：

1. `P1-3R`：仅在 `externalStore large-batch` 再次成为可复现主税点时重开。
2. `P2-1`：仅在 `converge/lanes` 再出现稳定 residual，且 fresh 最小验证命令不含 environment 失败时推进下一扩面。
3. `R-2`：仅在新增产品级 SLA 与可解释证据同时成立时，进入 public API proposal（docs/evidence-only）。
