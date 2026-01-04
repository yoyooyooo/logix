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

## Deepening Notes

- Decision: React 订阅必须走 `RuntimeStore.topic(topicKey)` facade 分片，禁止订阅全局 store 造成跨模块 O(N) selector 执行（source: `spec.md#Clarifications`）
- Decision: topicKey 至少为 `ModuleInstanceKey = ${moduleId}::${instanceId}`，确保单例/多例隔离（source: `spec.md#Clarifications`）
- Decision: facade 缓存按 `(runtime, topicKey)`；listeners=0 必须 detach + `Map.delete`；细粒度 topic 采取按需存在（listeners>0）策略，避免 retained 增长（source: `spec.md#Clarifications`）
- Decision: `ExternalStore.getSnapshot()` 永远返回 raw current；coalesce 在 trait 写回层做 pending/raw 与 committed 分离，保证 committed 才可观测（source: `spec.md#Clarifications`）
- Decision: budget exceeded 只推迟 nonUrgent backlog，urgent 必须当 tick flush；允许 partial fixpoint，但必须用 `trace:tick.result.stable=false` 可解释（source: `spec.md#Clarifications`）
- Decision: `retainedHeapDeltaBytesAfterGc` 用于限制常驻增长（泄漏/缓存膨胀）；分配率/GC 压力门禁可选补 `allocatedBytes`/`peakHeapDeltaBeforeGc`（source: `spec.md#Clarifications`）
- Decision: blackbox `Process.link` 不进入同 tick fixpoint（Next Tick best-effort），并必须在 diagnostics 中标注边界（source: `spec.md#Clarifications`）
- Decision: 模块内 storm：ReadQuery static lane 可选用 `selectorId/readsDigest` 进一步分片；dynamic selector 用 equality 兜底正确性（source: `spec.md#Clarifications`）

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
- `core-ng`: supported（实现需在 core-ng 提供等价语义或显式降级；consumer 仍只依赖 `@logix/core` 的对外契约）

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

Baseline 语义：代码前后（before=现状 per-module ExternalStore；after=runtimeStore + tick）

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`
- Hard conclusion：交付结论必须 `profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）
- 采集隔离：硬结论的 before/after/diff 必须同环境同参数，且必须使用独立目录或 `git worktree` 隔离采集（混杂工作区结果只作线索不得宣称 Gate PASS）
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`（并确保 before/after 的 `meta.matrixId/matrixHash` 一致）
- 前提：以 `NODE_OPTIONS=--expose-gc` 运行采集（否则 heap 指标不可复现/不可比）

**Standard Workload（for `runtime-store-no-tearing` budget）**：

- 模块数：`10`（至少 `2` 个模块在同一 tick 内同时变更，用于证明跨模块无 tearing）
- 依赖深度：`3`（inputs → derived/computed → source/query-like 派生）
- 外部输入：`5` 个 external sources；每 tick 批量触发 `5` 次变更（建议 `Runtime.batch` 包裹）
- UI 订阅：`256` 个 selector watcher（分布到多个模块，包含“同组件同时读多模块”的组合）
- 采样：每 run `50` ticks（warmup 按 matrix 配置丢弃），度量 `timePerTickMs/retainedHeapDeltaBytesAfterGc` 的 p95

**Budgets（first cut, numeric hard ceilings）**：

> 说明：以下为“硬预算上限”（避免仅写 O(1) 流于形式）。首次实现完成后，仍需把实测 baseline 回写到本节，并以 baseline 为准设定回归阈值（默认 20%）。

- Browser（React 订阅/notify + tick flush）：
  - `timePerTickMs.p95 <= 0.30ms`（diagnostics=off）
  - `retainedHeapDeltaBytesAfterGc.p95 <= 256KiB`（diagnostics=off，GC 后 retained heap Δ，用于限制常驻增长）
  - `timePerTickMs.p95 <= 0.60ms`（diagnostics=on）
  - `retainedHeapDeltaBytesAfterGc.p95 <= 768KiB`（diagnostics=on）
  - 相对开销：`timePerTickMs.p95(on) / timePerTickMs.p95(off) <= 1.25`

指标口径澄清：

- `retainedHeapDeltaBytesAfterGc`：限制常驻/retained 增长（泄漏/缓存膨胀），不是 allocation rate。
- 口径：以同一 workload 的“起止强制 GC 后 usedHeap 差值”作为常驻净增（越接近 0 越好）；不以 tick 过程的临时留存为目标指标。
- GC 压力（allocation rate）若要 gate：在 `runtime-store-no-tearing` test 内新增 `allocatedBytes`/`peakHeapDeltaBeforeGc` 等可复现指标（可选，按 matrix 能力决定）。
- `timePerTickMs`：仅覆盖 `tick flush -> notify`（含 scheduler/commit/notify 路径），**不包含** React render/commit；渲染相关的“跟手性”使用 `click→paint` 之类场景单独 gate（避免业务组件复杂度污染基线）。

**Collect (Browser / runtimeStore-no-tearing)**：

- `NODE_OPTIONS=--expose-gc pnpm perf collect -- --profile default --out specs/073-logix-external-store-tick/perf/before.browser.runtimeStore.<sha>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/*runtime-store*`
- `NODE_OPTIONS=--expose-gc pnpm perf collect -- --profile default --out specs/073-logix-external-store-tick/perf/after.browser.runtimeStore.<sha|worktree>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/*runtime-store*`
- `pnpm perf diff -- --before specs/073-logix-external-store-tick/perf/before.browser.runtimeStore...json --after specs/073-logix-external-store-tick/perf/after.browser.runtimeStore...json --out specs/073-logix-external-store-tick/perf/diff.browser.runtimeStore.before...__after....json`

**Collect (Browser / perceived latency guard)**：

- 同步跑一份 `click→paint` 场景作为“跟手性”防线（复用现有 perf suite）：`packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`（scenario=`watchers.clickToPaint`）。
- 采集方式：把该文件纳入同一组 before/after collect（可单独 out），并确保 diagnostics=off 点位不出现显著回归（矩阵预算见 `.codex/skills/logix-perf-evidence/assets/matrix.json`）。

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
│       └── state-trait/external-store.ts        # NEW: externalStore trait runtime/install (internal)

packages/logix-core-ng/
└── src/**                           # 若 core-ng 需要等价实现：通过 Runtime Services/Kernel 选择器接入

packages/logix-react/
├── src/internal/store/
│   ├── RuntimeExternalStore.ts      # NEW: runtime-level ExternalStore for React
│   └── ModuleRuntimeExternalStore.ts # REF: 现状（将被替换或降级为内部实现）
├── src/internal/hooks/useSelector.ts # CHANGE: 从 per-module store 切换到 runtime store
└── test/browser/perf-boundaries/
    └── runtime-store-no-tearing.test.tsx        # NEW: perf + semantic assertion (tickSeq一致)

docs/specs/**                         # 若对外术语/契约升级：同步更新（docs-first）
.codex/skills/project-guide/references/runtime-logix/**  # runtime SSoT 同步（docs-first）
```

**Structure Decision**: 交付能力落在 `@logix/core`（契约 + 默认实现）与 `@logix/react`（runtime-store 订阅适配），其余实现细节下沉 `src/internal/**`；core-ng 通过 Runtime Services/Kernel 选择器保证等价语义或显式降级。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A（本特性不以“引入额外复杂度”为目标；若实现阶段出现必须违反宪章的点，再补表并解释。）

## Design（关键机制）

### 1) ExternalStore 归一化（Level 1）

- `ExternalStore<T>` 必须具备同步 `getSnapshot()`；Stream 仅作为语法糖（必须提供 `initial/current`，否则 fail-fast）。
- SSR：ExternalStore 可选 `getServerSnapshot()`（同步、无 IO）；React adapter 在 server render 时优先用它（否则回退到 `getSnapshot()`），宿主负责 hydration 一致性（本特性不做自动注水/rehydrate）。
- 容错：ExternalStore.getSnapshot() 同步抛错必须被 trait 层捕获；熔断该 trait（保留 last committed 值），并通过 diagnostics 记录 Warn（不得崩溃整个 runtime）。
- `StateTrait.externalStore` 只负责“写回 state field”，派生/联动用 `computed/link/source` 表达（保持 SRP）。
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
- 订阅通知按 topic 分片：至少按 `ModuleInstanceKey = ${moduleId}::${instanceId}`，可选进一步按 `ReadQueryStaticIr.readsDigest` 收敛，避免任意模块变更导致全局 O(N) notify。
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
