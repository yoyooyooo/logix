---
title: Sandbox as Runtime Alignment Lab
status: draft
version: 2025-12-08
value: core
priority: next
---

# Sandbox/Playground as Runtime Alignment Lab

> **核心观点**：传统意义上的 Code Playground 只是手段，Platform 的真正目标不是“在线运行代码”，而是建设一个 **Runtime Alignment Lab（运行时对齐实验室）**。
> 在这里，我们不光验证“代码能不能跑通”，更要验证“运行行为是否与 Intent 对齐”。

## 1. 定义：从 Playground 到 Alignment Lab

| 维度         | Code Playground (传统)   | Runtime Alignment Lab (本平台目标)         |
| :----------- | :----------------------- | :----------------------------------------- |
| **核心问题** | 代码能运行吗？有报错吗？ | **运行时行为符合 Intent 预期吗？**         |
| **输入**     | 代码片段 (Snippet)       | **Intent (Spec) + Code (Implementation)**  |
| **输出**     | Console Log / DOM        | **Alignment Score (对齐度) / Diagnostics** |
| **用户心智** | "Try it out" (试一试)    | **"Verify & Fine-tune" (验证与调优)**      |
| **角色**     | 开发者 (Human)           | **平台 (Platform) + AI + 开发者**          |

### 1.1 为什么叫“实验室 (Lab)”？

因为这里是 **Intent 模型 (L1-L3)** 与 **Runtime (Code/Flow)** 发生碰撞与校准的场所。
AI 生成的代码（Implementation）往往是概率性的，而 Intent（Spec）是确定性的。我们需要一个**受控环境**来观测二者的偏差。

## 2. 核心能力模型：The Alignment Loop（对齐回路）

Alignment Lab 的工作流是一个闭环（Loop），包含三个环节：

```mermaid
graph LR
    Intent[Intent (Spec)] -->|Generate| Code[Code (Impl)]
    Code -->|Execute in Sandbox| Trace[Trace & Events]
    Trace -->|Compare w/ Intent| Feedback[Alignment Report]
    Feedback -->|Refine| Intent
    Feedback -->|Fix| Code
```

> 对应 SDD 流程：  
> - Intent(Spec) ≈ SDD 的 SPECIFY/PLAN 产物（需求意图 + 约束）；  
> - Code(Impl) ≈ TASKS/IMPLEMENT 阶段生成的 Logix/Effect 实现；  
> - Trace & Feedback ≈ Executable Spec 的运行与校验结果。

### 2.1 Simulation (仿真执行)

- **环境隔离**：不仅是 JS 隔离 (Worker)，更是 **副作用隔离 (Effects Isolation)**。
- **Time Travel**：能够控制时间流速（Virtual Timer），快速验证超时、重试逻辑。
- **Mock 注入**：基于 Profile (Scenario) 注入特定的 Mock 数据，而不是让用户手动改代码。
  - _User Story_: "Run this flow under 'Network Flaky' scenario."

### 2.2 Observability (结构化观测)

- **Trace as Data**：日志不是文本，是结构化的 **Execution Graph**。
- **Signal Extraction**：从 Trace 中提取关键信号（Signals）。
  - _Example_: Intent 要求 "3次重试"，Trace 中是否观测到了 3 次特定的 ApiCall Failure 事件？

### 2.3 Verification (自动对齐验证)

这是 Lab 的核心价值。平台自动回答以下问题：

- **覆盖率**：生成的 Flow 是否覆盖了 Intent 定义的所有分支？
- **约束合规**：是否违反了 System Constraints (e.g., "禁止在 Loop 中串行调用 RPC")？
- **结果一致性**：最终 State 是否符合 Post-condition？

## 3. 落地路径：Sandbox 2.0 路线图

基于 MVP 的成果，我们将 Sandbox 演进分为三个阶段：

### Phase 1: The Reliable Runner (当前 MVP)

_目标：能跑、不崩、有基础日志。_

- [x] Web Worker 隔离
- [x] esbuild-wasm 编译
- [x] 基础 Host-Worker 协议
- [ ] 稳定的 Mock 注入机制 (Layer 注入)

### Phase 2: The Observable Lab (可观测实验室)

_目标：Trace // Intent。_

- [ ] **Trace SDK**：在 Runtime 中埋点，输出符合 Schema 的 TraceSpan。
- [ ] **Intent Mapping**：在 Trace 中回填 Intent ID (Run Correlation)。
- [ ] **Visualizer**：在 UI 上把单纯的 Log List 升级为 "Sequence Diagram" 或 "Flow Chart"。

### Phase 3: The Automated Verifier (自动化验证器)

_目标：AI Closed Loop。_

- [ ] **Alignment Specs**：定义 "期望的 Trace 模式" (e.g., using Temporal Logic or Simple Pattern Matching)。
- [ ] **Diagnostics Engine**：分析 Trace，生成人类可读的诊断报告 ("Error: Expected 3 retries, found 1")。
- [ ] **Auto-Fix**：将诊断报告喂回给 AI，自动修正代码。

## 4. 架构影响

这对 `runtime-logix` 和 `platform` 提出了新的要求：

1.  **Intent 必须携带验证元数据**：L2/L3 Intent 不仅要描述 "做什么"，还要描述 "如何验证"（Verifiable Intent）。
2.  **Runtime 必须暴露内部状态**：Logix Core 需要通过 `DebugSink` 或 `Tracer` 暴露足够的 hook，而不仅仅是黑盒运行。
3.  **Sandbox 是无状态的**：Lab 每次运行都是一次独立的 Experiment，输入 (Code + Scenario)，输出 (Report)。

## 5. 结论

**Playground is dead, long live the Alignment Lab.**

我们不做一个通用的 JS Fiddle，我们做一个专门用于 **Spec-Driven / Intent-Driven Coding** 的**验证靶场**：

- 上游：从平台侧 SPEC/IntentRule/R-S-T 获取「需求意图」；  
- 中层：通过 Logix/Effect 表达实现；  
- 运行时：在 Sandbox 中执行，产出结构化 Trace/RunResult；  
- 下游：在 Playground/Studio 中将这些结果与 Intent 对齐，形成可执行规范（Executable Spec）与 AI 反馈回路。

MVP 阶段的 `examples/logix-sandbox-mvp` + `@logixjs/sandbox` 是这个 Lab 的第一个原型机（Prototype Mark I）。
