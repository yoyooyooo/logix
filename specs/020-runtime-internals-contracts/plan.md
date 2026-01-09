# Implementation Plan: Runtime Internals Contracts（Effect‑Native DI + Kernel/Runtime Services + TrialRun/Reflection）

**Branch**: `[020-runtime-internals-contracts]` | **Date**: 2025-12-21 | **Spec**: `specs/020-runtime-internals-contracts/spec.md`
**Input**: Feature specification from `specs/020-runtime-internals-contracts/spec.md`

## Summary

本特性在**对外 API/行为完全不变**的前提下，把运行时内部从“跨文件长参数列表接线”升级为“Effect‑Native 的 Service/Layer 图”，并趁这波顺手梳理当前内部全链路（Runtime.make → AppRuntime → ModuleRuntime → BoundApi/Logic → Txn/Traits → Debug/Devtools）里最值得一起改的耦合点。

按 RIO 顺序（收益/影响/落地成本）交付：

1. **统一依赖注入内核（RuntimeKernel）**：把 ModuleRuntime/BoundApiRuntime/事务/诊断等共享依赖收敛成单一装配点与可注入服务，消除参数爆炸。
2. **子系统可替换（Runtime Services）**：把调度/事务执行/dispatch/traits/诊断等拆成最小可替换契约，支持“按模块实例”覆写（默认 strict、零泄漏）。
3. **内部 hooks 规范化（RuntimeInternals Runtime Service）**：将 runtime 上的隐式 `__*` 协作协议收敛为明确的内部契约与访问入口；仓库内集成方不再依赖散落的 magic 字段（必要时保留薄 shim 过渡）。
4. **平台试运行底座（可 Mock、一次跑出证据/IR）**：支撑平台侧在浏览器/Node 环境做“受控试运行”，按会话/实例注入 Mock/覆写并导出可机器处理证据与关键 IR 摘要，且同进程并行不串扰。
5. **全链路迁移与去耦（高 ROI）**：将 BoundApiRuntime、trait-lifecycle、state-trait、`@logixjs/react` strict imports 解析等内部消费方统一迁移到内部契约入口，避免“只改 ModuleRuntime 但周边仍靠 magic 字段”的半吊子结构。
6. **性能与诊断门槛固化**：复用现有 perf runner（014/017/019），并为“服务化重构”补齐可解释的配置来源/生效策略证据（contracts‑first），确保 off 近零成本且不回退。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM）  
**Primary Dependencies**: `effect` v3（^3.19.8）、pnpm workspace（`@logixjs/*`）、Vitest  
**Storage**: N/A（内存态：`SubscriptionRef`/`PubSub`/`Queue`/`FiberRef`）  
**Testing**: Vitest（`vitest run`）；Effect-heavy 用例优先 `@effect/vitest`  
**Target Platform**: Node.js 20+（脚本/测试/基线；当前本地 v22.21.1）+ 现代浏览器（React/Devtools）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:
- 目标：**重构不回退**（默认配置下 hot path 的 p95 延迟/分配/内存不出现显著退化）
- 门槛：p95 延迟退化 ≤ 5%，分配/内存退化 ≤ 5%，吞吐 ≥ 95% 基线（基线以 014/019 的 quick profile 为主口径）
- 测量方式：复用 `logix-perf-evidence` 的 collect/diff（统一入口：`pnpm perf`），并将“工作区 before/after”记录落到本特性的 `specs/020-runtime-internals-contracts/*`（见 Phase 1/2 规划）
**Constraints**:
- Strict by default：禁止隐式全局 fallback；跨模块解析必须基于 imports-scope/Context
- 诊断事件 Slim & 可序列化；诊断关闭时额外开销接近零
- 稳定标识：instance/txn/op 等不得默认使用随机/时间；必须可复现与可回放
- 事务窗口内禁止 IO/await；不得提供写逃逸
- 仓库内“内部 hooks/内部协作协议”必须可被封装、可替换、可 Mock，并在并行试运行场景下保持隔离（避免全局单例/全局可变污染试跑结果）
- RunSession 隔离必须覆盖 once 去重/序列号分配器等内部可变状态，避免跨会话污染导致证据缺失或不可解释差异
- 资源释放机制必须显式：实例级资源统一绑定到 Effect `Scope`，通过 `Layer.scoped` / `Effect.acquireRelease` 注册 finalizer；实例销毁时必须自动释放队列/注册表/缓存并注销索引，避免跨实例泄漏
**Scale/Scope**: 触及 runtime 核心热路径与装配路径；主要落点在 `packages/logix-core/src/internal/runtime/**` 与其直接依赖（traits/debug/effectop/task-runner），并按需联动 `@logixjs/react` 的消费侧语义（仅当保持对外行为需要）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime` 映射：Intent/平台诉求（可替换与可解释的内部架构）→ Flow/Logix（不改变业务写法与执行语义）→ Code（内部服务化与装配点重构）→ Runtime（稳定可回放的执行与诊断）。
- docs/specs 依赖与对齐：
  - 运行时实现/装配 SSoT：`.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/05-runtime-implementation.md`、`.codex/skills/project-guide/references/runtime-logix/logix-core/impl/01-app-runtime-and-modules.md`
  - 性能基线口径：`specs/014-browser-perf-boundaries/*`（runner + 报告结构），以及 `specs/017-perf-tuning-lab/*`（解释与建议体系）
  - 诊断协议 SSoT：`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
- Effect/Logix contracts 变更：
  - 对外 contract：不变（本特性硬约束）
  - 对内 contract：新增/固化“RuntimeKernel + Runtime Services”的内部契约；必须在 `contracts/*` 与 runtime impl 文档同步登记，避免实现漂移。
- IR & anchors：不引入第二套真相源；contracts 仅用于约束“诊断证据/配置来源”字段，不改变 unified minimal IR 的原则。
- Deterministic identity：保持现有 instance/txn 的确定性模型；新增的子系统/覆写证据必须复用稳定锚点（不得引入随机 id）。
- Transaction boundary：任何服务化/解耦不得引入事务内 IO；事务入口必须仍能被 guard 与诊断。
- Performance budget：触及热路径（`ModuleRuntime.dispatch/transaction/txnQueue/runOperation`、`BoundApiRuntime` 写入桥、traits converge/validate、DebugSink 事件采集）。必须在 Phase 1 明确基线与预算，并在实现阶段用同口径数据证明“不回退”。
- Diagnosability & explainability：新增“配置来源/覆写生效”的结构化证据（Slim/可序列化），并保证 diagnostics=off 时不引入默认分配/扫描。
- 对外性能心智模型：本特性默认不改变对外性能边界/自动策略；若为了可替换能力暴露新的用户可配置旋钮，必须同步补齐 ≤5 关键词 + 成本模型 + 优化梯子，并与基线/事件字段一致。
- Breaking changes：不允许改变 public API/行为；内部结构可破坏式重排，但必须提供贡献者迁移说明（以迁移文档替代兼容层）。
- 质量门：实现前后必须通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；并补齐 014/019 口径的 perf 记录（before/after）。

**Phase 1 re-check**: PASS（已生成 `research.md` / `data-model.md` / `contracts/*` / `quickstart.md`，且未引入对外契约变更）

## Project Structure

### Documentation (this feature)

```text
specs/020-runtime-internals-contracts/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi.yaml
│   └── schemas/
└── tasks.md             # Phase 2 output ($speckit tasks command)
```

### Source Code (repository root)

```text
packages/logix-core/src/Runtime.ts
packages/logix-core/src/Debug.ts
packages/logix-core/src/internal/runtime/AppRuntime.ts
packages/logix-core/src/internal/runtime/ModuleFactory.ts

packages/logix-core/src/internal/runtime/ModuleRuntime.ts
packages/logix-core/src/internal/runtime/ModuleRuntime.*.ts
packages/logix-core/src/internal/runtime/core/*

packages/logix-core/src/internal/runtime/BoundApiRuntime.ts
packages/logix-core/src/internal/runtime/EffectOpCore.ts

packages/logix-core/src/internal/trait-lifecycle/*
packages/logix-core/src/internal/state-trait/*
packages/logix-core/src/internal/field-path.ts
packages/logix-core/src/internal/observability/evidence.ts
packages/logix-react/src/internal/resolveImportedModuleRef.ts

（perf 证据跑道统一入口：`pnpm perf collect` / `pnpm perf diff`）
```

**Structure Decision**: 本特性属于“runtime 核心装配 + 内部子系统边界”改造，代码主落点集中在 `packages/logix-core/src/internal/runtime/**`（以 Runtime Services 方式解耦），并以 `contracts/*` 固化“覆写生效/配置来源”的诊断证据口径；性能基线复用 014/019 runner 体系，避免口径漂移。

## Deliverables by Phase

- **Phase 0 (research)**：收敛内部全链路的改造裁决（哪些纳入本次、哪些延期）、确定子系统边界与覆写语义，并把关键取舍写入 `research.md`。
- **Phase 1 (design)**：产出 `data-model.md`（实体/证据链路/作用域模型）与 `contracts/*`（诊断证据 schema），以及 `quickstart.md`（如何验证：回归 + 基线）。
- **Phase 2 (tasks)**：用 `$speckit tasks` 拆解可并行执行的任务序列，优先落地 RuntimeKernel 与最小 Runtime Services，再逐步迁移全链路耦合点。

## Migration Guide

本节用于指导贡献者在迁移期从 legacy 模式迁到 RuntimeKernel / Runtime Services / RuntimeInternals，避免新增隐式耦合与性能/诊断漂移。

### 迁移目标（硬约束）

- 新增能力 MUST 以 Runtime Services 或 RuntimeInternals 扩展；禁止新增 `runtime.__*` / `bound.__*` 字段与 duck-typing 直读。
- 禁止继续扩展“跨文件长参数列表接线”；依赖必须通过 Kernel 装配，并在构建期解析一次后闭包捕获（热路径零 Env 查找）。
- 实例级资源（队列/缓存/注册表）MUST 绑定到 Effect `Scope` 并通过 finalizer 自动释放；实例销毁后不得残留全局引用。
- 门禁：除 legacy shim 安装点外（`packages/logix-core/src/internal/runtime/ModuleRuntime.internalHooks.ts` / `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`），任何新增 `.__*` 访问都视为违规（见 `scripts/checks/no-internal-magic-fields.ts`）。

### 常见迁移对照

- `runtime.__*` / `bound.__*` 直接访问 → `runtimeInternalsAccessor.getRuntimeInternals/getBoundInternals`（统一入口 + 缺失诊断）。
- `installInternalHooks({...一堆入参})` → `ModuleRuntime.internalHooks` 只负责写入 legacy shim；真实能力从 RuntimeInternals Runtime Service 获取。
- 进程级 once/去重/序列号分配器 → 迁到 `RunSessionLocalState`（按会话/实例隔离），支持并行试跑与稳定对比。
- “Converge Static IR 注册”从 DevtoolsHub 全局单例 → 可注入 `ConvergeStaticIrCollector`（默认不采集；需要时由 devtools layer / trialRun 显式追加 collector）。
- “平台试跑/证据导出”不再依赖 DevtoolsHub → 统一使用 `Logix.Observability.trialRun` 组装 RunSession + EvidenceCollector，并导出 EvidencePackage（可 schema 校验）。
- “构建态反射（Reflection）” → 使用标准 Build Env（ConfigProvider + RuntimeHost），通过 `ConstructionGuard` 在缺失 Service 时给出可行动诊断。
- “StateTrait.source 刷新注册/触发” → 禁止新增/继续使用 `bound.__registerSourceRefresh` / `runtime.__sourceRefreshRegistry`；改为通过 `RuntimeInternals.traits.registerSourceRefresh/getSourceRefreshHandler` 在实例作用域内维护刷新注册表。

### 推荐迁移顺序（与 tasks 对齐）

1. 先落地 Foundation：T004~T010（统一入口 + shim 迁移策略 + RunSession/EvidenceCollector 底座）。
2. 再推进全链路消费方迁移：BoundApiRuntime → trait-lifecycle/state-trait → `@logixjs/react`（每段迁移必须带回归用例）。
3. 尽早启用门禁：T026（禁止新增 `__*` 直读，白名单仅覆盖 shim 文件）。
4. 收尾清理：T043（收窄白名单与遗留 `__*` 字段，仅保留被证明仍必要的 debug-only 能力）。
5. 平台侧接入：T027~T038（TrialRun + Reflection + contracts/schema 校验 + 并行会话隔离）。

### 常见坑（迁移期高频踩雷）

- **把业务 Service 放进构建态**：Builder 里 `yield* SomeBusinessService` 会在 Reflection/BuildEnv 下失败；正确做法是把业务 Service 访问下沉到运行态（Trait handler / Logic run 段），构建态只依赖 Config/RuntimeHost 等基础能力。
- **把证据采集做成全局单例**：会导致并行试跑/反射互相串扰（证据缺失或不可解释差异）；正确做法是使用 RunSession + per-session collector，并确保诊断事件 Slim & 可序列化。
- **在非 shim 文件新增 `.__*` 直读**：会导致内部契约扩散且难以治理；正确做法是扩展 `RuntimeInternals` 或新增 Runtime Service，并通过 accessor 统一访问（同时遵守 `scripts/checks/no-internal-magic-fields.ts` 的门禁约束）。

### 回归与性能门槛（执行纪律）

- 每个 Phase 结束后按 014/019 口径复测并把摘要追加到 `specs/020-runtime-internals-contracts/perf.md`；不得把性能债堆到最后。
