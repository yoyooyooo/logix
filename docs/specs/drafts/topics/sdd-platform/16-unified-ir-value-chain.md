---
title: 16 · Unified IR Value Chain：从试运行到平台智能
status: draft
version: 2025-12-23
value: vision
priority: later
related:
  - ./15-module-runtime-reflection-loader.md
  - ./13-agentic-reversibility.md
  - ../../../../../specs/024-root-runtime-runner/spec.md
---

# Unified IR Value Chain：从试运行到平台智能

> **Core Insight**:
> Root Runtime Runner (024) 不仅仅是一个“运行入口”，它是**软件制造工厂的流水线探针**。
> 通过“Loader Pattern 试运行”，我们把如果不运行就看不见的**“暗物质”**（动态依赖、副作用轨迹、环境需求）显性化为**结构化 IR**，从而支撑起 Low-Code Studio、Agentic Coding 与 Quality Guardian 的上层建筑。

## 1. The 3 Existing IRs (Infrastructure)

这三种 IR 已经存在于源码或设计中，是平台的地基。

| Layer  | IR Name                                | Source                 | Nature                                                                                                            |
| :----- | :------------------------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------- |
| **L0** | **Construction IR**<br>(Module Object) | `Module.make`          | **Builder Blueprint**<br>- 描述“怎么造”<br>- 包含源代码位置、Schema 引用、工厂函数闭包                            |
| **L1** | **Runtime IR**<br>(ModuleRuntime)      | `Runtime.make`         | **Living Instance**<br>- 描述“它是谁”<br>- 包含实例 ID、状态树 (`State`)、计算依赖图 (`ConvergeStaticIrRegistry`) |
| **L2** | **Manifest IR**<br>(ModuleDescriptor)  | `emitModuleDescriptor` | **Transport Snapshot**<br>- 描述“长什么样”<br>- **可序列化 JSON**，用于跨进程传输给 Studio/CLI                    |

## 2. The 4 Missing Links (To Be Extracted)

为了实现真正的 Intelligent Platform，我们需要从“试运行”的上下文中进一步提炼四种高阶 IR。

### 2.1 Trace IR (执行轨迹意图)

- **Definition**: 结构化的因果链记录，而非单纯的 Log 文本。
  - `Action(Click) -> Reducer(State A->B) -> Logic(Trigger Effect) -> Service(Call API) -> Action(Success)`
- **Structure**:
  ```typescript
  interface TraceNode {
    cause: string // "action:submit"
    effect: string // "state:loading=true" | "service:api.post"
    duration: number
    context: { txnId: string; moduleId: string }
  }
  ```
- **Value**:
  - **Auto-Bug Report**: 用户报错时一键上传 Trace，开发者直接回放 (Time Travel)。
  - **AI Behavior Cloning**: 把人工操作产生的 Trace 喂给 Agent，训练它“学会这个业务流程”。

### 2.2 Intent IR (反向语义图)

- **Definition**: 利用 Spec 13 (Reversibility) 思路，从代码反向提取的**语义摘要**。
- **Extraction**: Loader 结合 AST 分析与注释/AI 总结。
- **Value**:
  - **Code-to-Spec**: 从遗留代码生成文档/SRD。
  - **Semantic Search**: 搜“防抖”能找到 `Effect.debounce` 实现的代码块。

### 2.3 Environment IR (环境契约)

- **Definition**: 模块运行所需的**外部依赖集合声明**。
- **Extraction**: 在 Loader 试运行期间，捕获所有被请求的 `Service Tag` 和 `Config Key`。
- **Structure**:
  ```typescript
  interface EnvironmentRequirements {
    services: { tagId: string; usage: 'mandatory' | 'optional' }[]
    configs: { key: string; default?: unknown }[]
  }
  ```
- **Value**:
  - **Deployment Pre-flight**: “当前环境缺失 `StripeService`，禁止部署”。
  - **Infra Generation**: 自动生成 K8s ConfigMap 或 Docker Compose 依赖。

### 2.4 Effect Op Tree (副作用树)

- **Definition**: 基于 Effect Supervisor 捕获的 Fiber 父子关系与并发结构。
- **Value**:
  - **Concurrency Analysis**: 可视化 Race Conditions、死锁。
  - **Leak Detection**: 识别主流程结束后依然挂起 (Dangling) 的 Fiber 分支。

## 3. Platform Capabilities Matrix

这些 IR 如何支撑上层应用？

| Capability            | Powered By            | Description                                                                     |
| :-------------------- | :-------------------- | :------------------------------------------------------------------------------ |
| **Remote Studio**     | **Manifest IR**       | 前端画板不读源码，只读 JSON Manifest，实现“拖拽 -> 修改属性 -> 代码生成”闭环。  |
| **CI Contract Guard** | **Manifest IR**       | PR 提交时对比 Manifest，自动拦截 Schema 破坏性变更、API 丢失。                  |
| **Live Topology**     | **Runtime IR**        | Devtools 展示 `Derived = A + B` 实时依赖图，点击节点查看当前值。                |
| **HMR Precision**     | **Runtime IR**        | 基于依赖图计算影响范围，实现“改一个字段只重算相关 Derived”的细粒度热更。        |
| **Digital Twin**      | **Runtime IR**        | 后端运行 ModuleRuntime，前端只做纯 UI 渲染 (Server-Driven Logic)。              |
| **Architecture Lint** | **Construction IR**   | 在 Mock 环境试运行，若发现 Module 构造阶段连接 DB，直接报错（强制副作用分离）。 |
| **Agent Tooling**     | **Manifest + Intent** | Agent 读取 Manifest 自动注册工具 (Function Calling)；读取 Intent 理解工具用途。 |

## 4. Implementation Strategy (Draft)

1.  **Phase 1 (Now)**: 落地 `024-root-runtime-runner`，打通 **Manifest IR** 的获取链路（CLI -> Loader -> JSON Output）。
2.  **Phase 2 (Next)**: 在 Devtools 中利用 `ConvergeStaticIrRegistry` 实现 **Live Topology** 可视化。
3.  **Phase 3 (Future)**: 引入 AI 分析器，结合 Runtime Trace 实现 **Intent IR** 的反向提取。
