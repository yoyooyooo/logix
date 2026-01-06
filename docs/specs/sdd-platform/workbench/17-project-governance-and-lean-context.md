---
title: 17 · Project Governance & The Lean Context Protocol
status: draft
version: 2
value: vision
priority: next
depends_on:
  - '../spec-graph/00-overview.md'
related:
  - './00-overview.md'
  - './16-unified-ir-value-chain.md'
---

# 17 · Project Governance & The Lean Context Protocol

> **Context**: 本文收敛了 `spec-graph` (治理视图) 与 `leanSpec` (上下文工程) 对 SDD 平台的两项关键启发。
>
> 我们不仅需要一个 "Code Factory" (制造代码的引擎，详见 `00-overview`)，还需要一个 **"Governance Layer" (治理层)** 来管理成百上千个并发演进的 Feature Tracks，并确保 AI Agent 不会死于上下文过载。

## 1. The Governance Layer: Graph-Driven Workflow

SDD 平台不应只关注单条流水线的纵向深度（Deep execution of one spec），必须引入 **"Project Management Kernel"** 来管理横向广度。

我们直接采纳 `spec-graph` 提议的 **Unified Domain Model** 作为平台的一等公民。

### 1.1 Identity System: Track ID as Primary Key

平台不再以“文件路径”为索引，而是以 **Track ID** (e.g., `025`) 为核心主键。

- **Agent Identity**: Agent 工作时不是 "Working on file X"，而是 "Working on Track `025`"。
- **Artifact Aggregation**: 一个 Track 聚合了全生命周期的 Artifacts（Topic -> FeatureSpec -> Scenario -> Plan -> Tasks -> PR -> Archive）。
- **Traceability**: 所有的运行证据（RunResult / AlignmentReport）、Agent Log、Review Comment 都挂载在 Track ID 下。

### 1.2 "Readiness Gates": Metadata as Signals

Spec Graph 中的 Metadata 不是仅供人类看的静态标签，而是 **Agent Workflow 的触发信号（Signals/Gates）**。

| State / Gate    | Signal Definition                       | Platform Action                                                                 |
| :-------------- | :-------------------------------------- | :------------------------------------------------------------------------------ |
| **Drafting**    | `stage: L9`                             | **Silent**. 仅允许人类或 Author Agent 编辑。                                    |
| **Specified**   | `stage: L1` + `status: approved`        | **Trigger**: 自动唤醒 `Architect Agent` 进行 Planning。                         |
| **Blocked**     | `depends_on` 上游变为 `Active` 以外状态 | **Halt**: 自动挂起当前任务，向需求负责人（PM/架构师）发送 Blocked Alert。       |
| **Implemented** | `PR` Merged                             | **Trigger**: 自动唤醒 `Janitor Agent` 进行 **Context Compression** (分节 2.2)。 |

### 1.3 Smart Context Injection (The Graph Filter)

利用图谱的 `depends_on` (强依赖) 和 `related` (弱相关) 关系，构建 **"Rigorous Context" (严谨上下文)**，防止幻觉。

- **Strict Scope**: 当 Agent 规划 Track `025` 时，平台**仅**注入：
  1. `025` 自身的 Spec。
  2. `depends_on` 指向的 1-hop 上游 Spec (作为硬约束)。
  3. `related` 指向的 Topics (仅作为 Reference，不作为约束)。
- **No Leaks**: 严禁将无关 Track 的 Spec 混入 Context。

---

## 2. The Lean Context Protocol

为了防止随着项目演进，Spec 变得不可维护（上下文爆炸），我们引入 **"LeanSpec"** 的第一性原理作为平台的 **Context Engineering Protocol**。

### 2.1 First Principle: Context Economy

> **Rule**: 单个工作单元的 Context Pack 必须控制在 **Agent 的高信噪比窗口内** (e.g., < 2k tokens critical info)。

任何时候 Agent 都不应该“看到所有文档”。

### 2.2 The 4 Verbs of Maintenance

平台引入四个动词来治理熵增：

1.  **Partition (分区)**: 将此时不需要的信息移出主 Context。
    - _System Action_: 在 Coding 阶段，不加载 `DESIGN.md` 中纯理论推导的部分，只加载结论。
2.  **Isolate (隔离)**: 不同生命周期的关注点必须拆分。
    - _System Action_: Feature Spec (Intent) 与 Implementation Plan (How) 分物理文件存储。
3.  **Compact (压实)**: 删除重复、废话。
    - _System Action_: Agent 在保存 Spec 前自动运行 `Lint`，去除 "As mentionted above" 等冗余。
4.  **Compress (压缩)**: **最关键的一步。**
    - _System Action_: 当 Track 进入 `Completed` 状态，平台触发 `Janitor Agent`：
      1.  读取 `plan.md` 和 `tasks.md`。
      2.  提炼其中的“关键技术决策”和“非显性逻辑”。
      3.  将这些精华回写到 `spec.md` 的 `## Notes` 或源码注释中。
      4.  **Archive** 原始 Plan/Tasks 文件（移入 `.archive/` 或折叠），不再作为后续任务的 Active Context。

### 2.3 Lifecycle-Aware Context Packing

平台根据 Track 当前的 Stage，动态组装 Context Pack：

| Stage        | Context Pack Composition (Visible to Agent)        | Rationale                                                    |
| :----------- | :------------------------------------------------- | :----------------------------------------------------------- |
| **Planning** | `README(Intent)` + `depends_on(Constraints)`       | 只关注"做什么"和"约束"，不受"怎么做"的干扰。                 |
| **Coding**   | `README(Intent)` + `DESIGN(How)` + `SCENARIO(DoD)` | 需要知道设计方案和验收标准。**不需要**看上游的 Raw Drafts。  |
| **Review**   | `TASKS(What changed)` + `SCENARIO(DoD)` + `Diff`   | Reviewer 关注增量和结果，不需要看完整的 Design 推导。        |
| **Future**   | `README(Intent + Compressed Notes)`                | 未来维护者只看意图和历史决策摘要，**不看**过期的 Plan 细节。 |

---

## 3. Logix Synergy: Where the Magic Happens ⚡️

本节探讨如何利用 `Logix Runtime` (Effect/Module/IR) 的独有特性，将上述通用治理与上下文协议推向极致。

### 3.1 IR as the Ultimate Compression (取代自然语言总结)

LeanSpec 提倡用 LLM 总结 Plan 文本；在 Logix 中，我们可以做到 **"Lossless Semantic Compression" (无损语义压缩)**。

- **Concept**: **IR as Context**. 当 Track 025 完成时，我们不再需要 Agent 去写一篇 "Summary"，而是直接提取该 Module 的 **Manifest IR (L2)** 和 **Intent IR (Reflected)**。
- **Workflow**:
  - _Before Archive_: 运行 `Runtime.emitModuleDescriptor()`。
  - _The "Summary"_: 一个仅包含该 Module **State Schema**, **Action Signatures**, **Flow Topology** 的 JSON。
  - _Value_: 当其他 Agent 依赖 Track 025 时，直接喂入这个 strict typed JSON，比喂入模糊的自然语言 Summary 精准 100 倍，且 Token 消耗只有 1/10。

### 3.2 Evidence-Driven Governance（行为驱动的治理）

Spec Graph 中的状态流转不应仅靠手动或 Git Merge 触发，应由 **可验证证据（RunResult）** 驱动。

- **Concept**: **Spec–Evidence Duality（规约‑证据对偶性）**。
- **Mechanism**:
  - Spec 定义了 "Success Criteria" (e.g., "Click Submit -> State becomes Loading -> Call API").
  - 平台在 Sandbox 中试运行代码，捕获 **RunResult**（`evidence.events` + snapshots + anchors；必要时包含 Tape）。
  - **Governance Gate**: 只有当 RunResult 能够在锚点语言上 **对齐** Spec/Intent（并产出 AlignmentReport）时，Track 状态才自动转为 `Verified`。
- **Result**: 实现了 **"Semantic Definition of Done"** —— 代码写完了不算完，Logix 运行时证明它行为正确了才算完。

### 3.3 System-Level Binding (代码即图谱)

我们将 Governance Metadata 直接注入 Logix Runtime，实现 **"Self-Describing Codebase"**。

- **Code**:
  ```typescript
  export const UserAuthModule = Module.make('UserAuth', {
    manifest: {
      specId: 'track:025', // 绑定 Spec Graph
      version: '1.0.0',
      layer: 'domain',
    },
  })
  ```
- **Runtime Reflection**:
  - 当我们在 Devtools 调试某个 Event 时，Runtime 可以直接 click-through 跳转到 Spec Graph 里的 `025` 节点。
  - 当 Agent 阅读代码时，它通过 `specId` 立即知道去哪里找 "Why" (Feature Spec)。

### 3.4 The "Full-Duplex" Context

利用 `full-duplex` 架构，平台可以提供 **Live Context**。

- **Scenario**: 用户在 Studio 中修改 Spec 文档。
- **Logix Response**:
  1.  Graph 检测到 `025` 变更。
  2.  Runtime 自动通过 HMR 热更，定位到受影响的 Module。
  3.  **Reverse Context**: Runtime 将当前运行时的 **State Snapshot** 作为 "Live Context" 喂回给 Spec Agent："注意，你刚才修改的规则会导致当前已有的 State 数据结构失效 (Migration Required)。"

---

## 4. Summary of Architecture Updates

将这些洞察合入平台架构图：

1.  **Metadata Engine**: 基于 `spec-graph` 的 Track ID 索引系统。
2.  **Context Packer**: 基于 `LeanSpec` 协议 + `Logix IR` 提取器的混合上下文组装器。
3.  **Governance Sentinel**: 一个基于 RunResult/AlignmentReport 验证状态流转的守护进程。
