---
title: 02 · 全双工架构：Code ↔ Studio ↔ Runtime
status: draft
version: 2025-12-10
---

# 全双工架构：Code ↔ Studio ↔ Runtime

> 本文档描述 SDD 平台的核心技术架构：如何在 **代码 (Code)**、**可视化编辑器 (Studio)** 与 **运行时 (Runtime)** 三者之间建立双向、无损的同步关系。

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
│          │    ┌───────────────────────┐       │                     │
│          │    │   StateTraitGraph     │       │                     │
│          └───▶│   (Shared IR / SSoT)  │◀──────┘                     │
│               └───────────────────────┘                             │
│                          │                                          │
│                          │ install()                                │
│                          ▼                                          │
│               ┌───────────────────────┐                             │
│               │      Runtime          │                             │
│               │   (Effect / Logix)    │                             │
│               └───────────────────────┘                             │
│                          │                                          │
│                          │ emit EffectOp                            │
│                          ▼                                          │
│               ┌───────────────────────┐                             │
│               │   EffectOp Timeline   │───▶ Devtools / Studio       │
│               └───────────────────────┘                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**三条核心链路**：

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
    │ Pattern Matching (StateTrait.xxx)
    ▼
IntentRule IR
    │
    │ StateTraitGraph.build()
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
- 使用 Prettier 重新格式化变更区域
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

```ts
interface EffectOpEvent {
  timestamp: number
  moduleId: string
  opKind: 'state' | 'action' | 'service' | 'lifecycle'

  // StateTrait 相关
  traitPath?: string // e.g., "profile" (source 触发)
  triggerFields?: string[] // e.g., ["a", "b"] (computed 依赖)

  // 执行信息
  status: 'start' | 'success' | 'failure'
  duration?: number
  error?: unknown
}
```

### 4.2 Graph 联动

```
EffectOp Event (traitPath: "profile", status: "start")
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
│  t=0ms   ┌────────────────┐                                     │
│          │ action:selectProvince                                │
│          └────────────────┘                                     │
│              │                                                  │
│  t=5ms   ┌────────────────┐                                     │
│          │ link:cityList (from: province)  ──▶ [高亮 Graph 边]  │
│          └────────────────┘                                     │
│              │                                                  │
│  t=10ms  ┌────────────────┐                                     │
│          │ source:cities (refresh)         ──▶ [高亮 Graph 节点] │
│          └────────────────┘                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5. 技术实现路径

### Phase 1: Language Server 基础

| 组件          | 职责                        | 技术选型                    |
| :------------ | :-------------------------- | :-------------------------- |
| File Watcher  | 监听 `.ts` 文件变化         | chokidar / Node.js fs.watch |
| AST Parser    | 解析 TypeScript 代码        | ts-morph                    |
| Graph Builder | 从 AST 构建 StateTraitGraph | 自研（基于 data-model.md）  |
| WS Server     | 与 Studio 通信              | ws / Socket.IO              |

### Phase 2: Studio 集成

| 组件           | 职责                | 技术选型              |
| :------------- | :------------------ | :-------------------- |
| Graph Renderer | 渲染节点与边        | React Flow / D3.js    |
| Intent Sender  | 发送 Codegen Intent | WebSocket Client      |
| Timeline View  | 展示 EffectOp 事件  | 自研（基于 Devtools） |

### Phase 3: Runtime 观测

| 组件             | 职责                | 技术选型             |
| :--------------- | :------------------ | :------------------- |
| EffectOp Emitter | 发射运行时事件      | 现有 Middleware 扩展 |
| Event Bridge     | 转发事件到 Studio   | 与 WS Server 复用    |
| Node Highlighter | 联动高亮 Graph 节点 | 前端状态管理         |

## 6. 部署模式

### 模式 A: 纯本地（开发者）

```
Developer Machine
├── VS Code + Intent Flow Extension
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

## 7. 与 SDD 的关系

全双工架构是 SDD 平台的**技术底座**：

| SDD 阶段      | 全双工支撑                                                   |
| :------------ | :----------------------------------------------------------- |
| **SPECIFY**   | Studio 可视化帮助 PM 理解现有 Module 结构                    |
| **PLAN**      | Architect Agent 可基于 Graph 分析依赖，规划新 Module         |
| **IMPLEMENT** | Coder Agent 生成代码，Studio 实时同步展示                    |
| **VERIFY**    | Runtime 事件回传，Scenario Runner 基于 Graph + Timeline 验证 |

**核心价值**：让 AI、人类、代码三方可以在同一张"活图"上协作，而不是各自维护不同的"真相"。
