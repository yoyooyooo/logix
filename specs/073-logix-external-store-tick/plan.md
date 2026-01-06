# Implementation Plan: ExternalStore + TickScheduler（跨外部源/跨模块强一致，无 tearing）

**Branch**: `073-logix-external-store-tick` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/073-logix-external-store-tick/spec.md`

## Summary

本特性同时交付两个层级（在同一条主线上闭环）：

- **Level 1（模块内强一致）**：引入 `ExternalStore<T>` 归一化外部输入，并提供 `StateTrait.externalStore` 将外部输入声明式接入 State Graph：
  - 初始化 + subscribe 原子语义（不漏事件）；
  - 写回进入事务窗口并参与 converge/validate；
  - 可配置 `select/equals/coalesce`，诊断开关下可解释。
- **Level 2（跨模块强一致 + React 无 tearing）**：引入 Runtime 级 TickScheduler + RuntimeStore（单一 snapshot 真理源 + 分片订阅）：
  - tick 默认以 microtask 为边界，支持显式 `Runtime.batch(...)`；
  - 同一次 React render 读取多个模块状态来自同一 `tickSeq` 快照，消灭跨模块 tearing；
  - 提供 DeclarativeLink IR（强一致可识别的跨模块依赖表达），并定义与 `Process.link` 黑盒的边界；
  - 稳定化（fixpoint）有预算与软降级，但必须产出 Slim、可序列化证据（`trace:tick`）。

## 073 疏通：参考系 / 受限绑定 / 自由编排

本特性一旦完成，Logix 的“同时性”与“因果链”将以 **tick** 为基准被重新裁决。为了避免后续能力（尤其 Action/Flow/时间算子）继续在旧心智里发散，本节把 073 的架构边界显式固化：

- **观测参考系（Observation Frame）**：`RuntimeStore + tickSeq` 是 React/宿主唯一订阅真相源；同一次 render/commit 只能观测到同一 `tickSeq` 的快照（no-tearing）。
- **受限绑定（Boundaries / Geometry）**：`StateTrait.externalStore` / `StateTrait.source` 属于“边界条件绑定”而不是自由工作流：
  - 绑定必须可 IR 化、可预算、可诊断（Static IR + Dynamic Trace）；
  - 写回必须进事务窗口并受治理（external-owned/单 writer/txn 禁 IO）。
- **自由编排（Control Laws / Workflows）**：多步协议、分支、时间算子（delay/retry/timeout）、跨服务协调等属于“自由度”，不应被塞进 trait 的静态 meta。它们应由独立的 Flow/Action Program 表达，并通过 tick 的证据链（`trace:tick` + `EffectOp`）进入可回放、可解释、可预算的轨道。

形式化工作模型（约束闭包 `C_T` / 控制律 `Π` / 事务 `Δ⊕` + tick 参考系）见 `docs/specs/intent-driven-ai-coding/97-effect-runtime-and-flow-execution.md` 的 “1.2 最小系统方程”。

后续演进将按以上分层推进（本特性只负责“参考系 + 受限绑定”的主干闭环）：

- 本特性不扩展/不固化 `StateTrait.source` 的 `meta.triggers/debounceMs` 反射式解释入口；后续由 `076-logix-source-auto-trigger-kernel` 收敛替换，避免 073 把 tick 参考系意外绑定到旧接口上。
- 后续 spec：`075-logix-flow-program-ir`（Flow/Action 的可编译控制律），把时间算子与多步协议纳入 tick 参考系（避免黑盒 setTimeout/Promise 链断因果）。
- 后续 spec：`076-logix-source-auto-trigger-kernel`（基于 `dirtyPaths + deps` 的 source 自动触发内核化），逐步消灭 Query/Form 的 action-wiring 胶水（保留 `manual` 作为显式 escape hatch）。

## Deepening Notes

- Decision: React 订阅必须走 `RuntimeStore.topic(topicKey)` facade 分片，禁止订阅全局 store 造成跨模块 O(N) selector 执行（source: `spec.md#Clarifications`）
- Decision: topicKey 至少为 `ModuleInstanceKey = ${moduleId}::${instanceId}`，确保单例/多例隔离（source: `spec.md#Clarifications`）
- Decision: facade 缓存按 `(runtime, topicKey)`；listeners=0 必须 detach + `Map.delete`；细粒度 topic 采取按需存在（listeners>0）策略，避免 retained 增长（source: `spec.md#Clarifications`）
- Decision: `ExternalStore.getSnapshot()` 永远返回 raw current；coalesce 在 trait 写回层做 pending/raw 与 committed 分离，保证 committed 才可观测（source: `spec.md#Clarifications`）
- Decision: budget exceeded 只推迟 nonUrgent backlog，urgent 必须当 tick flush；允许 partial fixpoint，但必须用 `trace:tick.result.stable=false` 可解释（source: `spec.md#Clarifications`）
- Decision: `retainedHeapDeltaBytesAfterGc` 用于限制常驻增长（泄漏/缓存膨胀）；分配率/GC 压力门禁可选补 `allocatedBytes`/`peakHeapDeltaBeforeGc`（source: `spec.md#Clarifications`）
- Decision: blackbox `Process.link` 不进入同 tick fixpoint（Next Tick best-effort），并必须在 diagnostics 中标注边界（source: `spec.md#Clarifications`）
- Decision: 模块内 storm：ReadQuery static lane 可选用 `selectorId/readsDigest` 进一步分片；dynamic selector 用 equality 兜底正确性（source: `spec.md#Clarifications`）
- Decision: Module-as-Source：支持把模块 selector 结果当作 ExternalStore 来源（`ExternalStore.fromModule(...)`），并用 `StateTrait.externalStore` 声明式写回到下游模块字段；但必须被编译为 IR 可识别依赖（module readQuery → trait writeback）并参与同 tick 稳定化，禁止退化为 runtime 黑盒订阅（source: `spec.md#Clarifications` / FR-012 / SC-005）
- Decision: `ExternalStore.fromModule` 不做值拷贝：Trait 写回存的是 selector 返回值本身（按引用共享，不深拷贝/不结构化拷贝）。因此禁止用 fromModule “镜像大状态”；保持 selector 小且稳定，必要时在 selector 内显式投影/拷贝并把成本计入预算（source: `spec.md#Clarifications`）
- Decision: React 订阅单一真相源：`@logix/react` 必须只订阅 RuntimeStore topic facade，禁止直接订阅 `moduleRuntime.changes*`；per-module stores（`ModuleRuntimeExternalStore*`）在 cutover 后必须删除以避免双真相源/回归 tearing（source: `spec.md#Clarifications` / NFR-007）
- Decision: Trait 下沉边界：`StateTrait` 只负责“模块内字段能力 + 静态治理 + Static IR 导出”；`TickScheduler/RuntimeStore` 只消费 IR 做调度与快照一致性。禁止把 tick/React 订阅逻辑塞进 traits（SRP + no-dual-truth）。

## Questions Digest（$speckit plan-from-questions）

来源：外部问题清单回灌（批次 A：Q001–Q010；批次 B：Q001–Q004）。

- Batch A：
  - Q001/Q005：DeclarativeLinkIR 必须落到明确 TS 类型（internal），写侧仅允许 `dispatch`；黑盒 `Process.link` 的写入不参与同 tick fixpoint（视为 Next Tick best-effort）。
  - Q002：RuntimeStore 保持“单一 snapshot + 单一 tickSeq 锚点”，但通知按 `ModuleInstanceKey = ${moduleId}::${instanceId}`（可选按 `ReadQueryStaticIr.readsDigest`）分片，避免全局 O(N) notify。
  - Q003/Q004：预算降级只推迟 nonUrgent backlog；coalesceWindowMs 只影响“写回 committed 值”，保证可观测 snapshot 与通知一致、不引入 tearing。
  - Q006/Q008/Q009/Q010：Perf 预算补齐标准负载；light 诊断用 triggerSummary 解释 tick；externalStore 字段 external-owned；执行模型为 external callback → tick/txn origin（写回发生在 converge 前）。
- Batch B：
  - Q001：Sharded notify 通过 ExternalStore facade（topic 预绑定）落地：`useSelector` 选择 topic facade，从根上避免全局 O(N) selector 执行。
  - Q002：软降级意味着“强一致有预算上限”：超限后 nonUrgent 链路降级为最终一致性（当 tick 可暴露 A(新)+B(旧) 的 partial fixpoint，但保持 no-tearing + 可解释证据）。
  - Q003：`ExternalStore.fromStream` 仅 best-effort；必须在文档中警告 stale-start 风险，并推荐优先用 `fromService/fromSubscriptionRef`。
  - Q004：`retainedHeapDeltaBytesAfterGc` 指标用于限制 **常驻/retained 增长**（泄漏/缓存膨胀），而非分配速率；若要 gate GC 压力，另加 allocated/peak 类指标。
- Batch C：
  - Q001：Urgent lane 遇到循环/超限时必须有“强制中断机制”避免卡死 UI：检测环或触发 hard cap 后立即中断当 tick 的进一步处理，flush 当前 snapshot，并在 `trace:tick.result.stable=false` 中标注 `cycle_detected/budget_steps`（必要时附带 error 事件）。
  - Q002：无 tearing 的最高承诺是“同 tickSeq 快照物理一致”，不等价于“预算超限时仍保持业务逻辑强一致”。
  - Q003：仅按 `ModuleInstanceKey` 分片只能避免跨模块 O(N)，模块内仍可能 O(N)；为保持现状 ReadQuery/static lane 优化，`readsDigest/selectorId` 细粒度分片（T035）为必做，不得回退为 module-level topic。
  - Q004：`coalesceWindowMs` 为 Pre-Write（写回前聚合）；外部源的 subscribe 回调不延迟，仅延迟 committed 写回与 tick flush。
  - Q005：黑盒 `Process.link` 的 “Next Tick best-effort” 对依赖同 microtask 生效的存量存在 breaking 风险，必须写入 migration 口径并给出迁移建议。
  - Q006：`retainedHeapDeltaBytesAfterGc` 的门禁语义是“常驻净增”（限制 retained 增长），不是 tick 临时留存。
  - Q007：`trace:tick.result.stable=false` 在 Devtools 默认呈现为 Warn（`cycle_detected` 可提升为 Error）。
  - Q008：DeclarativeLinkIR 不是唯一事实源；core-ng 复现强一致还需要 TickScheduler/RuntimeStore 的 Runtime Service 语义约束（tick 边界/lanes/budget/token 不变量）。
  - Q009：默认 origin 都 urgent 存在“全是 urgent”风险；通过 coalesce/batch、显式 nonUrgent 标注与 hard cap（含 urgent safety break）保持调度有效且可解释。
  - Q010：topic facade 缓存策略已定：只保留活跃 facade（listeners>0），归零即 detach+delete；因此 LRU/TTL 对 facade 本身为 N/A（如未来引入 warm-cache 再引入 cap/TTL）。
- Batch D：
  - Q001：SSR 支持采用“最小契约”路线：ExternalStore 可选 `getServerSnapshot`（React server render 用），本特性不提供自动注水/rehydrate，宿主需保证 hydration 一致性。
  - Q002：不做 priority inheritance；若 nonUrgent backlog 被推迟，urgent 将读到旧派生值（partial fixpoint），必须通过诊断可解释；对 correctness 敏感链路应标注为 urgent 或避免依赖 nonUrgent 派生。
  - Q003：ExternalStore.getSnapshot 同步抛错不会崩溃 runtime：熔断该 trait，保留 last committed 值，并记录诊断（默认 Warn）。
  - Q004：topic facade 默认“归零即删”，不引入 TTL；若业务场景出现 GC churn，将以 perf evidence 驱动再引入 keep-alive（必须有 retained/budget 防线）。
  - Q005：Root Reset 不直接覆盖 external-owned 字段：externalStore trait 以当前快照为准保持外部值（避免 reset 写入逃逸/闪烁）。
  - Q006：`Runtime.batch(...)` 支持嵌套且语义扁平化：仅 outermost 触发 flush；无 rollback，异常为 partial commit，但必须在 finally 中确保 flush（避免丢通知）。
  - Q007：Time Travel 回放强制对齐 tick 边界（tickSeq）；不提供“回放到 tick 中间态并绑定 UI”的能力（中间态仅允许 inspect，不保证 UI 不撕裂）。
  - Q008：`useSelector` 的 `equalityFn` 继续通过 `use-sync-external-store/with-selector` 完整支持，不构成 breaking。
- Batch E：
  - Q001：ExternalStore 的 listener 必须是 **Signal Dirty（Pull-based）**：幂等地点亮“该 store dirty”，并确保同一 microtask 内最多调度一次 tick；不得把 100 次 emit 变成 100 个 payload task 入队（避免 thundering herd 在队列层积压）。tick flush 时统一 `getSnapshot()` pull 最新 raw，并按 coalesce/equals 写回 committed。
  - Q002：Topic facade 回收必须 **显式清理缓存键**：listeners=0 时必须 detach + `Map.delete(topicKey)`，避免 topicKey 字符串残留导致隐性 retained；缓存容器优先 `WeakMap(runtime, Map<topicKey,...>)`（runtime 销毁自动释放整组），并禁止 render 路径反复拼接长 topicKey。
  - Q003：`ExternalStore.fromStream(stream, { initial })` 若缺少 `initial/current`，必须抛出 **Runtime Error**（fail-fast），不能只依赖 TS 类型。
  - Q004：`Runtime.batch` 的扁平化语义会破坏“await nextTick 观察中间态”的假设：batch 只作为 **同步边界**，不支持在 batch 内部 `await` 期望触发 flush；需要异步时序的流程必须在 batch 之外显式组织（文档警告）。
  - Q005：若 nonUrgent external input 因预算/循环降级被推迟，必须在 diagnostics=light/full 下给出 **显式 Warn 证据**（例如 `trace:tick` 的 deferred 摘要 + primary sample），让 Devtools 能回答“关键数据为何延迟”；diagnostics=off 不引入成本。
  - Q006：SSR：React adapter 在 server render 时使用 `getServerSnapshot ?? getSnapshot`（fallback，而非 `undefined/throw`），宿主负责 hydration 一致性。
  - Q007：Perf 指标口径：`timePerTickMs` 只度量 `tick flush -> notify`（不含 React render/commit）；“跟手性”用独立 `click→paint` guard 覆盖，避免业务组件复杂度污染基线。
  - Q008：`ExternalStore.fromSubscriptionRef(ref)` 以“同步纯读”为前提：`SubscriptionRef.get(ref)` 必须是纯读、无 IO/副作用；否则视为 defect/不支持（不把副作用藏进 `getSnapshot()`）。
- Batch F：
  - Q001：Module-as-Source 不是“订阅胶水升级版”，而是 declarative 图的一等节点：`ExternalStore.fromModule(...)` 必须携带可导出的依赖事实源（moduleId/selectorId/readsDigest 等），让 TickScheduler 在同 tick 内稳定化下游 externalStore 写回（否则只剩最终一致与不可解释黑盒）。
  - Q002：写侧安全：Module-as-Source 的写回仍由 **下游模块的 ExternalStoreTrait** 执行（external-owned fieldPath + txn-window），跨模块依赖只负责触发/排序，不引入“跨模块 direct write”逃逸。
- Batch G（外部问题清单：Perf/SSR/优先级/IR 复用）：
  - Q001：Perf budget 是 **Total**（该边界场景的 `tick flush -> notify` 端到端总开销），不是“只算新增 TickScheduler 的 delta”；仍会用 before/after diff 兜底“无回归”，且首次实现完成后以实测 baseline 回写本节预算（默认 20% 相对阈值）。
  - Q002：SSR：RuntimeStore/RuntimeExternalStore 的 `getServerSnapshot` 只读当前 RuntimeSnapshot（同步、无 IO、不等待 tick）；异步数据必须以 state 的 pending/empty 形态呈现，ExternalStore 侧如需稳定首屏需提供 `getServerSnapshot()`，宿主负责 hydration 一致性（本特性不做自动注水/rehydrate）。
  - Q003：低优先级节流不会丢：RuntimeStore topic facade 必须保留现有 low-priority notify 策略（microtask vs raf/timeout + maxDelay），避免高频 tick flood React render；优先级来源由 tick/commit 元数据映射（urgent→normal，nonUrgent-only→low）。
  - Q004：DeclarativeLinkIR 的 “readQuery 节点”必须复用 `ReadQueryStaticIr`（含 `selectorId/readsDigest/lane/producer/equalsKind`），禁止平行定义另一份 selector-like Static IR；读依赖只接受 static lane。
  - Q005：循环防卡死以 hard cap 为主（maxSteps/maxMs/maxTxnCount），`cycle_detected` 作为 best-effort 诊断：在同 tick 内反复 requeue/无进展时提前标注并中断；跨 tick 的反馈环允许存在（最终一致），但需在 `trace:tick` 中可解释（stable=false + degradeReason）。
  - Q006：T035 的目的仅是把现有 SelectorGraph 的“dirty roots → selectorId”增量能力迁到 RuntimeStore 的 selector-topic version（保持性能同级）；`[P]` 仅表示可并行实现，**不是可选**，属于 cutover 阻断项。
  - Q007：加入 priority inversion 诊断：当 nonUrgent backlog 被推迟且存在对应 React 订阅者时，diagnostics=light/full 产出 Slim Warn（不要求定位到具体组件，但至少能指到 module/instance/selectorId）。
  - Q008：不提供 legacy shim：forward-only，cutover 后删除 per-module stores（无兼容层/无弃用期），避免双真相源。
  - Q009：external-owned 以运行期/装配期 fail-fast 为主（build-time 冲突检测 + txn-window guard + 测试），不引入 eslint/类型层静态写入分析（成本高且不可靠）。
  - Q010：Module-as-Source 的可识别性必须可 gate：`fromModule` 的 moduleId 必须可解析且 selectorId 必须稳定（deny `unstableSelectorId`），否则 fail-fast；selector 若缺少 readsDigest，允许退化为 module-topic edge（仍 IR 可识别，不是黑盒订阅）并在 diagnostics 下 Warn。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM；以仓库 `package.json` 为准）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logix/core`、`@logix/core-ng`、`@logix/react`、`use-sync-external-store/shim/with-selector`  
**Storage**: N/A（证据落盘到 `specs/073-logix-external-store-tick/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`；React 集成含 Vitest browser）  
**Target Platform**: Node.js 20+ + modern browsers（至少 1 组 headless browser perf evidence）  
**Project Type**: pnpm workspace（`packages/*` + `examples/*`）  
**Performance Goals**: diagnostics=off 默认档新增开销接近零；tick/notify 路径必须可基准化、可回归；预算与证据落在本 plan 的 Perf Evidence Plan。  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）；稳定标识（tickSeq/instanceId/txnSeq/opSeq）；事务窗口禁 IO；强一致链路必须可解释且可降级。  
**Scale/Scope**: 面向真实业务仓库：几十模块、频繁外部事件（router/location、auth/session、flags、websocket）+ 下游 query/source 依赖链
**React Compatibility**: `useSelector` 继续使用 `use-sync-external-store/with-selector`，自定义 `equalityFn`（如 shallowEqual）完整支持；SSR 场景优先通过 `ExternalStore.getServerSnapshot` 对齐 server snapshot（宿主负责 hydration 一致性）。

## Kernel support matrix

- `core`: supported（本特性在 `@logix/core` 提供对外契约与默认实现）
- `core-ng`: supported（本特性主要落在 `@logix/core` + `@logix/react`；core-ng 仅在 Kernel Runtime Services 层提供可选实现/别名，预计无需新增交付；若实现中引入新的 Kernel RuntimeService ID 或出现 core-ng 行为分歧，必须在 `tasks.md` 增补 core-ng 任务并作为 gate）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性属于 Runtime 一致性/调度层：将外部输入与跨模块联动纳入统一 tick 语义，并对齐 React external store 心智。
- **Docs-first & SSoT**：依赖/对齐既有 specs：`007-unify-trait-system`、`057-core-ng-static-deps-without-proxy`（ReadQuery/static lane）、`060-react-priority-scheduling`（priority notify/lanes）、`027-runtime-observability-hardening`（token/订阅不变量）。若新增对外契约与诊断协议，需同步更新 `.codex/skills/project-guide/references/runtime-logix/**` 的 runtime SSoT。
- **IR & anchors**：新增 ExternalStoreTrait 的 Static IR 与 DeclarativeLink IR（强一致可识别）；动态链路新增 `trace:tick` 事件（Slim & 可序列化）。`tickSeq` 作为新的稳定锚点必须在事件与运行时快照中贯通。
- **Deterministic identity**：tickSeq 单调递增、无随机/时间默认；与 `instanceId/txnSeq/opSeq` 可关联（至少通过 `trace:tick` 的 anchor）。
- **Transaction boundary**：externalStore 写回/派生收敛必须在事务窗口内完成；tick 稳定化期间不得引入 IO；IO 只能通过既有 `StateTrait.source` 两阶段语义（loading → async writeback）落地。
- **Internal contracts & trial runs**：TickScheduler/RuntimeStore/ExternalStoreRegistry 需要作为可注入 Runtime Service，支持测试替换与 trial-run 证据导出（避免 process-global 单例）。
- **Dual kernels（core + core-ng）**：对外契约仅在 `@logix/core`；core-ng 通过 Kernel/RuntimeService 选择器实现等价行为（或显式降级），禁止 consumer 直接依赖 `@logix/core-ng`。
- **Performance budget**：触及热路径：state commit → react notify（ExternalStore）→ render；必须建立 perf evidence（diagnostics off/on，before/after diff 无回归）并固化预算。
- **Diagnosability & explainability**：新增 `trace:tick` 与外部输入 ingest 相关证据（最小化字段、可关联）。diagnostics=off 必须接近零成本。
- **用户心智模型（≤5 关键词）**：`externalStore` / `tick` / `runtimeStore` / `no-tearing` / `linkIR`
- **Breaking changes（forward-only）**：`@logix/react` 订阅模型从 per-module store 迁移为 runtime store（内部实现变化，但语义升级为无 tearing）；对正常业务用法（`RuntimeProvider` + `useSelector/useModule`）目标是透明；任何依赖 internal 路径/自研 adapter 的集成需要人工介入；必须提供迁移说明（无兼容层/无弃用期，且不承诺 100% 自动迁移脚本）。
- **Public submodules**：`@logix/core` 新增对外子模块需满足 `src/*.ts` 子模块铁律；实现下沉 `src/internal/**`；`exports` 不暴露 internal。
- **Quality gates**：实现阶段至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`；并补齐本 spec 的单测/集成测与 perf evidence。

### Gate Result (Pre-Design)

- PASS（当前交付为 plan/research/data-model/contracts/quickstart；实现由 tasks 驱动）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

Baseline 语义：策略 A/B（before=perModule adapter；after=runtimeStore adapter；由 perf boundary 里的 `VITE_LOGIX_PERF_RUNTIME_STORE_ADAPTER` 选择，避免依赖“旧代码版本”）

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- Budget 语义：本节 `timePerTickMs` 是 boundary 场景下 `tick flush -> notify` 的 **Total** 端到端开销（包含现有 commit/selector machinery 与新增调度/路由）；before/after diff 负责守“无回归”，首次实现完成后以 baseline 回写并按默认 20% 相对阈值设定回归门槛。
- Hard conclusion：交付结论必须 `profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）
- 采集隔离：硬结论的 before/after/diff 必须同环境同参数；若是 adapter A/B（同一代码）对比，可在同一工作区采集，但必须保证采集期间不改代码/不切换 profile，并把 git dirty 状态写入 `specs/073-logix-external-store-tick/perf/README.md`
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`（并确保 before/after 的 `meta.matrixId/matrixHash` 一致）
- 前提：以 `NODE_OPTIONS=--expose-gc` 运行采集（否则 heap 指标不可复现/不可比）
- 环境元信息：硬结论采集必须把 env/versions/profile/runs/warmup/timeoutMs 等信息与证据文件名，记录到 `specs/073-logix-external-store-tick/perf/README.md`（避免“可比性争论”）
- Validate：对 before/after 先跑 `pnpm perf validate -- --report <file>.json`；若使用 `--files` 做子集采集，必须加 `--allow-partial` 并在结论中标注（缺点位/timeout/skip 不允许默默吞掉）

**Standard Workload（for `runtime-store-no-tearing` budget）**：

- 模块数：`10`
- UI 订阅：`256` 个 watcher（均匀分布到 10 个模块 topic/selector topic；每模块至少 1 个 marker watcher 用于“全部通知已到达”的屏障）
- Tick 驱动：每 tick 用 `Runtime.batch` 同步对 10 个模块各 dispatch 1 次 update；度量窗口仅覆盖 `flush -> notify`（不含 dispatch 本身）
- 采样：`ticksPerRun=1`；runs/warmup/timeout 由 `matrix + profile` 决定（详见证据文件 meta 与 suite point stats）

**Budgets（073 首版，baseline 回写后按 20% 回归阈值）**：

> 说明：matrix v1 对本特性当前只 gate `timePerTickMs`（suite=`runtimeStore.noTearing.tickNotify`）；`click→paint` 仅作观测口径；`retainedHeapDeltaBytesAfterGc` 暂未纳入该 suite（TODO）。

- Browser（React 订阅/notify + tick flush）：
  - Baseline（2026-01-06 / darwin-arm64 / chromium-headless / profile=default / watchers=256）：
    - Before（adapter=perModule）：`timePerTickMs.p95` off=2.00ms / full=1.90ms
    - After（adapter=runtimeStore）：`timePerTickMs.p95` off=1.80ms / full=1.60ms
  - 回归阈值（以 After baseline 为准，默认 +20%）：
    - `timePerTickMs.p95 <= 2.16ms`（diagnostics=off）
    - `timePerTickMs.p95 <= 1.92ms`（diagnostics=full）
    - 相对开销：`timePerTickMs.p95(full) / timePerTickMs.p95(off) <= 1.25`（matrix v1）

指标口径澄清：

- `retainedHeapDeltaBytesAfterGc`：限制常驻/retained 增长（泄漏/缓存膨胀），不是 allocation rate。
- 口径：以同一 workload 的“起止强制 GC 后 usedHeap 差值”作为常驻净增（越接近 0 越好）；不以 tick 过程的临时留存为目标指标。
- GC 压力（allocation rate）若要 gate：在 `runtime-store-no-tearing` test 内新增 `allocatedBytes`/`peakHeapDeltaBeforeGc` 等可复现指标（可选，按 matrix 能力决定）。
- `timePerTickMs`：仅覆盖 `tick flush -> notify`（含 scheduler/commit/notify 路径），**不包含** React render/commit；渲染相关的“跟手性”使用 `click→paint` 之类场景单独 gate（避免业务组件复杂度污染基线）。

**Collect (Browser / runtimeStore-no-tearing + click→paint guard)**：

- Before（adapter=perModule）：
  - `NODE_OPTIONS=--expose-gc VITE_LOGIX_PERF_RUNTIME_STORE_ADAPTER=perModule pnpm perf collect -- --profile default --out specs/073-logix-external-store-tick/perf/browser.before.<sha>.<envId>.logix-browser-perf-matrix-v1.default.adapter=perModule.json --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- After（adapter=runtimeStore）：
  - `NODE_OPTIONS=--expose-gc VITE_LOGIX_PERF_RUNTIME_STORE_ADAPTER=runtimeStore pnpm perf collect -- --profile default --out specs/073-logix-external-store-tick/perf/browser.after.<sha>.<envId>.logix-browser-perf-matrix-v1.default.adapter=runtimeStore.json --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --files test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- Validate：
  - `pnpm perf validate -- --report <before.json> --allow-partial`
  - `pnpm perf validate -- --report <after.json> --allow-partial`
- Diff（hard conclusion）：  
  - `pnpm perf diff -- --before <before.json> --after <after.json> --out specs/073-logix-external-store-tick/perf/diff.browser.adapter=perModule__runtimeStore.<sha>.<envId>.logix-browser-perf-matrix-v1.default.json`

**Perceived latency guard（click→paint）**：

- 场景：`test/browser/perf-boundaries/diagnostics-overhead.test.tsx`（scenario=`watchers.clickToPaint`）
- 口径：matrix v1 暂无 budgets（P3 观测点）；如需变成硬门禁，后续在 matrix 中补 budgets（例如限定 diagnosticsLevel=off 的 p95 上限或相对比值）。

Failure Policy：任一 diff `meta.comparability.comparable=false` 或 `summary.regressions>0` → 不得下硬结论，必须复测并定位（profile 升级或缩小 files 子集）。

## Project Structure

### Documentation (this feature)

```text
specs/073-logix-external-store-tick/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── public-api.md
│   ├── diagnostics.md
│   ├── ir.md
│   └── migration.md
├── tasks.md
└── perf/
    └── README.md
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/
│   ├── ExternalStore.ts            # NEW: ExternalStore contract + sugars（public submodule）
│   ├── StateTrait.ts               # ADD: StateTrait.externalStore DSL（public）
│   └── internal/
│       ├── runtime/core/TickScheduler.ts        # NEW: Runtime tick scheduler (internal)
│       ├── runtime/core/RuntimeStore.ts         # NEW: runtime store snapshot/token (internal)
│       ├── runtime/core/DeclarativeLinkIR.ts    # NEW: declarative cross-module link IR types (internal)
│       ├── runtime/core/ModuleRuntime.ts        # CHANGE: commit -> RuntimeStore + tickSeq anchoring (T024)
│       ├── runtime/core/ModuleRuntime.*.ts      # NEW: split ModuleRuntime(>1000 LOC) into mutually exclusive modules（见下文）
│       ├── runtime/core/DevtoolsHub.ts          # CHANGE: tick/commit correlation + evidence (as needed by T024/T029)
│       ├── runtime/core/DebugSink.ts            # CHANGE: add `trace:tick` event shape + sampling gates (as needed)
│       ├── runtime/core/DebugSink.*.ts          # NEW: split DebugSink(>1000 LOC) into mutually exclusive modules（见下文）
│       ├── runtime/core/process/ProcessRuntime.ts   # CHANGE: Process.link boundary (best-effort) + tick integration (as needed)
│       ├── runtime/core/process/ProcessRuntime.*.ts # NEW: split ProcessRuntime(>1000 LOC) into mutually exclusive modules（见下文）
│       ├── state-trait/model.ts                 # CHANGE: add externalStore kind + plan step
│       ├── state-trait/build.ts                 # CHANGE: emit externalStore plan steps + writer/ownership governance
│       ├── state-trait/ir.ts                    # CHANGE: export externalStore policy into Static IR
│       ├── state-trait/external-store.ts        # NEW: externalStore trait runtime/install (internal)
│       ├── state-trait/source.ts                # CHANGE: deps-as-args + writeback semantics (T009)
│       ├── state-trait/source.*.ts              # NEW: split source(>1000 LOC) into mutually exclusive modules（见下文）
│       ├── state-trait/converge-in-transaction.ts    # CHANGE: external-store-sync plan step + tick scheduling hooks (T014/T020)
│       ├── state-trait/converge-in-transaction.*.ts  # NEW: split converge-in-transaction(>1000 LOC) into mutually exclusive modules（见下文）
│       ├── state-trait/validate.ts              # CHANGE: ownership + new kind validation (T019)
│       └── state-trait/validate.*.ts            # NEW: split validate(>1000 LOC) into mutually exclusive modules（见下文）

packages/logix-core-ng/
└── src/**                           # 若 core-ng 需要等价实现：通过 Runtime Services/Kernel 选择器接入

packages/logix-react/
├── src/internal/store/
│   └── RuntimeExternalStore.ts      # NEW: runtime-level ExternalStore for React (single subscription truth)
├── src/internal/hooks/useSelector.ts # CHANGE: 从 per-module store 切换到 runtime store
└── test/browser/perf-boundaries/
    └── runtime-store-no-tearing.test.tsx        # NEW: perf + semantic assertion (tickSeq一致)

docs/specs/**                         # 若对外术语/契约升级：同步更新（docs-first）
.codex/skills/project-guide/references/runtime-logix/**  # runtime SSoT 同步（docs-first）
```

**Structure Decision**: 交付能力落在 `@logix/core`（契约 + 默认实现）与 `@logix/react`（runtime-store 订阅适配），其余实现细节下沉 `src/internal/**`；core-ng 通过 Runtime Services/Kernel 选择器保证等价语义或显式降级。

## Large File Decomposition（≥1000 LOC）

> 本节是 `$speckit plan 073` 的强制产物：对“本需求必然会触及”的既有超大文件，提前规划互斥拆分，以降低实现期耦合与冲突面，并把 SRP 作为默认约束。

### 命名约定（用户补充）

- 若是**单一主体**为了行数/职责治理而拆分：使用 `*.*.ts` 命名并在同目录平铺（例如 `ModuleRuntime.runtimeStore.ts`）。
- 若形成的是**一大类子模块/子系统**：用目录承载子模块（例如 `runtime/core/process/*` 已是目录；仅在出现明确子系统时再引入更深目录）。

### 本需求涉及的超大文件清单（现状行数）

- `packages/logix-core/src/internal/runtime/core/DebugSink.ts`（1653）
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`（1506）
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts`（1349）
- `packages/logix-core/src/internal/state-trait/source.ts`（1173）
- `packages/logix-core/src/internal/state-trait/converge-in-transaction.ts`（1031）
- `packages/logix-core/src/internal/state-trait/validate.ts`（1384）

### 拆分计划（互斥职责 + 落点）

#### 1) `ModuleRuntime.ts`（1506）→ `ModuleRuntime.*.ts`

目标：把 “组装/注册/事务上下文/commit 可观测” 拆成互斥模块，使 T024（commit→RuntimeStore）与后续演进不继续膨胀 `ModuleRuntime.ts`。

- `ModuleRuntime.hubs.ts`：`stateRef`/`commitHub`/`actionHub` 与 stream wrapper（订阅计数、legacy module changes stream）
- `ModuleRuntime.txnContext.ts`：`StateTransaction.makeContext` + `recordPatch/updateDraft` 等 txn-window 适配与 guard
- `ModuleRuntime.traits.ts`：traitState/rowIdStore/selectorGraph 装配 + trait converge time-slicing state（只做组装，不做 tick）
- `ModuleRuntime.runtimeStore.ts`：commit/selector-topic 版本路由 → `RuntimeStore`（含 token 不变量、tickSeq↔txnSeq 关联锚点）
- `ModuleRuntime.ts`：仅保留 `make()` 的顶层编排与公开导出（其余实现下沉到以上模块）

#### 2) `state-trait/source.ts`（1173）→ `source.*.ts`

目标：将 “idle 同步 / refresh 安装 / 依赖漂移诊断 / 写回记录” 拆分，方便执行 T009（deps-as-args）与后续 ExternalStoreTrait 的联动，不把所有逻辑堆回单文件。

- `source.syncIdle.ts`：`syncIdleInTransaction`（含 list.item 分支的纯同步 key 评估与 idle 写回）
- `source.refresh.ts`：`installSourceRefresh`（resource snapshot 流程、rowId gating、concurrency、replay 记录）
- `source.depsMismatch.ts`：deps mismatch 计算/格式化与 `state_trait::deps_mismatch` 诊断发射
- `source.recording.ts`：`recordTraitPatch`/`recordReplayEvent`/`getBoundScope`/`setSnapshotInTxn` 等共享写回工具
- `source.ts`：保留对外导出与最薄 glue（避免循环依赖；不再承载大段业务逻辑）

#### 3) `converge-in-transaction.ts`（1031）→ `converge-in-transaction.*.ts`

目标：把 converge 的 “诊断门禁/采样、dirty→rootIds、exec loop” 拆分，给 ExternalStoreTrait 增加 `external-store-sync` plan step 与 tick scheduling hook 时不把核心循环继续膨胀。

- `converge-in-transaction.diagnostics.ts`：diagnostics level/sinks gate、采样策略、trace payload（Slim + 可序列化）
- `converge-in-transaction.dirty.ts`：dirtyPaths/dirtyRootIds 计算与降级原因汇总（含 digest/evidence 组装）
- `converge-in-transaction.exec.ts`：exec IR 构建与 step 执行循环（hotspot 统计、time-slicing scope）
- `converge-in-transaction.ts`：仅保留 `convergeInTransaction()` 的编排与返回结构，避免成为“所有 converge 逻辑的垃圾场”

#### 4) `validate.ts`（1384）→ `validate.*.ts`

目标：把 “路径读写工具/错误值模型/规则执行/trace” 分离；新增 external-owned/单 writer 治理与新 kind 校验时，避免继续堆叠在单文件内。

- `validate.path.ts`：path parse/get/set/unset 等纯工具
- `validate.errorValue.ts`：ErrorValue merge/normalize/count 等模型工具（约束：不把 array 当多错误集合）
- `validate.rules.ts`：rule 执行/模式映射（submit/blur/valueChange/manual）与 scope 扫描
- `validate.diagnostics.ts`：`trace:trait:validate`/diagnostic 事件门禁与 slim payload 组装
- `validate.ts`：保留 `validateInTransaction()` 的编排与对外类型导出

#### 5) `DebugSink.ts`（1653）→ `DebugSink.*.ts`

目标：为新增 `trace:tick`（以及 topic/backlog/降级证据字段）预留清晰落点，避免 DebugSink 成为“类型+序列化+输出+Layer 全混在一起”的单体文件。

- `DebugSink.events.ts`：Event union 与 ref 类型（包括 `trace:*` 统一入口与 `trace:tick` 结构）
- `DebugSink.layers.ts`：Layer 构造（noop/errorOnly/console/browser*）
- `DebugSink.record.ts`：`record()`/`toRuntimeDebugEventRef()`/去重与 txn anchor 回填
- `DebugSink.ts`：保留对外导出与最薄 glue

#### 6) `process/ProcessRuntime.ts`（1349）→ `ProcessRuntime.*.ts`

目标：在明确 “黑盒 Process.link = Next Tick best-effort（不进入同 tick fixpoint）” 的边界时，把 link 相关逻辑从 runtime 组装里拆出去，降低后续演进风险。

- `ProcessRuntime.link.ts`：link 边界与写侧约束（dispatch-only；与 DeclarativeLinkIR 的职责互斥）
- `ProcessRuntime.make.ts`：Tag + make/layer 组装（只负责 wiring，不承载 link/调度细节）
- `ProcessRuntime.ts`：保留对外导出与 glue

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A（本特性不以“引入额外复杂度”为目标；若实现阶段出现必须违反宪章的点，再补表并解释。）

## Design（关键机制）

### 1) ExternalStore 归一化（Level 1）

- `ExternalStore<T>` 必须具备同步 `getSnapshot()`；Stream 仅作为语法糖（必须提供 `initial/current`，否则 fail-fast）。
- SSR：ExternalStore 可选 `getServerSnapshot()`（同步、无 IO）；React adapter 在 server render 时优先用它（否则回退到 `getSnapshot()`），宿主负责 hydration 一致性（本特性不做自动注水/rehydrate）。
- 容错：ExternalStore.getSnapshot() 同步抛错必须被 trait 层捕获；熔断该 trait（保留 last committed 值），并通过 diagnostics 记录 Warn（不得崩溃整个 runtime）。
- Module-as-Source：提供 `ExternalStore.fromModule(module, selector)`（或等价）把模块 selector 结果归一到 ExternalStore；但其依赖必须可被 IR 识别并由 TickScheduler 参与同 tick 稳定化，禁止实现为“黑盒订阅 + 事件驱动写回”。
- 可识别性门禁（必须实现）：`fromModule` 的 moduleId 必须可解析且 selectorId 必须稳定（deny `unstableSelectorId`），否则 fail-fast；selector 若缺少 readsDigest，允许退化为 module-topic edge（仍 IR 可识别，不是黑盒订阅）并在 diagnostics=light/full 下 Warn。
- `StateTrait.externalStore` 只负责“写回 state field”，派生/联动用 `computed/link/source` 表达（保持 SRP）。
- Trait 下沉（做到位，避免“Runtime 猜语义”）：
  - `ExternalStore` sugar 必须携带内部 descriptor（至少 `kind="module"` 时包含 `moduleId + ReadQueryStaticIr`），供 trait build/IR export/门禁消费（不允许在 runtime 侧通过 subscribe 黑盒识别）。
  - `StateTrait.source` 的 `key` 改为 **deps-as-args**：`key(...depsValues)`（不再接收 `key(state)`），与 computed 对齐，避免“key 读集漂移/隐式依赖”导致 deps/IR 不一致；实现层通过 DSL 将其 lower 为 `key(state)` 供 source runtime 调用。
  - StateTrait 必须把 externalStore 作为一等 kind 进入 `Program/Graph/Plan`（新增 plan step，如 `external-store-sync`），并在 `StateTrait.exportStaticIr` 导出 `source/ownership/lane` 等 policy，确保 Static IR digest 覆盖结构变化。
  - ownership 与 writer 冲突必须在 build-time 统一治理：同一 fieldPath 只能有一个 writer（computed/link/source/externalStore），并固化 external-owned registry；runtime 写入路径对 external-owned fail-fast（含 root reset/patch）。
  - lane hint 下沉到 trait policy：externalStore 可声明 `lane`（urgent/nonUrgent），TickScheduler 仅做 lane→notify-priority 映射（urgent→normal，nonUrgent-only→low），notify 节流策略仍由 RuntimeStore topic facade 承担。
  - Non-goals：traits 不负责跨模块稳定化、topic version 增量或 React 订阅；这些属于 RuntimeStore/TickScheduler/SelectorGraph。
- 初始化语义对齐 React external store：保证 `getSnapshot` 与 subscribe 之间不漏事件（通过“订阅建立后 refreshSnapshotIfStale”或等价机制）。
- 执行模型：ExternalStore 的 listener 只负责 **Signal Dirty**（origin）：幂等地点亮 dirty 并确保同一 microtask 内最多调度一次 tick；不得把外部事件 payload 作为 task 入队（避免队列风暴）。写回发生在 tick flush 的第 0 阶段（before converge/computed），保证同窗派生（computed/source/link）看到的是本次 flush 的 committed 值。
- `coalesceWindowMs`：**Pre-Write** 聚合（写回前聚合）：底层 ExternalStore.getSnapshot 仍为 raw current；coalesce 发生在 trait 写回层（pending/raw 与 committed 分离），只有 committed 值进入 state 与 RuntimeStore snapshot（避免“未 notify 但可观测值已变化”的 tearing）。外部源的 subscribe 回调不延迟，仅延迟 committed 写回与 tick flush。

### 2) TickScheduler（Level 2）

- 默认 tick 边界：microtask；提供 `Runtime.batch` 作为显式强边界（测试/平台事件）。
- Lane 判定与入口：
  - 默认：输入/交互触发的 `dispatch/setState` 与 ExternalStoreTrait 写回视为 **urgent**（不需要“自动识别输入事件”）。
  - 显式降级：允许通过 `dispatchLowPriority` 与 `StateTrait.externalStore({ priority: "nonUrgent" })` 把“可延后/可合并”的链路放入 **nonUrgent**；预算降级只推迟 nonUrgent backlog。
- tick 稳定化（fixpoint）：同步队列 drain 到空；预算超限软降级（仍 flush，但产出 `trace:tick` evidence）。**降级只允许推迟 nonUrgent backlog**：urgent lane 必须在当 tick 内 drain + flush（避免输入/交互丢帧）。注意：一旦推迟了 nonUrgent 的跨模块联动，本次 tick 暴露的快照可能是 **partial fixpoint**（例如 A 已更新而 B 的 nonUrgent link 尚未应用）；此时强一致性降级为最终一致性，但 no-tearing（tickSeq）仍必须成立且降级原因必须可解释。
- Urgent 循环/超限兜底（避免卡死 UI）：若 urgent lane 形成循环依赖（A→B→A）或超过 hard cap（maxSteps/maxMs），TickScheduler MUST 立即中断当 tick 的进一步处理并 flush 当前 snapshot，产出 `trace:tick.result.stable=false`（`degradeReason="cycle_detected"` 或 `budget_*`）；该兜底优先级高于“urgent 不推迟”的原则（属于安全 break，不允许无限循环冻结 UI）。
- “全是 urgent”风险控制：默认把 origin（dispatch/externalStore writeback）视为 urgent，但派生扩散（例如跨模块 declarative link 执行、source refresh）应允许按 policy/trait 标注降为 nonUrgent；并通过 `coalesceWindowMs`/`Runtime.batch(...)` 合并高频触发，保持 budget 与 lanes 仍有实际调度意义。
- Priority inversion（urgent 依赖 nonUrgent 派生）：不提供优先级继承；当 nonUrgent 被推迟时，urgent 将读到旧派生值（partial fixpoint）。对 correctness 敏感的链路应避免依赖 nonUrgent 派生（或将其标注为 urgent / 提高预算 / 降低抖动）。
- `Runtime.batch(...)` 嵌套语义：扁平化（depth 计数）；仅 outermost 触发 flush。无 rollback：异常为 partial commit，但必须在 finally 中确保 flush（避免丢通知与 token 不变量破坏）。
- `Runtime.batch(...)` 使用约束：只作为 **同步边界**；callback 内禁止依赖 `await nextTick` 观察中间态（扁平化语义不会在 await 处隐式 flush）。若需要异步时序，请在 batch 之外显式组织 flush/await。
- 强一致仅对 declarative IR 生效：ExternalStoreTrait + StateTraitProgram + DeclarativeLinkIR；**黑盒 `Process.link` 的写入不进入同 tick fixpoint**（Next Tick best-effort），并在 diagnostics 中显式标注边界。

### 3) React RuntimeStore（无 tearing）

- React 订阅点的“快照真理源”唯一：`useSelector` 读取 “同 tickSeq 的 runtime snapshot”。
- SSR：RuntimeStore topic facade 提供 `getServerSnapshot`（同步只读当前 RuntimeSnapshot，不等待 tick、无 IO）；异步来源必须以 state 的 pending/empty 形态呈现，ExternalStore 若需要稳定首屏必须提供 `getServerSnapshot`，宿主负责 hydration 一致性。
- 订阅通知按 topic 分片：至少按 `ModuleInstanceKey = ${moduleId}::${instanceId}`，可选进一步按 `ReadQueryStaticIr.readsDigest` 收敛，避免任意模块变更导致全局 O(N) notify。
- 低优先级节流：topic facade 的 notify 必须保留现有策略（normal→microtask；low→raf/timeout + maxDelay），优先级由 tick/commit 元数据映射（urgent→normal，nonUrgent-only→low），避免高频 tick flood React renders。
- 模块内 O(N) 回退风险：仅按 `ModuleInstanceKey` 分片只能避免跨模块 O(N)，但模块内仍可能在单字段更新时触发大量 selector 重算。为保持现状（per-selector store + ReadQuery/static deps 的增量触发），`readsDigest/selectorId` 细粒度分片（T035）为必做；dynamic selector 继续依赖 `useSyncExternalStoreWithSelector` equality 兜底正确性（不承诺零开销）。
- T035（防呆约束）：只有当 `ReadQuery.compile(selector).lane==="static"` 且 `readsDigest` 存在且 `fallbackReason` 为空时，才允许创建 selector-topic；topicKey 推荐 `ModuleInstanceKey::rq:${selectorId}`。**selector-topic 的版本增量必须由 core 的 RuntimeStore/TickScheduler 在 tick flush 中产出**（复用 `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts` 的“dirty roots → selectorId”索引或等价机制），React adapter 只消费 topicVersion；禁止在 React 侧直接订阅 `moduleRuntime.changesReadQueryWithMeta(...)` 来“算出哪些 selector 脏了”（容易重回 tearing/双真相源）。
- Sharded notify 的实现采用 **ExternalStore Facade Pattern**：为每个 topicKey 创建独立的 ExternalStore facade（`subscribe` 仅监听该 topic 的版本变化；`getSnapshot` 读取共享 RuntimeSnapshot）。`useSelector` 内部按 handle/selector 选择 facade，从根上避免“一个全局 store 导致所有 selector 都执行”的 O(N)。
- 直观心智：RuntimeStore 本身是“Router”（接收全局 tick/commit 信号，并只把信号转发给受影响 topic）；`useSelector` 订阅 `RuntimeStore.topic(topicKey)`（facade），而不是订阅 `RuntimeStore.global`。
- facade 必须按 `(runtime, topicKey)` 缓存（WeakMap），禁止在 render 路径中为每次调用新建 facade（避免分配/泄漏/订阅抖动）。
- 内存与泄漏防线：facade 只在存在订阅者时存在；当 listeners 归零时必须 detach 底层订阅并从 cache 中移除（`Map.delete`），避免 selector/churn 造成常驻增长。LRU/TTL 对 facade 本身为 N/A（若未来引入 warm-cache，再单独引入 cap/TTL 并以 retainedHeap 门禁守护）。
- 高频 mount/unmount（虚拟列表）下的 GC churn：默认不引入 facade keep-alive/TTL（避免 retained 增长）；若 perf evidence 显示 churn 显著，再引入短时 keep-alive（必须明确 TTL/上限，并纳入 retained/latency 门禁）。
- 单例与多例：topicKey **必须包含** `instanceId`（即 `ModuleInstanceKey = ${moduleId}::${instanceId}`），避免同一 `moduleId` 的不同实例互相唤醒/互相污染；单例模块只是 “instanceId 固定的特例”。
- 订阅通知必须满足 token 不变量（027）：token 未变则对外可见字段不得变化；token 变化必须最终通知（允许合并/节流但不得永不通知）。

### 4) 负优化防线（防 O(N)/延迟/心智坑）

对应用户风险分解（A/B/C），本 plan 采用的处理措施：

- A｜O(N) 伪更新（thundering herd）：通过 **facade + topicVersion** 做分片订阅，做到“模块 A 高频变动不会唤醒只订阅模块 B 的 selector”；并要求在 `runtime-store-no-tearing` 增加语义断言（见 `tasks.md` 的 T033）。
- A1｜模块内 storm：对于 `ReadQuery` static lane，优先用 `selectorId/readsDigest` 做更细 topic（避免“模块内任意字段变化导致所有 selector 运行”）；dynamic selector 回退到 module topic，并通过 `useSyncExternalStoreWithSelector` 的 equality 兜底（仅保证正确性，不保证零开销）。
- A2｜facade retained 增长/泄漏：facade cache 必须在 `listeners=0` 时 detach + `Map.delete`；细粒度 topic 必须按需存在（listeners>0，归零删除；若未来引入 warm-cache 再加 cap/TTL）；并用 `retainedHeapDeltaBytesAfterGc` 回归门禁守护（见 `Perf Evidence Plan`）。
- B｜输入延迟（double scheduling）：urgent lane 的 flush 不得被 nonUrgent backlog 阻塞；如出现 budgetExceeded，仍必须先 drain urgent 并 flush。宿主侧可用 `Runtime.batch(...)` 把“同一事件源的多次变更”合并到同一个 tick（减少 microtask/notify 次数）。
- C｜黑盒心智负担：强一致只覆盖 declarative IR；黑盒 `Process.link` 的写入明确为 Next Tick best-effort。预算降级允许 partial fixpoint，但必须通过 `trace:tick.result.stable=false` 与 `triggerSummary` 解释“为何本次不是强一致”。

## Deliverables by Phase

- **Phase 0（research）**：`research.md`（现状对比、关键裁决、候选方案与风险）。
- **Phase 1（design）**：`data-model.md`、`contracts/*`、`quickstart.md`（对外契约/诊断协议/迁移说明）；并补齐 core-ng 复现强一致所需的 Runtime Service 语义约束（tick 边界/lanes/budget/token 不变量），不能仅靠 `contracts/ir.md` 的 IR 形状。
- **Phase 2（tasks）**：由 `tasks.md` 承载（`$speckit tasks 073` 生成/维护）。
