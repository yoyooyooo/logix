---
title: 05 · Intent Pipeline：From Requirement to Schema
status: draft
version: 2025-12-12
value: vision
priority: next
related:
  - ./00-overview.md
  - ./11-spec-to-code-mvp.md
---

# Intent Pipeline（上下文供应链：Spec → Blueprint/Contracts → Code → RunResult）

> 本文只负责一件事：把 “Spec‑Driven” 变成可执行的**上下文供应链**（Context Supply Chain），让每个阶段都产出可被下一阶段消费的 Artifact/Contract，并且能在失败时回传最小 RunResult Slice 进行自愈。
>
> SDD 四阶段与角色分工的总览以 `00-overview.md` 为准；RunResult 的唯一口径以 `docs/ssot/platform/contracts/01-runresult-trace-tape.md` 为准。

## 1. Pipeline 的最小产物（按可执行性排序）

> 目标：用最少且稳定的 Artifact 形态，把“需求 → 可执行逻辑”压缩成机器可验证的结构。

1) **Spec（What/Why）**

- `FeatureSpec` / `ScenarioSpec`（可执行验收：Given/When/Then）
- 落点：平台态（Spec Studio）与仓库态（文档/JSON）均可；但必须有稳定 `id` 作为锚点

2) **Blueprint（What connects to what）**

- Screen/Module/Service 拓扑（“有哪些模块/服务，如何连起来”）
- 对应平台侧的“可视化蓝图”；仓库侧可用 JSON/TS 表示（以可 diff 为第一优先级）

3) **Contracts（How is constrained）**

- Module 图纸（state/actions/traits 的结构草稿，`C_T` 侧）：见 `01-module-traits-integration.md`
- IntentRule（连线协议，Design‑time/Visual ↔ Codegen/Runtime）：见 `14-intent-rule-schema.md`
- FlowProgram（可 IR 化的控制律，`Π` 侧）：由特性 spec 主导（例如 `specs/075`/`specs/076`）

4) **Code（可执行投影）**

- `packages/*` / `examples/*` 下的 TypeScript（Effect/Logix），包含：
  - Module（schema/actions/reducers/traits）
  - Logic/Flow（可能是 Fluent DSL、也可能是 FlowProgram）
- 约束：Runtime 不再“从静态推断动态”，动态律必须显式化为 `Π`（参照 `docs/ssot/platform/foundation/01-the-one.md` 与 `docs/ssot/platform/contracts/00-execution-model.md`）

5) **RunResult（Grounding）**

- `EvidencePackage(events: ObservationEnvelope[]) + optional Tape + snapshots + anchors`
- 用途：Alignment、Devtools、Agent Self‑Correction（切片回传）
- 唯一口径：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`

## 2. Context Pack：给 Agent 的最小输入面

平台在每个阶段给 Agent 的输入不应是“所有文档”，而应是严格裁剪的 Context Pack：

- **Spec Pack**（给 Spec Agent）：Feature/Scenario + 术语/约束（不含实现细节）
- **Plan Pack**（给 Architect Agent）：Spec + Blueprint + 既有资产索引（Module/Pattern/Service）+ 运行时硬约束（The One + Execution Model + RunResult）
- **Task Pack**（给 Task Agent）：Implementation Plan + DoD（验收场景/指标）+ 变更落点目录
- **Coder Pack**（给 Coder Agent）：Task + 相关类型投影（d.ts）+ 关联 Pattern（few-shot）+ 上一次失败的 RunResult Slice（若有）

Context Pack 的治理/压实策略见 `17-project-governance-and-lean-context.md`。

## 3. Compiler 边界：Code‑First（当前）与 Definition‑First（未来）

本仓当前主线是 **Code‑First**（TypeScript/Effect 直接执行，Parser/Loader 提取 IR）；但平台最终需要允许 **Definition‑First**（JSON Definition）以服务更广泛的受众。

- **Code‑First（当前最小闭环）**
  - 生成/修改 TS 代码 → 通过 Parser/Loader 提取静态 IR → 运行得到 RunResult → Alignment 回流
  - 优势：无解释器层、与真实运行时零偏差

- **Definition‑First（可选未来）**
  - 设计态用 JSON Definition（可视化/可 diff）表达 Blueprint/Contracts
  - Intent Compiler 把 JSON “注水”为 TS/Effect 投影；复杂逻辑保留 escape hatch（Pro‑Code）
  - 该方向的最小裁决入口见 `07-intent-compiler-and-json-definition.md`（作为长期演进，不进入 MVP 必需链路）

## 4. Traceability：从需求到运行的单一锚点语言

Pipeline 只在一种情况下“可闭环”：所有产物共享同一套锚点语言（稳定 id + 参考系）。

- Spec 侧：`featureId/scenarioId/stepId`
- 结构侧：`moduleId/instanceId`、`traitPath`、`programId/nodeId`
- 运行侧：`tickSeq/txnSeq/opSeq/linkId`（证据链锚点）

锚点与排序的裁决见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`。
