# Implementation Plan: 013 Auto Converge Planner（无视场景的及格线）

**Branch**: `[013-auto-converge-planner]` | **Date**: 2025-12-16（Updated: 2025-12-18） | **Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/013-auto-converge-planner/spec.md`  
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/013-auto-converge-planner/spec.md`

> 约定：本文中的三位数编号（如 009/014/016）均指 `specs/*` 下的 spec 目录；`016` 即 `specs/016-serializable-diagnostics-and-identity`。

## Cross-Spec Alignment（上层视角）

> 本节吸收“Runtime V3 加固集群”的上层视角：把 013 放到 016/011/010 的依赖链路中约束规划边界，避免在实现阶段临时补丁化。

- **依赖链路（建议顺序）**：`016（Identity/可序列化证据）` → `011（Lifecycle 容器/严格屏障）` → `013（Planner 控制面）` → `010（Form 场景验收）`
- **013 的定位**：提供与领域无关的性能控制面与可回放证据；010 作为高压场景主要消费者，用于验证 013 的默认策略能否做到“无需手动开关的正确性/高性能”。
- **风险显式化（010 反哺 013）**：`traitConvergeDecisionBudgetMs=0.5ms` 在“简单列表/小 steps”场景可能是显著开销，导致 auto 常回退 full；因此必须把 `budget_cutoff`（决策预算熔断）视为关键刹车片，并把 010 的矩阵点纳入 014/013 的对抗性覆盖候选集（但 013 不引入 form 特判）。
- **实施 gate（避免实现跑在不稳地基上）**：在 016 的 core hardening（`instanceId` 单锚点 + `JsonValue` 导出边界 + off 近零成本）落地前，013 仅允许推进 contracts/规划；不进入任何运行时实现阶段（避免 `unknown/cause/state` 对象图污染导出链路）。

## Summary

在 StateTrait 派生收敛（converge）上引入默认开启的 `auto` 策略：通过 Module build/加载阶段的静态 Converge IR（整型 ID + topo order/邻接表等紧凑结构）与 module instance 范围内的 Execution Plan Cache（Dirty Pattern → Execution Plan），在任何写入分布下保证 `auto` 不劣于 `full`（默认噪声预算 5%），同时在稀疏写入下获得显著加速；并输出 Slim、可序列化的决策摘要（含缓存/失效/止损/配置来源证据），与 `specs/014-browser-perf-boundaries` 的边界地图同词汇对齐，形成可预测的对外性能心智模型与可回放解释链路。覆盖与止血路径遵循“更局部赢”：优先在 `@logixjs/react` 的 `RuntimeProvider.layer` 范围内覆盖 converge 配置（Layer/Tag，继承全局 runtime 再叠加差量）。本特性只负责“证据面与运行时契约”；Devtools 的 Audits/Timeline 等深挖能力将由后续独立 Devtools spec 在 `specs/005-unify-observability-protocol` 的宿主无关观测底座之上实现；同时对齐 `specs/016-serializable-diagnostics-and-identity` 的导出边界与稳定身份硬门，避免 `unknown/cause/state` 等对象图进入跨宿主链路导致导出崩溃。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM） + Node.js 20+  
**Primary Dependencies**: effect v3、`@logixjs/core`（StateTransaction/StateTrait/Runtime）、`@logixjs/react`（Provider override 载体）、Devtools/Sandbox（诊断事件消费方）  
**Storage**: 内存态（Effect Context/Scope + SubscriptionRef/Ref），不引入持久化存储  
**Testing**: Vitest + `@effect/vitest`（core/runtime 语义）；性能主跑道复用 `specs/014-browser-perf-boundaries` 的 Vitest Browser 模式集成压测  
**Target Platform**: Node.js 20+（runtime/test）+ modern browsers（Devtools/014 基线）  
**Project Type**: pnpm workspace monorepo（`packages/*` + `apps/*` + `examples/*` + `specs/*`）  
**Performance Goals**: `auto <= full * 1.05`（p50/p95，噪声预算默认 5%）；perf matrix 默认每个矩阵点至少运行 5 次并记录波动（默认目标：p50/p95 相对误差 ≤ ±3%）；`traitConvergeDecisionBudgetMs` 默认 0.5ms（超时立即回退 full）；Static IR 构建耗时输出 `staticIrBuildDurationMs`（p50/p95）并对齐 014 的体验预算档位；013 的 “full 下界” gate 在 014 报告/diff 中绑定 `metricCategories.category=runtime`（`category=e2e` 仅记录，不作为 gate）；默认以 `Diagnostics Level=off` 作为硬 gate 环境（`light|full` 仅记录 overhead，不影响 pass/fail）  
**Constraints**: 事务窗口禁 IO/await；决策路径纯同步（禁止 `Promise`/`Effect.async`/`Effect.promise`/`Effect.tryPromise`）；稳定标识（instanceId/txnSeq/opSeq/eventSeq）；诊断分档 `off|light|full` 近零成本（`off` 不产出任何可导出的 `trait:converge` 事件/摘要；`light` 的 `data.dirty` 仅允许 `dirtyAll`，不输出 `roots/rootIds`；`full` 仅允许 roots 摘要：`rootCount` + `rootIds` 前 K 个（默认 K=3，可配置；硬上界 16）+ `rootIdsTruncated`，禁止全量列表；事件引用静态 IR 使用 `staticIrDigest=instanceId+\":\"+generation`，并在 EvidencePackage 内按 digest 去重导出 `ConvergeStaticIR`（导出位置约定为 `EvidencePackage.summary.converge.staticIrByDigest`）；`ConvergeStaticIR` 的 FieldPath 映射复用 009 的 `FieldPath[]` schema）；事件 Slim 且可序列化（对齐 016/005 的导出边界 `JsonValue` 硬门，且 converge 证据应尽量“按构造即 JsonValue”，避免在热路径触发递归投影/降级扫描）；缓存资源上界 + 低命中自保护 + 严格失效 + 模块级回退；覆盖优先级确定且可审计（Provider > runtime moduleId > runtime default > builtin，且下一笔事务生效）；拒绝向后兼容（迁移说明替代兼容层）  
**Effect-Native Leverage**: Kernel stays Sync（事务内不引入 `Fiber` 并发试探 / `race` / `STM` 等语义，避免在 JS 主线程与 React 受控输入场景中引入不可证明的调度与重试行为）；把 `Cache Generation` 与覆盖配置从手写状态机/查表升级为 effect 的 `Scope/Resource` 与 `Tag/Layer` 基础设施，并用 `FiberRef` 承载稳定上下文字段（`instanceId/txnSeq/opSeq/configScope`），减少协议侧推断与兼容补齐需求。  
**Scale/Scope**: steps 规模从百级到千级；高基数 dirty-pattern/列表写入/图变化等对抗性场景必须覆盖；单进程多 module instance 并存且互不污染

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Research)

- **Intent → Flow/Logix → Code → Runtime**：用户意图是“无视场景也及格”的性能保障与可解释链路；落到 Runtime 即 StateTransaction 内的 converge 调度策略：在事务窗口结束前完成派生字段收敛，并以最小 IR/证据包把“写入→受影响范围→执行路径→结果”串起来供 Devtools/014 消费与回放。
- **Docs-first & SSoT**：本特性依赖并扩展 `specs/009-txn-patch-dirtyset`（dirty-set/IR/稳定标识）与 `specs/014-browser-perf-boundaries`（浏览器基线/边界地图），并受 `specs/016-serializable-diagnostics-and-identity`（可序列化诊断与稳定身份）约束；本特性同时显式收敛已识别的漂移面：更新 `.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/05-runtime-implementation.md`（converge 模式补齐 `auto` 与 requested/executed 口径）、更新 `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`（固化 converge 最小证据形态与分档裁剪规则），同步 `apps/docs/content/docs/**` 的用户文档口径，并标注/更新 `specs/007-unify-trait-system/review.md` 中已过期的默认与枚举约束，避免规范/实现/文档三方漂移。
- **Contracts**：会新增/调整 converge 的对外契约：`traitConvergeMode=auto`（默认）、`traitConvergeDecisionBudgetMs`、Execution Plan Cache 证据字段、以及 ConvergeSummary 的解释字段；协议以本特性的 `contracts/*` 固化，并与 009 的 txn-meta/dirty-set schema 对齐（不复制、不漂移），同时遵循 016/005 的导出边界（`JsonValue`）硬门。
- **IR & anchors**：不引入第二套真相源；Static IR 仍遵循 009 的 Static IR 口径（可导出/可合并/可冲突检测），Converge Static IR 作为其运行时加速内核；Dynamic Trace 以稳定锚点（instanceId/txnSeq/opSeq/eventSeq）关联 txn-meta 与 converge 决策/执行证据。
- **Deterministic identity**：instance/txn/op/event 保持稳定派生（禁止随机/时间默认）；`FieldPathId/StepId` 明确仅在同一 `Cache Generation` 内稳定，不作为跨 session 的持久化契约（避免误用）。
- **Transaction boundary**：决策路径必须纯同步（不得引入 Promise/Effect.async 边界），并在 CI 中通过测试或静态扫描断言；事务窗口内禁止 IO/await；任何“未知写入/不可定位写入”必须退回 full 并可解释。
- **Performance budget**：触及热路径包括：dirty-pattern canonicalization、planner 决策、Execution Plan cache lookup、converge 执行循环；回归防线以 014 的浏览器边界地图为主跑道，门槛为 `auto/full ≤ 1.05`，并补充决策预算与 Static IR 构建耗时证据字段（`staticIrBuildDurationMs`）。
- **Diagnosability & explainability**：在 txn 摘要/Devtools 事件中输出 requestedMode/executedMode、cold-start、budget cut-off、cache hit/miss/evict、generation bump/miss reason 等 Slim 证据；`off` 档位不产出任何可导出的 converge 证据，`light` 档位保持最小可解释（例如 `data.dirty` 仅 `dirtyAll`），开启时成本可量化（与 014 报告同口径），且必须满足 016 的可序列化硬门（禁止把 `Cause`/闭包/对象图进入可导出 payload）。
- **User-facing performance mental model**：对外关键词固定为 5 个（Transaction / Patch&Dirty-set / Converge Mode / Diagnostics Level / Module Override），粗粒度成本模型与优化梯子沿用 `spec.md`，并要求 014 报告与用户文档使用同一套词汇（避免同义词漂移）。
- **Intelligent strategies**：时间/空间置换为（静态 IR + per-instance plan cache）换取热路径 O(1) 决策与执行范围缩小；baseline 下界为 full；刹车片包括：cold-start 必 full、`traitConvergeDecisionBudgetMs` 超时回退、cache 容量上界/逐出、低命中率自我保护、generation++ 严格失效与抖动保护、模块级覆盖/回退。
- **No hidden magic values**：阈值/预算/容量必须可配置且可观测，且在摘要中输出“本次使用的阈值/预算 + 触发原因”（含决策预算/执行预算/dirtyAll 降级阈值/缓存容量等）。
- **Negative boundary map**：对抗性场景必须覆盖高基数/低命中率、重复 pattern（应命中）、图变化（应失效）、列表/动态行写入（归一化/基数爆炸风险）与 generation 抖动；证据以 014 报告的 before/after diff 为准。
- **Breaking changes**：默认 converge 模式从 `full` 调整为 `auto`；新增配置键与摘要字段；迁移说明写入 `specs/013-auto-converge-planner/quickstart.md`，并在实现阶段同步 `docs/reviews/99-roadmap-and-breaking-changes.md` 与用户文档（不提供兼容层）。
- **Quality gates**：合并前至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；并跑 014 的浏览器压测子集（覆盖 auto/full 下界、cache hit/miss、generation 失效、列表归一化、高基数低命中）。证据记录落点：`specs/013-auto-converge-planner/checklists/quality-gates.md`。

## Project Structure

### Documentation (this feature)

```text
specs/013-auto-converge-planner/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── checklists/
│   └── quality-gates.md
└── tasks.md             # Phase 2 output ($speckit tasks command - NOT created by $speckit plan)
```

### Source Code (repository root)

```text
packages/logix-core/
├── src/internal/runtime/core/env.ts                 # StateTransactionRuntimeConfig 扩展 auto/decision budget + StateTransactionOverridesTag
├── src/internal/runtime/core/DebugSink.ts           # trait:converge 事件位导出边界（JsonValue）与锚点（instanceId）
├── src/internal/runtime/core/DevtoolsHub.ts         # ring buffer 存储形态（导出边界）
├── src/internal/runtime/ModuleRuntime.ts            # 合并 runtime/module 配置，默认 auto
├── src/internal/state-trait/converge.ts             # planner/执行循环（static IR + cache + decision summary）
├── src/internal/field-path.ts                       # dirty-roots canonicalization / key 纯整数化策略落点（公共 FieldPath）
├── src/internal/state-trait/ir.ts                   # Static IR 导出（对齐 009），供 Devtools/014 使用
└── test/                                            # auto 语义/缓存/失效/同步性/对抗性用例

packages/logix-react/                                # Provider 范围覆盖（RuntimeProvider.layer）
packages/logix-devtools-react/                       # 后续：在 005 的协议/聚合底座之上做 converge 深挖入口（Audits/Timeline）
packages/logix-sandbox/                              # 可选：对齐事件协议（Slim/可序列化）

specs/014-browser-perf-boundaries/                   # 性能基线主跑道（013 的门槛在此验收）
.codex/skills/project-guide/references/runtime-logix/ # Runtime SSoT（语义与契约）
apps/docs/content/docs/                              # 用户文档（产品视角）
```

**Structure Decision**: 013 的核心语义与优化落点在 `packages/logix-core` 的 StateTrait converge；对外协议以 `specs/013-auto-converge-planner/contracts/*` 固化并与 009/014 对齐；Devtools 消费侧稳定性（不白屏/可降级）为必须，展示增强与 Sandbox 对齐按需在 Devtools/Sandbox 包中增量补齐。

## Complexity Tracking

No violations identified for this feature at planning time.

## Phase Plan (Outputs)

### Phase 0 - Outline & Research

- 产出 `specs/013-auto-converge-planner/research.md`：明确静态 IR 数据结构、Dirty Pattern key 表达、Execution Plan Cache（容量/逐出/作用域）、`Cache Generation → GenerationScope` 的资源边界与 bump 语义、覆盖配置的 Tag/Layer 载体与 `configScope` 证据、`FiberRef` 上下文总线、generation++ 触发源与抖动自保、决策纯同步性约束门、以及与 009/014/016 的协议对齐点；每个决策包含取舍与替代方案。

### Phase 1 - Design & Contracts

- 产出 `specs/013-auto-converge-planner/data-model.md`：固化 ConvergeStaticIR / DirtyPattern / ExecutionPlan / CacheStats / ConvergeDecisionSummary 的字段与关系，并标注哪些字段为“对外可持久化证据”、哪些仅为 generation 内部锚点。
- 产出 `specs/013-auto-converge-planner/contracts/*`：以 OpenAPI 3.1 + JSON Schema 固化 converge 扩展协议（以 009 的 DynamicTrace/FieldPath schema 为基底，新增 `trait:converge` 事件 data schema），并定义 Devtools/014 消费的最小字段集；同时要求导出边界满足 016（`JsonValue`、稳定锚点、Slim 预算）。
- 产出 `specs/013-auto-converge-planner/quickstart.md`：说明默认 `auto`、模块级覆盖/回退、决策/执行预算、以及如何用 014 报告与事务摘要定位回归与调参。
- 同步更新 SSoT 与用户文档：`.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/05-runtime-implementation.md`、`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`、`apps/docs/content/docs/**`（围绕 `auto` 默认、证据字段与分档语义），并标注/更新 `specs/007-unify-trait-system/review.md` 中与 013 冲突的口径。
- 更新 agent context：运行 `/Users/yoyo/Documents/code/personal/intent-flow/.specify/scripts/bash/update-agent-context.sh codex`（需 `SPECIFY_FEATURE=013-auto-converge-planner`），同步本计划的技术上下文与目录结构。

### Phase 1 - Constitution Re-check (Post-Design)

- 确认 contracts 已固化：下界门槛（014 `category=runtime` gate，且默认用 `Diagnostics Level=off` 验收）、决策预算、缓存证据字段、generation 失效原因与 `off|light|full` 分档语义（`off` 不产出 `trait:converge`；`light` 的 `data.dirty` 不含 `roots/rootIds`）；
- 确认事务边界约束可被 CI 断言（纯同步性约束门）；
- 确认 014 报告字段与对外心智模型同词汇；
- 确认 breaking change 的迁移说明落点清晰（quickstart + reviews + 用户文档）；
- 确认导出边界满足 016：`meta/data` 为 `JsonValue`、锚点稳定、Slim 预算可审计。

### Phase 2 - Implementation (Planning Only)

- Phase A（Static IR）：在 Module build/加载阶段构建 ConvergeStaticIR（FieldPathId/StepId/邻接表/topo order），并记录 `staticIrBuildDurationMs`。
- Phase B（Auto 决策）：新增 `auto` 模式与 `traitConvergeDecisionBudgetMs`；实现 cold-start/full 下界/dirtyAll 降级与 `executedMode=full|dirty`；产出决策摘要与可观测证据。
- Phase C（Plan Cache & 自保护）：Execution Plan Cache（LRU/容量/逐出/作用域），低命中率自我保护，`Cache Generation → GenerationScope`（bump = close + rebuild）与抖动保护，严格失效与回归测试覆盖。

## Constitution Re-check (Post-Design Results)

- **Contracts**：见 `specs/013-auto-converge-planner/contracts/openapi.yaml` 与 `specs/013-auto-converge-planner/contracts/schemas/*`（引用 009 schema）。
- **Deterministic identity**：`FieldPathId/StepId` 明确仅 generation 内稳定（见 `specs/013-auto-converge-planner/data-model.md`），对外证据仍以 009 的 instanceId/txnSeq/opSeq/eventSeq 为锚点。
- **Transaction boundary**：纯同步性约束门与禁止 Promise/Effect.async 边界（见 `specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json` 的 reason/预算字段与 `specs/013-auto-converge-planner/research.md` 的 Decision）。
- **Performance budget**：014 主跑道与门槛（`auto/full ≤ 1.05`）与 `staticIrBuildDurationMs` 证据字段在 contracts/quickstart 中明确。
