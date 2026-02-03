---
description: "Task list for 005-unify-observability-protocol implementation (foundational protocol/aggregation only)"
---

# Tasks: 统一观测协议与聚合引擎（协议层 + 聚合引擎 · Foundational）

**Input**: `specs/005-unify-observability-protocol/{spec.md,plan.md,data-model.md,contracts/*,research.md,quickstart.md}`

> 收口裁决（与 `specs/080-full-duplex-prelude` / `specs/085-logix-cli-node-only` 对齐）：
>
> - 005 的 Done 口径只覆盖：**协议（Envelope）/证据包（EvidencePackage）/聚合引擎（Aggregate/Aggregator）/命令面（clear/pause/resume）** 的可单测验收闭环。
> - Devtools UI、Timeline/Flamegraph 渲染、Chrome 扩展实时 transport、需求锚点 coverage 等“宿主形态交付”不阻塞本 spec；由 `038` 或后续独立 spec 承接。

## Phase 1: Setup（Shared Infrastructure）

- [x] T001 更新 SSoT：固化协议/导入导出/Recording Window 语义 `docs/ssot/runtime/logix-core/observability/09-debugging.md`
- [x] T002 建立 core 公共入口：`packages/logix-core/src/Observability.ts` 并在 `packages/logix-core/src/index.ts` 导出为 `Logix.Observability`

## Phase 2: Foundational（Blocking Prerequisites）

- [x] T003 添加协议排序/兼容性测试 `packages/logix-core/test/observability/ObservationEnvelope.test.ts`
- [x] T004 添加证据包录制窗口测试（seq 允许间隙）`packages/logix-core/test/observability/EvidencePackage.test.ts`
- [x] T005 添加聚合确定性测试（同输入同输出）`packages/logix-core/test/observability/AggregationEngine.test.ts`
- [x] T006 定义协议公共类型与 API：补齐 `ObservationEnvelope`/`EvidencePackage`/`ControlCommand`/`AggregatedSnapshot`/降级标记 `packages/logix-core/src/Observability.ts`
- [x] T007 实现 payload 降级与摘要工具 `packages/logix-core/src/internal/observability/jsonValue.ts`
- [x] T008 实现 ObservationEnvelope codec（validate/parse/compat）`packages/logix-core/src/internal/observability/envelope.ts`
- [x] T009 实现 EvidencePackage codec（export/import + Recording Window 语义）`packages/logix-core/src/internal/observability/evidence.ts`
- [x] T010 实现宿主无关聚合引擎（纯函数核心）`packages/logix-core/src/internal/observability/aggregate.ts`
- [x] T011 实现增量聚合器（append-only 输入 → 快照输出）`packages/logix-core/src/internal/observability/aggregator.ts`
- [x] T012 扩展 DevtoolsHub 为“运行侧事件源”：pause/resume/命令面 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [x] T013 运行侧生成权威 Envelope：DebugSink.Event → RuntimeDebugEventRef → ObservationEnvelope `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`
- [x] T014 暴露统一入口给宿主/UI：`getObservationSnapshot/subscribeObservationSnapshot/sendControlCommand` `packages/logix-core/src/Debug.ts`
- [x] T015 添加命令行为测试（clear/pause/resume）`packages/logix-core/test/observability/ControlCommand.test.ts`

## Moved / Deferred（不阻塞 005 的 Done 口径）

- Devtools Session-First UI（消费聚合快照）：`specs/038-devtools-session-ui`
- Chrome 扩展（MV3）实时 transport（HELLO/SUBSCRIBE/OBSERVATION_BATCH/CONTROL/CONTROL_ACK）：Deferred（后续单开 spec；contracts 已在本 spec 目录沉淀）
- 需求锚点 coverage（Scenario/Step）与 UI 面板：Deferred（后续与 workflow/stepKey 口径一起收口）
