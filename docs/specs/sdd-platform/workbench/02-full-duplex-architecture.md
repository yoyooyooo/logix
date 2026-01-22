---
title: 02 · 全双工架构：Code ↔ Studio ↔ Runtime
status: draft
version: 2025-12-10
value: vision
priority: later
---

# 全双工架构：Code ↔ Studio ↔ Runtime

> 本文档描述 SDD 平台的**远期方向**：未来如何在 **代码 (Code)**、**可视化编辑器 (Studio)** 与 **运行时 (Runtime)** 三者之间建立双向、尽可能无损的同步关系。
>
> 口径：运行时主时间轴以 `tickSeq`（逻辑时间）为参考系；wall-clock 仅用于 UI 展示。形式化模型见 `docs/ssot/platform/contracts/00-execution-model.md`。

## 0. 现实约束与阶段性承诺

> 注意：**全双工不属于近期交付目标**。在早期（MVP/v0.1）我们会刻意避免投入 Language Server / AST Patch / 冲突合并等高工程量基础设施；本文用于长期“惦记”与对齐，不用于承诺排期。

### 0.1 MVP 必需链路（最小闭环，不依赖全双工）

- **必需**：`Runtime → Studio` 的观测回流（以 RunResult 为唯一 Grounding：`evidence.events` + snapshots + optional tape）。
- **可选**：`Code → Studio` 的只读索引（优先走 Loader/反射提取与受约束 DSL 解析，而非全量 AST）。
- **不做**：`Studio → Code` 的任意代码回写与冲突合并（最多只做“生成骨架/受限槽位更新”，且明确为实验性）。

### 0.2 分阶段目标（从单向到全双工）

| 阶段 | 目标 | 允许的能力 | 不承诺的能力 |
| --- | --- | --- | --- |
| v0（MVP） | 跑通 Spec→Code→RunResult→Alignment | 只读回放 + 只读证据链；必要的静态 IR 导出（`C_T`） | 代码回写、协同、冲突合并、全量解析 |
| v1（半双工） | 让 Studio 能“看见仓库结构” | Code→Studio 只读索引；受约束 DSL 的解析与 Diff | 任意 AST Patch、无损 roundtrip |
| v2（全双工） | 形成可控的双向编辑回路 | 受限槽位的 Studio→Code Patch；有限冲突处理 | “对任意 TS 代码无损反射/回写” |

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Full Duplex Architecture                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    ┌─────────────┐                      ┌─────────────┐             │
│    │   Code      │◀────────────────────▶│   Studio    │             │
│    │  (.ts src)  │   Parser / Codegen   │  (Canvas)   │             │
│    └─────────────┘                      └─────────────┘             │
│          │                                    │                     │
│          │                                    │                     │
│          │    ┌──────────────────────────────┐                      │
│          │    │ Unified Static IR (C_T + Π)  │                      │
│          └───▶│ Traits IR + Workflow Static IR│◀─────────────────────┘
│               └──────────────────────────────┘                      │
│                          │                                          │
│                          │ install()                                │
│                          ▼                                          │
│               ┌───────────────────────┐                             │
│               │      Runtime          │                             │
│               │   (Effect / Logix)    │                             │
│               └───────────────────────┘                             │
│                          │                                          │
│                          │ emit Trace / Tape (tick)                  │
│                          ▼                                          │
│               ┌───────────────────────┐                             │
│               │   Trace / Tape Stream │───▶ Devtools / Studio       │
│               └───────────────────────┘                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**三条核心链路（目标形态；阶段见 0.2）**：

| 链路                 | 方向 | 作用                   |
| :------------------- | :--- | :--------------------- |
| **Code → Studio**    | 逆向 | 解析代码，生成可视化图 |
| **Studio → Code**    | 正向 | 画布操作，回写源码     |
| **Runtime → Studio** | 观测 | 运行时事件，点亮逻辑图 |

## 2. 链路 1：Code → Studio（逆向解析）

### 2.1 技术栈

```
Source Code (.ts)
    │
    │ ts-morph / TypeScript Compiler API
    ▼
AST Analysis
    │
    │ Pattern Matching (StateTrait.xxx / Workflow.make)
    ▼
IntentRule IR
    │
    │ Static IR build (C_T + Π)
    ▼
Studio Canvas (Nodes + Edges)
```

### 2.2 可解析性设计

**关键约束**：`StateTrait.from(Schema)({ ... })` 的声明式语法确保：

| 特性       | 传统 Effect 流 | StateTrait DSL                          |
| :--------- | :------------- | :-------------------------------------- |
| 位置可预测 | 逻辑散落各处   | 必须在 `Module.make()` 的 `traits` 槽位 |
| 结构确定   | 任意 pipe 组合 | 固定的 `computed/source/link` 函数调用  |
| 依赖显式   | 需分析闭包捕获 | `deps` / `from` / `key` 参数直接声明    |

### 2.3 解析边界

| 代码类型                      | 可解析程度    | 处理方式                                     |
| :---------------------------- | :------------ | :------------------------------------------- |
| `traits` 对象                 | ✅ 完全可解析 | 提取为 Graph 节点与边                        |
| `Workflow.make/install`    | ✅ 完全可解析 | 提取为 Workflow Static IR（Π slice）并联动画布节点/边 |
| `Logic.run()` 中的 Fluent API | ⚠️ 部分可解析 | 识别 `$.onAction/onState`，标记为 IntentRule |
| 任意 Effect 编排              | ❌ 黑盒       | 标记为 "Escape Hatch"，不可视化细节          |

### 2.4 增量更新协议

```ts
interface FileChangeEvent {
  path: string
  affectedModules: string[]
}

// Language Server 响应
interface GraphUpdate {
  moduleId: string
  diff: {
    addedNodes: GraphNode[]
    removedNodes: string[]
    modifiedEdges: GraphEdge[]
  }
}
```

## 3. 链路 2：Studio → Code（正向生成）

### 3.1 操作映射

| Studio 操作类型 | Codegen Intent                                                        | AST 变更                                   |
| :-------------- | :-------------------------------------------------------------------- | :----------------------------------------- |
| 添加 computed   | `{ action: "add_trait", kind: "computed", ... }`                      | 在 `traits` 对象中插入新属性               |
| 修改 link 源    | `{ action: "modify_trait", path: "X", changes: { from: "newPath" } }` | 更新 `StateTrait.link({ from: ... })` 参数 |
| 删除 Trait      | `{ action: "remove_trait", path: "Y" }`                               | 从 `traits` 对象中移除属性                 |
| 修改参数        | `{ action: "modify_param", path: "Z.debounce", value: 1000 }`         | 更新 `.debounce(500)` → `.debounce(1000)`  |

### 3.2 AST 变更策略

**核心原则**：最小变更范围

```ts
// 定位策略
1. 找到 Module.make("ModuleId", { ... })
2. 找到 traits 属性
3. 在 traits 对象内部执行增删改

// 格式保持
- 使用 oxfmt 重新格式化变更区域
- 保留原有注释位置（Trivia）
- 保持 import 语句不变（除非需要新增）
```

### 3.3 冲突处理

当 Code 与 Studio 同时修改时：

| 场景          | 处理方式                              |
| :------------ | :------------------------------------ |
| Code 变更优先 | Studio 重新解析，丢弃未保存的画布编辑 |
| 合并冲突      | 提示用户手动解决（类似 Git 冲突）     |
| 类型错误      | 阻止写回，在 Studio 中提示错误        |

## 4. 链路 3：Runtime → Studio（运行时观测）

### 4.1 事件模型

**裁决**：Runtime → Studio 的事件面不自造 “EffectOpEvent”，统一复用协议壳与可导出事件引用：

- 事件信封：`ObservationEnvelope`（`specs/005-unify-observability-protocol/contracts/schemas/observation-envelope.schema.json`）
  - `runId + seq`：唯一权威顺序（允许间隙）
  - `timestamp`：仅用于 UI 展示/统计
- 默认 payload：`RuntimeDebugEventRef`（`specs/005-unify-observability-protocol/contracts/schemas/runtime-debug-event-ref.schema.json`）
  - 必须满足 JSON 可序列化；错误用 `errorSummary`，禁止透传 `unknown/Error/Cause` 对象图
- 参考系与锚点：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`（`tickSeq/txnSeq/opSeq/linkId + program/run/timer/call anchors`）

> 直观理解：Studio 消费的是 RunResult 的 `evidence.events[]`，而不是“运行时内部对象”。当需要更强能力（回放/分叉）时，再通过 `tape` 增强（见 `specs/075-workflow-codegen-ir/contracts/tape.md`）。

### 4.2 Graph 联动

```
ObservationEnvelope(debug:event, meta.traitPath="profile", status="start")
    │
    │ 映射
    ▼
StateTraitGraph.findNode("profile")
    │
    │ 高亮
    ▼
Studio Canvas: "profile" 节点闪烁
```

### 4.3 时间线视图

```
┌─────────────────────────────────────────────────────────────────┐
│  Timeline View                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  tick=1  ┌────────────────────────────┐                          │
│          │ action:selectProvince       │                          │
│          └────────────────────────────┘                          │
│              │                                                  │
│  tick=1  ┌────────────────────────────┐                          │
│          │ link:cityList(from:province) ──▶ [高亮 Graph 边]      │
│          └────────────────────────────┘                          │
│              │                                                  │
│  tick=2  ┌────────────────────────────┐                          │
│          │ source:cities(refresh)      ──▶ [高亮 Graph 节点]      │
│          └────────────────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5. 技术实现路径（远期路线图）

### Phase 1: Language Server 基础

| 组件          | 职责                        | 技术选型                    |
| :------------ | :-------------------------- | :-------------------------- |
| File Watcher  | 监听 `.ts` 文件变化         | chokidar / Node.js fs.watch |
| AST Parser    | 解析 TypeScript 代码        | ts-morph                    |
| Graph Builder | 从 AST 构建 Unified Static IR（C_T + Π） | 自研（基于 data-model.md）  |
| WS Server     | 与 Studio 通信              | ws / Socket.IO              |

### Phase 2: Studio 集成

| 组件           | 职责                | 技术选型              |
| :------------- | :------------------ | :-------------------- |
| Graph Renderer | 渲染节点与边        | React Flow / D3.js    |
| Intent Sender  | 发送 Codegen Intent | WebSocket Client      |
| Timeline View  | 展示 tickSeq 锚定的 Trace/Tape 事件 | 自研（基于 Devtools） |

### Phase 3: Runtime 观测

| 组件             | 职责                | 技术选型             |
| :--------------- | :------------------ | :------------------- |
| Debug/Event Emitter | 发射可导出事件（`RuntimeDebugEventRef`） | 现有 DebugSink/Hub 扩展 |
| Event Bridge     | 转发事件到 Studio   | 与 WS Server 复用    |
| Node Highlighter | 联动高亮 Graph 节点 | 前端状态管理         |

## 6. Dev Server 与 Digital Twin（全双工的物理承载，远期）

> 本节收敛 Dev Server / Digital Twin 的平台侧要点：全双工不是“概念图”，它必须落在一个可运行的 Dev Server/Runner 上。

Dev Server（`logix dev` / CLI 代理）在平台侧承担三重职责：

1. **项目感知（Project Awareness）**：识别仓库中的 Module / Traits / Programs / IntentRule，并向 Studio 暴露“Universe 清单”（可导航、可 diff、可生成）。
2. **Code ↔ IR 双向桥接**：把受约束的代码子集解析为 Unified Static IR（`C_T + Π`），并把 Studio 的编辑意图翻译为最小 AST Patch 回写到源码。
3. **Runtime 事件中继**：将运行中 Runtime 的 `evidence.events`（ObservationEnvelope）中继到 Studio，并按 `tickSeq/instanceId/txnSeq/opSeq/linkId + program/run/timer/call anchors` 组织索引，支撑 Timeline/高亮/回放入口。

两个硬约束（避免“第二套真相源”）：

- **Parsability as a Feature**：需要结构化 DSL/IR 的地方必须可解析（`traits`、`Workflow.make` 等）；逃生舱（任意 Effect/Stream）可以存在，但必须被标记为 Gray/Black Box（可展示、不可精细编辑、且回放能力受限）。
- **Observability as a Contract**：平台消费的是 RunResult（`EvidencePackage + optional Tape + snapshots`），而不是运行时内部对象；排序以 `runId + seq` 为唯一权威，`tickSeq` 只作为参考系锚点（口径见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）。

## 7. 部署模式

### 模式 A: 纯本地（开发者）

```
Developer Machine
├── VS Code + Logix Extension
├── logix lsp (Node.js process)
│   ├── TypeScript Compiler
│   ├── Graph Builder
│   └── WS Server
└── Browser / Electron Studio
```

### 模式 B: 云端协作（团队）

```
Cloud Platform
├── Headless TS Compiler (Serverless Worker)
├── Graph Store (Redis / DB)
└── Collaboration Server (WebSocket)

Client Browser
├── Studio UI
└── Local Code Editor (Monaco)
```

## 8. 与 SDD 的关系

全双工架构是 SDD 平台的**远期技术底座**。MVP 阶段仍然可以只依赖其中的「证据链回流（RunResult）」+「少量静态 IR（`C_T`）导出」跑通闭环。

| SDD 阶段      | 全双工支撑                                                   |
| :------------ | :----------------------------------------------------------- |
| **SPECIFY**   | Studio 可视化帮助需求录入者（PM/架构师）理解现有 Module 结构 |
| **PLAN**      | Architect Agent 可基于 Graph 分析依赖，规划新 Module         |
| **IMPLEMENT** | Coder Agent 生成代码，Studio 实时同步展示                    |
| **VERIFY**    | Runtime 事件回传，Scenario Runner 基于 Graph + Timeline 验证 |

**核心价值**：让 AI、人类、代码三方可以在同一张"活图"上协作，而不是各自维护不同的"真相"。
