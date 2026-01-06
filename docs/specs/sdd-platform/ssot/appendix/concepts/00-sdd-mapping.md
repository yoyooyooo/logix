---
title: Spec-Driven Development (SDD) & Intent Flow
status: living
lastUpdated: 2025-12-08
value: concept
priority: high
---

# Spec-Driven Development (SDD) in Intent Flow

> **Core Philosophy**: "Specification as the Executable Source of Truth."
> 本文档定义了如何将业界 **Spec-Driven Development (SDD)** 方法论映射到 **Intent Flow** 架构中。

## 1. The Paradigm Shift

在 AI Coding 时代，传统的 "Requirements -> Human Coding" 模式正在失效。我们需要转向 "Requirements -> Spec -> AI Implementation" 模式。
SDD 强调 **Specification (Specs)** 不再是静态文档，而是 **Executable Contracts (可执行契约)**。

在 Intent Flow 体系中，**Intent 是 Spec 的结构化、可执行表达**，是 SDD 中 Executable Spec 的主要承载形式。

| Classic SDD Layer             | Intent Flow Mapping              | Artifact / Asset                     |
| :---------------------------- | :------------------------------- | :----------------------------------- |
| **Governance / Constitution** | **Platform Manifesto & Rules**   | `docs/specs`, `IntentRule`           |
| **Specify (/specify)**        | **L0: Requirement Intent**       | `UserJourney`, `BusinessGoal`        |
| **Plan (/plan)**              | **L1: Module & L2: Flow Intent** | `ModuleSchema`, `Flow`, `Topology`   |
| **Tasks (/tasks)**            | **L3: Step Intent**              | `Action`, `Step`, `TaskItem`         |
| **Implement (/implement)**    | **Code Generation**              | `Logix Code`, `Effect Program`       |
| **Verify / Loop**             | **Runtime Alignment Lab**        | `@logix/sandbox`, `RunResult`（Trace/Tape/Snapshot；口径见 `docs/specs/sdd-platform/ssot/contracts/01-runresult-trace-tape.md`）, Alignment Lab (`docs/specs/drafts/topics/sandbox-runtime/*`) |

## 2. Phase Mapping & Execution

我们将 GitHub Spec Kit 定义的四阶段工作流 (Specify -> Plan -> Tasks -> Implement) 映射到 Intent 模型的逐层展开过程（L0/L1/L2/L3 的详细定义见 `docs/specs/sdd-platform/ssot/foundation/03-trinity-and-layers.md`）。

### Phase 1: SPECIFY -> L0 (The "What" & "Why")

- **SDD 定义**: 定义范围、用户旅程、验收标准。
- **Intent 实现**:
  - 输入：自然语言需求 (PRD / User Story)。
  - 输出：**L0 Intent** (Requirement Node)。
  - 关键动作：**Clarify** (AI 澄清歧义)。

### Phase 2: PLAN -> L1/L2 (The "Architecture" & "Design")

- **SDD 定义**: 技术架构、依赖关系、接口契约 (CDD)、非功能约束。
- **Intent 实现**:
  - 输入：L0 Intent + Repository Context。
  - 输出：**L1 Intent** (Module Schema, Component Topology) + **L2 Intent** (Flow, Interaction)。
  - 核心契约：**API-First / Schema-First**。在写代码前，先确定 `Effect<A, E, R>` 的签名与 `Schema`。
  - **Constraints**: 注入平台级约束 (e.g., "All side-effects must be wrapped in `Effect`").

### Phase 3: TASKS -> L3 (The "Instruction")

- **SDD 定义**: 极细颗粒度、可测试的任务项 (Tasks)。
- **Intent 实现**:
  - 输入：L2 Flow。
  - 输出：**L3 Intent** (Step, Logic Unit) + **Implementation Plan** (Task List)。
  - 特性：每个 Task 对应一个原子与 Intent 变更，具备明确的 **Acceptance Criteria (Check)**。

### Phase 4: IMPLEMENT -> Code (The "How")

- **SDD 定义**: AI 生成代码 + 人工 Review。
- **Intent 实现**:
  - 输入：L3 Intent + Context。
  - 执行引擎：**Codegen Agent**。
  - 产物：`packages/` 下的源码 (TypeScript / Effect)。
  - **Guardrail**: 代码是实现载体，**Intent 是事实源**。允许在实现侧先行试验，但稳定后必须回写 Intent/Specs，避免长期漂移 (Spec Drift Prevention)。

## 3. The Alignment Loop (Verification)

SDD 强调 "Executable Specs"。在 Intent Flow 中，这意味着：

1.  **Intent is Verifiable**:
    - L2 Flow Intent 可以直接编译为 **Graph** 或 **State Machine** 进行静态分析。
    - L3 Intent 包含断言 (Post-condition)。

2.  **Runtime Alignment Lab**:
    - 代码运行产生的 **Trace** 必须回溯映射到 **Intent**。
    - **Alignment Score**: 衡量 "Runtime Behavior" 与 "Design Intent" 的一致性。
    - 任何 "Spec Drift" (代码行为偏离意图) 都会被 Sandbox 捕获并报错。

## 4. Operational Rigor (DevOps Integration)

为了落地 SDD，必须建立严格的流水线：

- **Spec Validation**: 在生成代码前，先校验 Concept Integrity (Intent Schema Check)。
- **Generated Code Validation**: 生成后立即运行 Lint / TypeCheck / Test。
- **Living Documentation**: 既然 Intent 是 SSoT，那么文档应该由 Intent 自动生成 (Documentation Generation)，保证文档永远不过时。

---

> **结论**: Intent Flow 本质上是一个 **Native SDD Engine**。我们通过标准化的 Intent 模型，将 SDD 方法论固化为工具链，让 "Spec-Driven" 不再依赖人的自律，而成为系统的原生特性。
