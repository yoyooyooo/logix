# 2026-03-22 · cross-plane single pulse contract nextwide scout（docs/evidence-only，implementation-ready）

> 后续状态更新（2026-03-22 同日）：`P1-4F` 已完成 implementation-ready 检查，当前结论更新为 `not-ready`，继续 docs/evidence-only；主要 blocker 为 selector interest contract、readQuery activation retain 生命周期、`useSelector` 单订阅路径合同，见 `docs/perf/2026-03-22-p1-4f-min-single-pulse-contract-not-ready.md`。

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.scout-crossplane-single-pulse-contract`
- branch：`agent/v4-perf-scout-crossplane-single-pulse-contract`
- 唯一目标：在 `logix-core state write/external store -> logix-react RuntimeExternalStore/useSelector` 链路中，识别 `P1-4C` 之后更高收益的结构性下一刀。
- 写入范围：`docs/perf/**`、`specs/103-effect-v4-forward-cutover/perf/**`
- 禁区遵守：未改 `packages/**` 实现代码。

## 输入基线

- `docs/perf/README.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
- `docs/perf/2026-03-21-crossplane-post-p1-4c-nextwide-identify.md`
- `docs/perf/2026-03-22-p1-4d-min-single-path-cleanup.md`
- 只读代码锚点：
  - `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
  - `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
  - `packages/logix-react/src/internal/hooks/useSelector.ts`

## 只读事实核验

1. 当前代码基线已是 single-path。
- 在 `packages/logix-core/**` 与 `packages/logix-react/**` 未发现 `LOGIX_CROSSPLANE_TOPIC` / `crossPlaneTopicEnabled` 分支。
- `TickScheduler` 与 `RuntimeExternalStore` 都固定走 `RuntimeStore` topic 接口。

2. `P1-4C` 的 module 级 envelope 已落地，仍保留“fanout 后重复调度”结构税。
- `TickScheduler.onModuleCommit` 会标记 module topic dirty。
- `TickScheduler.onSelectorChanged` 会对每个活跃 selector topic 执行 `markTopicDirty`。
- `RuntimeStore.commitTick` 仍按 dirty topic 粒度回放 listener snapshot。
- `RuntimeExternalStore` 的 `modulePulseHub` 在 `requestPulse` 之后合并，同一 tick 的重复回调依然要先进入 `onRuntimeStoreChange -> scheduleNotify -> requestPulse`。

3. `useSelector` 的多路订阅去重仍停在“同 store 维度”。
- `subscribeRuntimeExternalStoreWithComponentMultiplex` 只对 `componentOwner + store` 去重。
- 同一组件多个 selector（多个 readQuery store）会形成多条 lead listener 路径。
- envelope 的 `selectorDelta` 能减少重算次数，无法消除 store 级回调扇出。

## 真实瓶颈定位（P1-4C 之后）

当前更值得继续降税的点在 cross-plane 合同层：

- 真实税点：`dirtyTopics fanout` 结束后，bridge 侧仍按 topic/store 重复调度与重复 `shouldNotify`。
- 非主税点：`single-path` 清理本身。该项在当前代码基线已完成，继续投入的边际收益偏低。

这条瓶颈同时横跨 core/react 两侧，且与 `externalStore.ingest.tickNotify` 的 `edge_gate_noise` 判定不冲突，属于结构开销问题。

## Top2 方向（本轮结论）

### Top1（唯一建议下一刀）：`P1-4F-min core->react single pulse contract`

一句话：把 `RuntimeStore -> RuntimeExternalStore` 的通知合同从“按 topic listener fanout 驱动”升级为“按 module pulse packet 驱动”，让 React 侧收敛到单订阅路径。

最小切口定义（提案）：

- core 侧新增 `ModulePulsePacket`（单一 Slim 可序列化合同）：
  - `moduleInstanceKey`
  - `tickSeq`
  - `priorityMax`
  - `topicDeltaCount/topicDeltaHash`
  - `selectorDelta`（保守 membership，允许误报，禁止漏报）
- `TickScheduler/RuntimeStore` 在 tick commit 阶段按 module 聚合 packet，并提供 module 级订阅出口。
- `RuntimeExternalStore` 改为 module 级单订阅输入。
- `useSelector` 继续用 `selectorDelta + equalityFn` 保守 gating，移除对 readQuery topic store fanout 的依赖。

为什么是跨模块统一降税：

- core 侧：减少 dirty topic 粒度 listener 回调压力。
- react 侧：减少 `requestPulse` 调用次数、store 级 lead listener 扇出、`shouldNotify` 重复判定。
- 诊断侧：`PulseEnvelope` 与 `ModulePulsePacket` 对齐后，解释链锚点更稳定。

### Top2：`P1-4E-min remove unused ModuleRuntimeExternalStore*`

价值：

- 清理历史实现面，降低维护噪声。

放弃作为唯一下一刀的原因：

- 对热路径 wall-clock 的直接收益面较小。
- 无法覆盖 core/react 交界处的 fanout 结构税。

## API 变动判断

- public API：本轮判断可维持不变。
- internal contract：需要新增或升级 `RuntimeStore <-> RuntimeExternalStore` 的内部脉冲合同（`ModulePulsePacket`）。
- 若后续要开放给外部适配器，再单独提交 public API proposal。

## 验证与产物

- 本轮为 docs-only scout，不执行 runtime 实现验证链。
- 最小验证命令按任务要求使用：
  - `git diff --stat v4-perf..HEAD`

产物：

- `docs/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-crossplane-single-pulse-contract-nextwide-scout.evidence.json`

## 裁决

- 结论类型：`docs/evidence-only`
- `accepted_with_evidence=false`
- 唯一推荐下一刀：`P1-4F-min core->react single pulse contract`
