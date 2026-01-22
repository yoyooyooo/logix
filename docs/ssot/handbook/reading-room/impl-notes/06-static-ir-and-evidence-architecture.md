---
title: 06 · Static IR 与 Evidence Package 架构解构
status: draft
date: 2025-12-21
tags: ['Static IR', 'Evidence', 'Architecture', 'Runtime']
---

# Static IR 与 Evidence Package 架构解构

> 本文提炼自 Logix Runtime 性能与可观测性架构的讨论，阐述了 **Static IR (静态中间表示)** 与 **Evidence Package (证据包)** 的设计哲学、生命周期及其与 SDD 平台的赋能关系。

![Static IR Architecture](./assets/static-ir-evidence-arch.png)

## 1. 核心概念与设计哲学

在 Logix 体系中，我们通过将“业务逻辑的定义”与“执行的事实”解耦，构建了一套既高性能又完全可解释的运行时架构。

### 1.1 Static IR (静态中间表示)

**定义**：Logix Program 的结构化蓝图。
**本质**：它是业务逻辑的 **Topological Data (拓扑数据)**。
**双重形态**：

- **Memory IR (In-Memory)**: _Hybrid Structure_。包含 `topoOrder`/`ID` 等纯数据结构，也直接持有 JS 函数引用（`derive`, `shouldUpdate`）。这是为了**运行时性能 (O(1) Dispatch)**。
- **Exported IR (On-Wire)**: _Pure JSON_。剔除所有函数引用，只保留节点 ID、路径映射与依赖关系。这是为了**可序列化与工具消费**。

### 1.2 Evidence Package (证据包)

**定义**：一次运行过程的完整、可移植复现包。
**本质**：**"Maps + Traces"** (地图 + 轨迹)。
**核心价值**：_Don't tell me it failed, show me exactly how it happened._
**结构**：

- **Static IR Summary**: 该时刻生效的 IR 快照（去重存储）。
- **Dynamic Events**: 基于 Integer ID 的轻量级事件流（引用 Summary 中的定义）。

---

## 2. 生命周期与数据流向

整个过程贯穿 Build、Run、Export 三个阶段：

### Phase 1: Build & Load (构建与加载)

- **时机**：`StateTrait.build()` (Module 定义/加载时)。
- **动作**：
  1.  **Normalization**: 归一化 Spec，生成 `FieldPath` <-> `ID` 映射。
  2.  **Topo Sort**: 计算 `Computed` 节点的拓扑执行顺序。
  3.  **Hybrid Construction**: 生成内存态 `ConvergeStaticIrRegistry`，挂载 JS 函数。
- **产物**：内存中的 `Program.convergeIr`。

### Phase 2: Runtime & Deduplication (运行与去重)

- **时机**：`Runtime.make()` (实例初始化时)。
- **动作**：
  1.  **Register**: Runtime 将 Module 的 IR 注册到全局单例 `DevtoolsHub`。
  2.  **Digest**: 计算 IR 的内容摘要（如 `instance:v1`）。
  3.  **Store**: `DevtoolsHub` 使用 Map 存储 `Digest -> Exported IR`，实现跨实例/跨时间维度的**去重**。
- **运行时行为**：
  - Log 事件只记录 `digest` 引用，不携带 IR 本体，极大降低内存与 I/O 开销。

### Phase 3: Export & Consumption (导出与消费)

- **时机**：`exportDevtoolsEvidencePackage` (报错、Devtools 连接、CI 验收时)。
- **动作**：
  1.  **Collect**: 收集 Event RingBuffer 中的所有事件。
  2.  **Hydrate**: 遍历事件引用的 `digest`，从 Map 中提取对应的 **Exported IR (Pure JSON)**。
  3.  **Package**: 组装成包含 `events` + `summary.staticIrByDigest` 的完整包。

---

## 3. IR 核心数据流 (Data Flow Spec)

Exported Static IR (JSON) 包含以下关键数据流，构成了一张完整的 **依赖有向图 (DAG)**：

1.  **Node Mapping (节点映射)**
    - `fieldPaths`: `["user", "user.name"]` <-> `IDs [1, 2]`
    - 作用：将运行时的高效整数 ID 还原为人类可读的业务路径。

2.  **Explicit Dependencies (显式依赖)**
    - `stepDepsFieldPathIdsByStepId`: `Step(ComputeName) -> [DepID_1, DepID_2]`
    - 作用：定义“谁依赖谁”，用于构建依赖图边。

3.  **Write Flows (输出流向)**
    - `stepOutFieldPathIdByStepId`: `Step(ComputeName) -> OutID`
    - 作用：定义“谁生产谁”，结合依赖构成了完整的数据流向。

4.  **Execution Order (执行调度)**
    - `topoOrder`: `[StepID_5, StepID_1, StepID_8...]`
    - 作用：定义**严格的计算次序**。这是 Runtime 保证无 Glitch 且高效执行的依据，也是回放器（Replayer）能够像 Runtime 一样逐帧还原的关键。

---

## 4. 对 SDD 平台的赋能

这套架构是 SDD 平台实现 **Pro-Code 全双工数字孪生** 的基石：

| 赋能领域                        | 痛点                               | Solution (IR + Evidence)                                                                     |
| :------------------------------ | :--------------------------------- | :------------------------------------------------------------------------------------------- |
| **Visualization**<br>(Studio)   | 解析源码 AST 慢且易错              | **Static IR**: 运行时直接输出“真理地图”，Studio 零成本渲染 100% 准确的依赖图。               |
| **Verification**<br>(CI/CD)     | `expect(a).toBe(1)` 报错缺乏上下文 | **Evidence**: 提供结构化“录像”，平台可对比 Spec 预期与实际 Trace，产出**行为对齐报告**。     |
| **AI Workflows**<br>(Debugging) | 全量代码 Context 导致幻觉          | **Context Pruning**: 仅提取相关的 IR 局部子图 + 失败 Trace 片段，提供高信噪比 Context。      |
| **Replay**<br>(Devtools)        | 无法本地复现线上 Bug               | **Self-Contained**: 证据包自带当时的 IR 版本，本地 Devtools 可完美还原现场代码结构与数据流。 |
