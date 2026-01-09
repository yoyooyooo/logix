# Implementation Plan: 060 Txn Lanes（事务后续工作优先级调度 / 可解释调度）

**Branch**: `060-react-priority-scheduling` | **Date**: 2025-12-29 | **Spec**: `specs/060-react-priority-scheduling/spec.md`  
**Input**: Feature specification from `specs/060-react-priority-scheduling/spec.md`

## Summary

目标：把“关键交互优先、非关键补算可延后但最终必达（且可解释）”固化为 Logix Runtime 的**可验收闭环**，并与 046 的 core-ng 路线一致。

本特性的关键裁决（本 plan 阶段就写死，避免实现漂移）：

1. **不做可中断事务**：事务窗口仍同步、零 IO/async；“让出/分片”只发生在事务之外的 Follow-up Work（例如 deferred converge flush、低优先级通知的合并 flush）。
2. **lane-aware queue（核心 p95 杠杆）**：把 `txnQueue` 升级为车道队列：紧急更新不得被非紧急 backlog 堵塞；非紧急 Follow-up Work（例如 043 的 deferred converge flush）必须以 non-urgent 进入队列，并支持合并/取消（跳过中间态）以避免“补算拖尾”。
3. **Work loop（分片追平）**：非紧急 backlog 必须按预算分片执行，并在片与片之间给紧急更新让路；当超过上界时触发可解释的饥饿保护（升档/强制追平），但仍不得形成一次性长事务拖尾。
4. **policy 可覆盖**：060 阶段默认不启用（opt-in）；启用范围支持 runtime_default / module / provider / instance 覆盖，并提供运行期强制回退/对照模式（用于止血与定位）。默认开启迁移见 `specs/062-txn-lanes-default-switch-migration/`。
5. **先对齐已有机制**：`dispatchLowPriority`（低优先级通知，不改变事务语义）+ 043 的 deferred converge time-slicing（延后派生收敛）在术语/证据字段/门禁上统一到 “Txn Lanes” 心智模型下，形成可验收闭环；后续再扩面到 selector graph / watcher 等。
6. **证据门禁**：A/B（off vs on）+ `$logix-perf-evidence` 的 Node + Browser before/after/diff；同时补齐 Slim 诊断事件，解释 backlog、预算与饥饿保护。
7. **用户文档必须同步**：面向业务开发者解释“什么时候用 / 怎么选 / 怎么验证 / 怎么回退”，且术语与证据字段一致（避免“实现懂、用户不懂”的口径漂移）。
8. **统一 Lanes 证据与 Devtools 展示（吸收 057 的交集）**：把 Txn Lanes 与 Read Lanes（`specs/057-core-ng-static-deps-without-proxy/`）的“lane 证据字段 → DebugSink 投影 → Devtools 汇总视图”收敛到同一条链路，避免两套 lane 心智模型/并行真相源；因此 057 的 US2（Devtools 车道展示/投影/测试/用户文档入口）由 060 统一交付，057 只保留读车道协议与 React 侧 meta 产出。
9. **把 051/052 当作 060 的硬约束，而非并行开工**：不在 060 迁移期间另立 `051/052` 做“补救式优化”；060 的实现必须满足 `diagnostics=off` 近零成本/低分配倾向，并以 perf evidence 与必要守护测试达标，否则 060 不算完成。
10. **默认开启的路线（已在 062 完成）**：060 阶段仍默认关闭；默认切换迁移 spec 为 `specs/062-txn-lanes-default-switch-migration/`，并要求：默认开关与回退口径可证据化、Node+Browser before/after/diff 预算达标、`diagnostics=off` 近零成本不回归、用户文档与迁移说明完整。

## Existing Foundations（直接复用）

- 实例级串行队列：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnQueue.ts`
- 事务窗口与 commit meta（commitMode/priority）：`packages/logix-core/src/internal/runtime/core/module.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- 低优先级入口（只写 commit meta）：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`（`dispatchLowPriority`）
- React ExternalStore 低优先级通知调度：`packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts`（基于 `meta.priority`）
- 043 deferred converge time-slicing：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`、`packages/logix-core/src/internal/runtime/core/ModuleRuntime.traitConvergeConfig.ts`、`packages/logix-core/src/internal/state-trait/converge.ts`
- 并发/批处理解释文档（已有 `dispatchBatch`/`dispatchLowPriority` 心智模型）：`docs/impl-notes/08-concurrency-and-batching.md`

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3（override 3.19.13）、`@logixjs/core`、`@logixjs/react`  
**Storage**: N/A（纯内存态；证据落盘到 `specs/060-*/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`；React 行为/浏览器 perf 用 Vitest browser）  
**Target Platform**: Node.js 20+ + modern browsers（headless）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:

- 在“高频交互 + 大量非关键补算/通知”的基准场景下，启用 Txn Lanes 后关键交互窗口 p95 ≥ 2× 改善；并且 backlog 存在时关键交互不被明显拖尾（p95/长尾无回归）。
- `diagnostics=off` 下新增能力接近零成本（无常驻分配/计时）；开启诊断时提供 Slim、可序列化、可关联的解释链路（预算可预估）。

**Constraints**:

- 统一最小 IR（Static IR + Dynamic Trace）；诊断事件 Slim 且可序列化（JsonValue）。
- 稳定锚点去随机化：`moduleId/instanceId/txnSeq/opSeq` 可复现（不引入 random/time default）。
- 事务窗口禁 IO/async；禁止写逃逸（业务不可写 SubscriptionRef 等）。
- 双内核演进：consumer 不直接依赖 `@logixjs/core-ng`；core/core-ng 支持矩阵与证据门槛必须显式。

**Scale/Scope**:

- 优先覆盖单模块单实例的高频交互；不在本特性里引入跨实例全局优先级系统。
- 先统一“事务后续工作”的调度与证据口径，不引入渲染级别的可抢占/可恢复调度器。

## Kernel support matrix

- `core`: supported（先落地在 builtin core 路径）
- `core-ng`: trial-only → supported（必须在 045 contract harness + Node+Browser 证据跑道下证明语义与预算；core-ng 独立包后再宣称 supported）

## Perf Evidence Plan（MUST）

Baseline 语义：**策略 A/B**（同一份代码下 off vs on）

- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `matrixId/matrixHash` 必须一致）
- Hard conclusion：交付结论至少 `profile=default`（`quick` 仅线索；必要时 `soak` 复核）
- 采集隔离：before/after/diff 必须在独立 `git worktree/单独目录` 中采集；混杂工作区结果仅作线索不得用于宣称 Gate PASS
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`
- core-ng（trial）不得偷跑/跳过：一旦 core-ng 进入 trial-only（或宣称 supported），同一套 off/on 证据必须在 core-ng 下再跑一轮（Node+Browser），并仍然遵守 matrix SSoT；任何 suite 缺失/不稳定都应视为 blocker，不得为省事跳过。

**Browser（建议新增 perf-boundary 用例）**:

- 新增 `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`：同一交互序列下对照 off/on（覆盖 urgent p95 + backlog 追平）。
- collect（before）：`pnpm perf collect -- --profile default --out specs/060-react-priority-scheduling/perf/before.<worktree>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/*txn-lanes*`
- collect（after）：`pnpm perf collect -- --profile default --out specs/060-react-priority-scheduling/perf/after.<worktree>.<envId>.default.json --files packages/logix-react/test/browser/perf-boundaries/*txn-lanes*`
- diff：`pnpm perf diff -- --before specs/060-react-priority-scheduling/perf/before...json --after specs/060-react-priority-scheduling/perf/after...json --out specs/060-react-priority-scheduling/perf/diff.before...__after...json`

**Node（最小回归防线）**:

- 复用 converge.txnCommit 相关 bench，并补一条“work loop slicing 开销/粒度”的 microbench：用于验证 budget 切片不会吞掉 p95 收益（过粗无法让路、过细带来调度开销）；同时要求默认路径（off）不回归。

Failure Policy：出现 `comparable=false` / `stabilityWarning/timeout/missing suite` → 禁止下硬结论，必须复测（profile 升级或缩小子集）并在 quickstart 标注不确定性。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性属于 Runtime 执行面（txnQueue → StateTransaction → follow-up scheduling）与 React 适配层的协同；业务侧写法不变，只新增“可选策略 + 可解释证据”。
- **Docs-first & SSoT**：事务边界/稳定锚点/证据门禁以 `.specify/memory/constitution.md` 与 `docs/specs/drafts/topics/runtime-v3-core/*` 为裁决；相关既有 spec：045/043/044/046（read-only 依赖）。
- **Contracts**：固化 Txn Lane policy 与 LaneEvidence 的最小可序列化字段（本 spec 的 `contracts/`），并要求与 Debug/Devtools 消费面口径一致（避免并行真相源）。
- **IR & anchors**：不改变统一最小 IR，只允许追加 Slim 的调度/积压摘要字段；锚点继续使用 `moduleId/instanceId/txnSeq/opSeq`。
- **Deterministic identity**：不引入 random/time 默认锚点；若需要“补算批次”标识，使用实例内的递增序号并可被证据解释。
- **Transaction boundary**：事务窗口内仍禁止 IO/async；延后/合并/补算只能通过事务外调度窗口实现，并最终仍以事务提交对外暴露（0/1 commit 语义保持）。
- **Internal contracts & trial runs**：调度策略以可注入配置/服务表达（避免 magic fields）；必须可在 TrialRun/RunSession 下隔离并导出证据（不依赖进程级全局单例）。
- **Dual kernels（core + core-ng）**：计划明确 kernel support matrix；consumer 不引入 `@logixjs/core-ng` 直依赖；core-ng 路径必须通过 045/047 的验证/证据跑道证明一致性与预算。
- **Performance budget**：触及核心路径（每 txn 的决策与后续调度）；必须有 Node+Browser 证据门禁与回归防线。
- **Diagnosability & explainability**：新增 LaneEvidence（backlog/预算/饥饿保护/原因摘要）；`diagnostics=off` 近零成本。
- **User-facing performance mental model**：对外文档给出 ≤5 关键词、粗成本模型与优化梯子，并与证据字段对齐（防术语漂移）。
- **Breaking changes**：默认关闭；若未来切默认开启，必须另立迁移 spec 并提供回退/证据门禁；若新增 public API/配置键，提供迁移/启用说明（以迁移文档替代兼容层）。
- **Public submodules**：新增类型/入口应落在 `packages/logix-core/src/Runtime.ts` 或对应 public submodule；实现沉到 `src/internal/**`，不外泄 internal。
- **Quality gates**：实现阶段至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`；涉及 browser perf-boundary 的部分需跑对应 browser project + `$logix-perf-evidence`。

### Gate Result (Pre-Design)

- PASS（默认关闭；不破坏事务边界与稳定锚点；证据门槛与文档义务已写入）

### Gate Result (Post-Design)

- PASS（已产出 `research.md`/`data-model.md`/`contracts/*`/`quickstart.md`；无新增并行协议；后续实现必须按本 plan 的证据门禁执行）

## Project Structure

### Documentation (this feature)

```text
specs/060-react-priority-scheduling/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── README.md
│   └── schemas/
│       ├── txn-lane-policy.schema.json
│       └── txn-lane-evidence.schema.json
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
├── env.ts
├── ModuleRuntime.dispatch.ts
├── ModuleRuntime.transaction.ts
└── ModuleRuntime.txnQueue.ts

packages/logix-core/src/internal/state-trait/
└── converge.ts

packages/logix-react/src/internal/store/
└── ModuleRuntimeExternalStore.ts

packages/logix-devtools-react/src/internal/ui/overview/
└── OverviewDetails.tsx

packages/logix-react/test/browser/perf-boundaries/
└── txn-lanes.test.tsx (new)

packages/logix-react/test/RuntimeProvider/
└── runtime-react-render-events.integration.test.tsx

packages/logix-core/test/Middleware/
└── Middleware.DebugObserver.test.ts

packages/logix-devtools-react/test/internal/
└── EffectOpTimelineView.test.tsx

apps/docs/content/docs/guide/advanced/
└── txn-lanes.md (new) 或扩展既有控制面文档

apps/docs/content/docs/guide/essentials/
└── react-integration.md

docs/impl-notes/
└── 08-concurrency-and-batching.md
```

## Watch-outs & Mitigations（review 吸收）

- **Work loop 切片粒度**：实现 T009 时必须同时推进 microbench（切片开销/让路效果），否则很容易出现“看起来 time-slicing 了但仍然拖尾”或“让路做到了但调度开销吞掉收益”。
- **React startTransition 语义缝隙**：Logix 的 lanes 延后的是 runtime 内部 Follow-up Work（以及可能的 ExternalStore 通知），不是 React 自己的渲染调度；用户文档必须明确“内部延后计算/通知”与“React 延后渲染（startTransition）”的区别与组合方式。
- **双内核证据成本**：core-ng 仍是 trial 时更容易出现“为了省事跳过某些 suite”的诱因；本特性要求严格复用 matrix SSoT 与相同的 evidence check，不得在 core-ng 下偷偷降级验证口径。
- **现代浏览器渐进增强（isInputPending）**：`navigator.scheduling.isInputPending` 可作为“输入待处理”信号帮助 work loop 更快让路，但它对渲染/raf/React update 并不完备；只能作为可选增强、必须保留硬上界，并且在不支持环境下必须退化为纯时间预算策略（不改变语义）。

**Structure Decision**:

- policy/config 入口优先收敛到既有 `Runtime.stateTransaction` 控制面（runtime_default / module / provider / instance），避免新增并行旋钮；
- 调度与证据以“事务外 follow-up window”为边界：不在事务中断点 yield；通过队列 + timer 合并/延后；
- React 侧继续基于 `StateCommitMeta.priority` 做通知调度，但与核心 policy 的术语/上界/证据字段对齐，避免两套“低优先级”叫法互相打架。

## Complexity Tracking

无（本特性默认关闭；不引入宪章违例；复杂度主要来自“证据口径统一”与“跨层心智模型一致性”）
