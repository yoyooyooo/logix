# Implementation Plan: 009 事务 IR + Patch/Dirty-set 一等公民

**Branch**: `[009-txn-patch-dirtyset]` | **Date**: 2025-12-16 | **Spec**: `specs/009-txn-patch-dirtyset/spec.md`  
**Input**: Feature specification from `specs/009-txn-patch-dirtyset/spec.md`

## Summary

本特性的目标是把“事务 IR + Patch/Dirty-set”从内部实现细节，提升为 Logix Runtime 的一等公民契约：

- 每次事务必须产出高质量 `dirty-set`（调度输入），并在需要时产出 `patch`（诊断/回放/合并/冲突检测）；
- 调度必须以 `dirty-set` 为核心，使执行成本接近 O(写入量 + 受影响步骤数)，并提供“负优化降级阀门”；
- 所有相关信息必须可降解到统一最小 IR（Static IR + Dynamic Trace），并用稳定标识串起因果链；
- 同步事务窗口禁止 IO，且诊断事件必须 Slim & 可序列化（避免观测负优化）。

本轮（2025-12-15/16）已在 `spec.md` 的 Clarifications 固化 15 个关键裁决，后续设计/实现以此为准：

- 同一路径重复写入：仅允许同一 `stepId` 内重复写入（最终值为 txn 内 `opSeq` 最后一笔）；跨 `stepId` 视为冲突并使事务稳定失败；`patch` full 记录完整序列，light 只保留合并结果与计数摘要。
- 列表路径归一化：字段写入 `items[index].name → items.name`；结构变更（增删/重排）归一化为 `items` 根。
- 诊断分档：`off`/`light`/`full`（off 不写入诊断缓冲区；light 仅事务摘要/计数；full 才保留完整 trace+patch 序列，并采集 `trace:effectop` SlimOp）。
- Static IR 多写者：同一路径多 writer 默认构建期稳定失败（单写者），输出冲突详情（path + writer/step 标识）。
- 稳定标识：`instanceId` 外部注入；`txnSeq` instance 内单调；`opSeq` txn 内单调；`eventSeq` instance 内单调（事件排序与去重）；`stepId/writerId` 可映射到 Static IR 节点；`txnId/opId/eventId` 为确定性派生编码（可重建）。
- `path` canonical 表示：IR/dirty-set/patch 中的 `path` 以段数组为唯一 canonical（例如 `["profile","name"]`）；点分字符串仅作为展示形态。
- `dirty-set` canonical 规则：输出必须前缀去冗余（prefix-free），禁止祖先/后代同时存在（例如已包含 `["profile"]` 则不得再包含 `["profile","name"]`）。
- 负优化降级阀门：默认同时支持 `dirtyRootCount` 阈值与 `affectedSteps/totalSteps` 阈值，任一触发即自动降级为 `dirtyAll`，并在 trace 中记录触发原因与阈值（默认：`dirtyRootCount > 32` 或 `affectedSteps/totalSteps > 0.5`；可配置）。
- `off` 最小保留：`dirty-set`/计数仅事务内临时使用；commit/abort 后立即释放；不得写入 DevtoolsHub/ring buffer。
- 稳定失败事务：必须原子 abort（不提交任何写入）；仅在 `light/full` 记录可序列化 `txn.abort`（含原因/冲突证据）；`off` 不写入诊断缓冲区，仅抛错。
- `Patch.from/to`：仅允许可 `JSON.stringify` 的值；不可序列化时必须省略 `from/to`（保留 `path/reason/stepId/opSeq` 等证据）。
- Slim/预算：`trace:effectop` 的 `payloadSummary` 默认 <=256 chars；单事件默认软上限 4KB；`TxnOrigin.details` 默认软上限 2KB（超限截断/丢字段/省略，且不得把大对象图写入 ring buffer）。
- 性能基准统计口径：每场景运行 30 次、丢弃前 5 次 warmup，报告中位数与 p95，并记录环境元信息。

此外，根据本轮评审收敛（已融合进 `spec.md`/`research.md`/`tasks.md`），本轮把两项“实施前置收敛点”提升为阻塞项（详见 `specs/009-txn-patch-dirtyset/tasks.md`）：

- P0：`trace:effectop` 事件 payload 收敛为 SlimOp（可 JSON 序列化、无 `effect`/闭包），避免 ring buffer 持有对象图污染 009 性能基线（T020–T022）。
- P0.5：React 集成层的 best-effort 清理/GC 路径不再静默吞错（interrupt 可忽略；非 interrupt 在 dev/test 下必须可被诊断）（新增任务，见 Phase 7）。

Deferred（不阻塞本轮实现，但建议后续补齐）：

- Devtools 本地调试体验：SlimOp “混合模式”（WeakRef/临时表持有 raw 引用，不进入序列化协议、不写入 ring buffer）。
- full snapshots 内存预算：如决定开启 `snapshots`，引入 `snapshotMaxBytes`（或 diff-only）避免大状态树场景内存爆炸。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logix/core`（`@logix/react`/Devtools 作为消费方）  
**Storage**: N/A（内存态；必要时只输出可序列化证据包）  
**Testing**: Vitest（Effect-heavy 用例优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+（测试/基准）+ modern browsers（React 侧消费）  
**Project Type**: pnpm workspace monorepo  
**Performance Goals**: 事务增量调度与 trait converge 在 dirty 模式下不引入全量扫描；提供可复现基线与对比（时间/执行步数/分配三者至少一类）  
**Constraints**: 统一最小 IR；稳定标识去随机化（instanceId/txnSeq/opSeq/eventSeq）；事务窗口禁止 IO；事件 Slim 且可序列化（含预算与裁剪：`TxnOrigin.details` 2KB / 单事件 4KB / `payloadSummary` 256 chars）；诊断分档 off/light/full 且 off 近零成本  
**Scale/Scope**: 单模块实例内 steps 规模 ≥100 的真实场景（Form/Query 类）；多实例并存（key）与 devtools/sandbox 观测并存

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime` 映射：
  - Intent：业务表达“只做必要派生/校验/刷新，且可解释”；
  - Flow/Logix：`dispatch` / reducers / traits / tasks 统一进入事务窗口，dirty-set 作为调度输入；
  - Code：以统一最小 IR（Static IR + Dynamic Trace）作为唯一事实源被平台/Devtools/Sandbox 消费；
  - Runtime：`dirty-set` 驱动增量收敛；patch/trace 负责解释与回放；遇到未知写入必须显式降级。
- SSoT（docs-first）：
  - 运行时契约与概念：`.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/05-runtime-implementation.md`（事务闭包、trait 执行窗）
  - Debug/IR/回放：`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
  - 业务写法与边界：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md` -（必要时）在 `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md` 补齐 Patch/Dirty-set/IR 术语裁决
- IR & anchors：本特性会推进“统一最小 IR”，同时要求 Platform-Grade 子集的写入范围可推导（避免黑盒写入导致 `dirtyAll` 常态化）。
- Deterministic identity：本特性要求实例/事务/步骤/操作具备稳定标识并可重建（禁止随机/时间作为默认唯一 id）。
- Identity fields：`instanceId` 外部注入；`txnSeq` instance 内单调；`opSeq` txn 内单调；`eventSeq` instance 内单调；`stepId/writerId` 可映射到 Static IR 节点；`txnId/opId/eventId` 必须可确定性派生与重建。
- Transaction boundary：同步事务窗口禁止 IO；任何异步必须通过 Task/事务外运行再写回，且违反要稳定失败并可解释。
- Performance budget：热路径集中在事务提交、trait converge/validate/source 的调度与依赖索引；必须提供基线与回归防线（benchmark + 关键计数）。
- Diagnosability：诊断事件必须 Slim 且可序列化；诊断分档 off/light/full，off 不进入 ring buffer；关闭诊断时不得引入显著额外分配或全量扫描。
- Breaking changes：允许不兼容（不提供兼容层）；迁移说明写入 `docs/reviews/99-roadmap-and-breaking-changes.md`（Phase 1/2 对应条目）并同步到 runtime SSoT。
- Quality gates：`pnpm typecheck`、`pnpm test` 作为最低通过线；涉及核心路径变更时补一条可复现基准脚本与结果记录。

## Project Structure

### Documentation (this feature)

```text
specs/009-txn-patch-dirtyset/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/          # 事务入口与提交（commit meta / trace）
packages/logix-core/src/internal/runtime/core/     # StateTransaction / DebugSink / DevtoolsHub / ReplayLog
packages/logix-core/src/internal/state-trait/      # build/converge/validate/source（增量调度的主要消费者）
packages/logix-devtools-react/                     # 作为诊断协议的消费者（必要时更新对齐）
packages/logix-sandbox/                            # 作为 IR/trace 协议的消费者（必要时更新对齐）
.codex/skills/project-guide/references/runtime-logix/logix-core/                     # 对外契约 SSoT
docs/reviews/                                      # 评审与路线图证据
```

**Structure Decision**: 本特性以 `packages/logix-core` 的事务闭包与 state-trait 增量调度为核心落点；docs-first 更新 runtime SSoT 与 reviews 证据，消费者侧（devtools/sandbox/react）只做必要的协议对齐。

## Phase 0：Research（澄清与裁决）

输出：`specs/009-txn-patch-dirtyset/research.md`

- 明确 `dirty-set`/`patch` 的最小语义集合与边界（何时必须有、何时可选、如何降级）。
- 明确“build 阶段”应预编译哪些索引（depRoot→affectedSteps、topo order、path normalize）以及负优化阀门触发条件。
- 明确冲突检测/合并的裁决口径（单写者；Static IR 多写者默认构建期失败；事务内重复写入仅允许同一 stepId；跨 stepId 冲突失败）。
- 明确“诊断级别”（off/light/full）下的事件载荷与成本预算（Slim & serializable；off 不进入 ring buffer；light 仅摘要；full 才保留完整 patch 序列）。

## Phase 1：Design（数据模型 + 契约）

输出：

- `specs/009-txn-patch-dirtyset/data-model.md`
- `specs/009-txn-patch-dirtyset/contracts/*`
- `specs/009-txn-patch-dirtyset/quickstart.md`

设计目标：

- 数据模型：把 Transaction / Dirty-set / Patch / Static IR / Dynamic Trace 的字段与关系固化为单一事实源。
- 契约：用 JSON Schema（必要时附 OpenAPI）固化“可序列化协议”，为平台/Devtools/Sandbox 提供稳定消费面。
- 快速演练：用最小用例解释“写入→dirty-set→增量调度→trace”的端到端心智模型与验收方式。

## Phase 1.5：Agent Context Update

- 不运行脚本（避免覆盖/漂移现有产物）。
- 如需补充 agent context，手动把本 plan 的“Technical Context/Project Structure”变更追加到仓库根部 `AGENTS.md` 的可编辑区或对应文档（仅追加，不改动人工段落）。

## Phase 2：Re-check Constitution

在 Phase 1 设计产物落地后，重新检查 Constitution，并确认：

- IR 与稳定标识模型已被明确定义并可被消费者消费；
- 事务边界（禁 IO）与写入纪律的可诊断失败路径已被明确；
- 性能基线与负优化阀门已具备可复现验收口径。

### Re-check Result (2025-12-16)

- IR 分层已在 `specs/009-txn-patch-dirtyset/data-model.md` 固化（Static IR / Dynamic Trace），并在 `specs/009-txn-patch-dirtyset/contracts/openapi.yaml` 与 `specs/009-txn-patch-dirtyset/contracts/schemas/*` 给出可序列化契约。
- “拒绝 `path="*"` / 未知写入用 `dirtyAll`”已在 `specs/009-txn-patch-dirtyset/research.md` 与 `spec.md` 澄清，并在 schema 中约束 FieldPath 不允许 `*`。
- 稳定标识模型已在 `spec.md` 澄清（instanceId/txnSeq/opSeq/eventSeq，txnId/opId/eventId 可重建）；Phase 1 产物（data-model/contracts）应与该裁决保持一致。
