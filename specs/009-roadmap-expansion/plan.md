# Implementation Plan: 009 事务 Patch/Dirty-set 一等公民

**Branch**: `[009-roadmap-expansion]` | **Date**: 2025-12-15 | **Spec**: `specs/009-roadmap-expansion/spec.md`  
**Input**: Feature specification from `specs/009-roadmap-expansion/spec.md`

## Summary

本特性的目标是把“事务 IR + Patch/Dirty-set”从内部实现细节，提升为 Logix Runtime 的一等公民契约：

- 每次事务必须产出高质量 `dirty-set`（调度输入），并在需要时产出 `patch`（诊断/回放/合并/冲突检测）；
- 调度必须以 `dirty-set` 为核心，使执行成本接近 O(写入量 + 受影响步骤数)，并提供“负优化降级阀门”；
- 所有相关信息必须可降解到统一最小 IR（Static IR + Dynamic Trace），并用稳定标识串起因果链；
- 同步事务窗口禁止 IO，且诊断事件必须 Slim & 可序列化（避免观测负优化）。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logix/core`（`@logix/react`/Devtools 作为消费方）  
**Storage**: N/A（内存态；必要时只输出可序列化证据包）  
**Testing**: Vitest（Effect-heavy 用例优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+（测试/基准）+ modern browsers（React 侧消费）  
**Project Type**: pnpm workspace monorepo  
**Performance Goals**: 事务增量调度与 trait converge 在 dirty 模式下不引入全量扫描；提供可复现基线与对比（时间/执行步数/分配三者至少一类）  
**Constraints**: 统一最小 IR；稳定标识去随机化；事务窗口禁止 IO；事件 Slim 且可序列化；默认关闭诊断近零成本  
**Scale/Scope**: 单模块实例内 steps 规模 ≥100 的真实场景（Form/Query 类）；多实例并存（key）与 devtools/sandbox 观测并存

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `Intent → Flow/Logix → Code → Runtime` 映射：
  - Intent：业务表达“只做必要派生/校验/刷新，且可解释”；
  - Flow/Logix：`dispatch` / reducers / traits / tasks 统一进入事务窗口，dirty-set 作为调度输入；
  - Code：以统一最小 IR（Static IR + Dynamic Trace）作为唯一事实源被平台/Devtools/Sandbox 消费；
  - Runtime：`dirty-set` 驱动增量收敛；patch/trace 负责解释与回放；遇到未知写入必须显式降级。
- SSoT（docs-first）：
  - 运行时契约与概念：`docs/specs/runtime-logix/core/05-runtime-implementation.md`（事务闭包、trait 执行窗）
  - Debug/IR/回放：`docs/specs/runtime-logix/core/09-debugging.md`
  - 业务写法与边界：`docs/specs/runtime-logix/core/03-logic-and-flow.md`
  -（必要时）在 `docs/specs/intent-driven-ai-coding/v3/99-glossary-and-ssot.md` 补齐 Patch/Dirty-set/IR 术语裁决
- IR & anchors：本特性会推进“统一最小 IR”，同时要求 Platform-Grade 子集的写入范围可推导（避免黑盒写入导致 `dirtyAll` 常态化）。
- Deterministic identity：本特性要求实例/事务/步骤/操作具备稳定标识并可重建（禁止随机/时间作为默认唯一 id）。
- Transaction boundary：同步事务窗口禁止 IO；任何异步必须通过 Task/事务外运行再写回，且违反要稳定失败并可解释。
- Performance budget：热路径集中在事务提交、trait converge/validate/source 的调度与依赖索引；必须提供基线与回归防线（benchmark + 关键计数）。
- Diagnosability：诊断事件必须 Slim 且可序列化；关闭诊断时不得引入显著额外分配或全量扫描。
- Breaking changes：允许不兼容（不提供兼容层）；迁移说明写入 `docs/reviews/99-roadmap-and-breaking-changes.md`（Phase 1/2 对应条目）并同步到 runtime SSoT。
- Quality gates：`pnpm typecheck`、`pnpm test` 作为最低通过线；涉及核心路径变更时补一条可复现基准脚本与结果记录。

## Project Structure

### Documentation (this feature)

```text
specs/009-roadmap-expansion/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/          # 事务入口与提交（commit meta / trace）
packages/logix-core/src/internal/runtime/core/     # StateTransaction / DebugSink / DevtoolsHub / ReplayLog
packages/logix-core/src/internal/state-trait/      # build/converge/validate/source（增量调度的主要消费者）
packages/logix-devtools-react/                     # 作为诊断协议的消费者（必要时更新对齐）
packages/logix-sandbox/                            # 作为 IR/trace 协议的消费者（必要时更新对齐）
docs/specs/runtime-logix/core/                     # 对外契约 SSoT
docs/reviews/                                      # 评审与路线图证据
```

**Structure Decision**: 本特性以 `packages/logix-core` 的事务闭包与 state-trait 增量调度为核心落点；docs-first 更新 runtime SSoT 与 reviews 证据，消费者侧（devtools/sandbox/react）只做必要的协议对齐。

## Phase 0：Research（澄清与裁决）

输出：`specs/009-roadmap-expansion/research.md`

- 明确 `dirty-set`/`patch` 的最小语义集合与边界（何时必须有、何时可选、如何降级）。
- 明确“build 阶段”应预编译哪些索引（depRoot→affectedSteps、topo order、path normalize）以及负优化阀门触发条件。
- 明确冲突检测/合并的裁决口径（单写者、覆盖优先级、同一路径多写入合并）。
- 明确“诊断级别”（light/full）下的事件载荷与成本预算（Slim & serializable）。

## Phase 1：Design（数据模型 + 契约）

输出：

- `specs/009-roadmap-expansion/data-model.md`
- `specs/009-roadmap-expansion/contracts/*`
- `specs/009-roadmap-expansion/quickstart.md`

设计目标：

- 数据模型：把 Transaction / Dirty-set / Patch / Static IR / Dynamic Trace 的字段与关系固化为单一事实源。
- 契约：用 JSON Schema（必要时附 OpenAPI）固化“可序列化协议”，为平台/Devtools/Sandbox 提供稳定消费面。
- 快速演练：用最小用例解释“写入→dirty-set→增量调度→trace”的端到端心智模型与验收方式。

## Phase 1.5：Agent Context Update

- 运行：`.specify/scripts/bash/update-agent-context.sh codex`
- 目的：把本特性的技术上下文与结构信息写回 agent context（仅新增信息，不覆盖人工内容）。

## Phase 2：Re-check Constitution

在 Phase 1 设计产物落地后，重新检查 Constitution，并确认：

- IR 与稳定标识模型已被明确定义并可被消费者消费；
- 事务边界（禁 IO）与写入纪律的可诊断失败路径已被明确；
- 性能基线与负优化阀门已具备可复现验收口径。

### Re-check Result (2025-12-15)

- IR 分层已在 `specs/009-roadmap-expansion/data-model.md` 固化（Static IR / Dynamic Trace），并在 `specs/009-roadmap-expansion/contracts/openapi.yaml` 与 `specs/009-roadmap-expansion/contracts/schemas/*` 给出可序列化契约。
- “拒绝 `path="*"` / 未知写入用 `dirtyAll`”已在 `specs/009-roadmap-expansion/research.md` 裁决，并在 schema 中约束 FieldPath 不允许 `*`。
- 稳定标识模型已在 `specs/009-roadmap-expansion/data-model.md` 给出（以可重建为目标），后续实现将以此替换现有随机 id。
