# Tasks: 运行时可观测性加固（事务链路贯穿 + Devtools 事件聚合器性能/内存 + 快照订阅契约）

**Input**:

- `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/spec.md`
- `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/plan.md`

**Prerequisites**:

- `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/research.md` 已裁决关键方案
- 观测协议与可序列化口径：`/Users/yoyo/Documents/code/personal/intent-flow/specs/005-unify-observability-protocol/contracts/observability-protocol.md`
- Debug 事件 SSoT：`/Users/yoyo/Documents/code/personal/intent-flow/.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`

## Format: `- [ ] T### [P?] Description with file path`

## Phase 1: 事务链路贯穿（txnQueue 作用域传播）

- [x] T001 [P1] 在入队点捕获并回灌最小诊断作用域（linkId/runtimeLabel/diagnosticsLevel/debug sinks/txn overrides）；若调用点无现有 linkId，则生成新的确定性 linkId 并在该事务内保持一致于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/ModuleRuntime.txnQueue.ts`
- [x] T002 [P1] 单测：入队事务执行期间能继承调用点的 `currentLinkId` / `currentRuntimeLabel` / `currentDebugSinks`，且不会污染并行 scope 于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/ModuleRuntime.txnQueue.DiagnosticsScopePropagation.test.ts`
- [x] T003 [P2] 单测：transaction overrides 仍能跨队列边界生效（无语义漂移）于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/ModuleRuntime.txnQueue.TransactionOverrides.test.ts`
- [x] T004 [P2] 将“捕获/回灌诊断作用域”提取为 helper（例如 `captureDiagnosticContext` / `withDiagnosticContext`），避免 `enqueueTransaction` 逻辑膨胀于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/ModuleRuntime.txnQueue.ts`
- [x] T005 [P1] 单测：当调用点无现有 linkId 时，入队事务仍会生成确定性 linkId（禁止默认随机/时间作为唯一 id 源），并在该事务内保持一致于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/ModuleRuntime.txnQueue.LinkIdFallback.test.ts`

## Phase 2: DevtoolsHub 事件窗口性能 + 派生缓存回收

- [x] T010 [P1] 将 ring buffer 满载淘汰从逐条 `shift()` 改为“批量裁剪/延迟 splice”的均摊常数策略（`ringBuffer` 与 `ringBufferSeq` 同步），避免窗口大小线性搬移于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [x] T011 [P1] 在 `module:destroy` 时回收 per-instance 派生缓存（`latestStates/latestTraitSummaries`）与实例索引（例如 `instanceLabels`），并保证在 `diagnosticsLevel=off` 的 early-return 路径下也会执行必要清理于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [x] T012 [P2] 单测：销毁实例后缓存条目可回收且规模与活跃实例同阶于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/DevtoolsHub.InstanceCleanup.test.ts`
- [x] T013 [P2] 单测：窗口大小动态调整（缩小/放大）时快照一致、通知一致于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/DevtoolsHub.BufferResize.test.ts`
- [x] T014 [P2] 定义并覆盖 edge case：bufferSize=0 或极小值时的语义（禁用窗口或退化为最小信息保留）于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/DevtoolsHub.BufferSizeZero.test.ts`
- [x] T015 [P2] 定义并实现 edge case：`module:destroy` 后迟到/重放事件到达时的处理策略（可解释、确定；不得 resurrect latest\* 缓存）。建议：允许事件进入窗口用于回放，但对该实例的 `state:update` 必须 Drop 或标记为 Orphan，且绝不重建 `latestStates/latestTraitSummaries` 于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`

## Phase 3: 快照订阅契约（SnapshotToken）与外部订阅安全

- [x] T020 [P1] 在 Hub 中引入单调递增的 `snapshotToken`，token 更新必须同步发生；触发边界对齐 spec FR-006（事件窗口/实例计数/latest\*/exportBudget/实例标签/控制操作）；同时保证“token 未变 → 快照对外可见字段不变”；通知允许 microtask 合并但不得漏更于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [x] T021 [P1] 对外 API：显式导出 `type SnapshotToken = number` + `getDevtoolsSnapshotToken(): SnapshotToken`（供 `useSyncExternalStore` 直接订阅 token）于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/index.ts`
- [x] T022 [P1] React 适配：提供基于 token 的订阅与 `useSyncExternalStore` 推荐用法（避免“快照对象引用恒定导致漏更新”）于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-devtools-react/src/snapshot.ts`
- [x] T023 [P2] 单测：订阅者仅依赖 token 判断变化时漏更率为 0（允许通知合并）于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/DevtoolsHub.SnapshotToken.test.ts`
- [x] T024 [P2] 校对并补齐契约文档：SnapshotToken、Recording Window、累计计数、通知合并语义与延迟上界于 `/Users/yoyo/Documents/code/personal/intent-flow/.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
- [x] T025 [P2] 回归：确保新增 token 不破坏 JsonValue/序列化与 evidence 导出上界（FR-008），并补齐对应测试断言于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/DevtoolsHub.test.ts`
- [x] T026 [P2] 单测：验证“token 不变期间快照视图稳定”的不变量（至少覆盖 events/instances/latest\*/exportBudget 任一字段变化都会 bump token）于 `/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/test/DevtoolsHub.SnapshotToken.test.ts`

## Phase 4: 性能基线与可复现实验（NFR/SC 验收证据）

- 说明：建议先完成 Phase 3（尤其 T022 的 devtools-react 兼容验证）再进行大规模性能基线采集，避免“契约未对齐导致 UI/消费面崩溃”影响 perf 实验可信度。

- [x] T030 [P1] 新增 micro-benchmark：enqueueTransaction（入队/完成）、devtoolsHubSink.record（窗口未满/已满）、create/destroy 回收曲线；并包含 `shift()` vs 批量裁剪 的 A/B 对比（入口：`pnpm perf bench:027:devtools-txn`）
- [x] T031 [P1] 固化 before/after 基线输出（JSON）到 `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/perf/`（至少包含 1 次可复现 run 的结果）
- [x] T032 [P2] 在本 spec 的 quickstart/plan 中补齐“如何运行基线脚本 + 如何解释指标”说明（对齐 SC-002/SC-005）于 `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/quickstart.md`
- [x] T033 [P1] 将基线对比摘要（环境元信息 + 关键指标 + 是否满足 SC/NFR）回写到 `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/plan.md`（与 perf/ 原始 JSON 互相引用）
