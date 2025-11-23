# 架构总览 (Architecture Overview)

> **Status**: Draft
> **Date**: 2025-11-20

## 1. 总体架构分层

为了实现“标准化运行时”的目标，我们将采用严格的分层架构。每一层都有明确的职责边界，严禁跨层调用。

```mermaid
graph TD
    A[AI Coding Platform / Tools] -->|Generates/Parses| B(Application Code)
    B -->|Uses| C[Adapter Layer (@logix/react)]
    B -->|Uses| D[Domain Layer (@logix/form)]
    C -->|Depends on| E[Logix Layer (@logix/core)]
    D -->|Depends on| E
    E -->|Powered by| F[Effect-TS]
```

### Layer 1: The Logix Engine (`@logix/core`)

- **定位**: 通用状态运行时引擎。
- **职责**:
  - 状态定义 (Schema)
  - 动作分发 (Action Dispatch)
  - 逻辑原语 (Flow Kit / Operators)
  - 资源管理 (Scope / Lifecycle)
- **依赖**: `effect`
- **特征**: **No React**, **No DOM**, Pure Logic.

### Layer 2: The Domain (`@logix/form`, etc.)

- **定位**: 特定领域的逻辑封装。
- **职责**:
  - 基于 Logix 扩展领域特定的状态（如表单的 `touched`, `isSubmitting`）。
  - 提供领域特定的预设逻辑（如“校验”、“脏检查”）。
- **依赖**: `@logix/core`

### Layer 3: The Adapter (`@logix/react`)

- **定位**: UI 框架适配层。
- **职责**:
  - 将 Logix 的 Stream 映射为 React 的 Hooks。
  - 提供 UI 组件（如 `<Field />`）。
  - 处理 React 生命周期与 Logix Scope 的绑定。
- **依赖**: `@logix/core`, `@logix/form`, `react`

---

## 2. 仓库结构规划 (Repository Structure)

我们将重组 Monorepo，废弃原有的 `packages/react`（作为 v0 归档）。

```text
intent-flow/
├── docs/
│   └── specs/
│       ├── runtime-kernel/   # Logix Engine 规划文档（目录名后续可调整）
│       └── intent-driven-ai-coding/ # AI 平台规划
├── packages/
│   ├── logix/                # [New] 核心引擎
│   │   ├── src/
│   │   │   ├── store.ts      # makeStore
│   │   │   ├── logic.ts      # 逻辑编排器
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── form/                 # [New] 表单领域包
│   │   ├── src/
│   │   │   ├── makeForm.ts   # 基于 makeStore 的封装
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── react/                # [New] React 适配包
│   │   ├── src/
│   │   │   ├── useStore.ts
│   │   │   ├── useForm.ts
│   │   │   └── ...
│   │   └── package.json
│   │
│   └── _archive_react_v0/    # [Moved] 原 packages/react 移至此处归档
│
└── examples/                 # 验证与示例
    ├── basic-form/
    └── complex-state/        # 验证 Logix 的通用性
```

## 3. 能力分工与实现顺序 (Capabilities & Implementation Order)

我们将严格遵循 **Logix -> Form -> React** 的依赖顺序，绝不反向依赖。其中：

- **Logix (`@logix/core`)**：提供通用状态与逻辑运行时（本文件主要讨论对象）。
- **Form (`@logix/form`)**：作为 Logix 的第一个领域客户，验证其在表单场景下的表达力。
- **React Adapter (`@logix/react`)**：负责将 Logix 的能力以 Hooks/组件的形式暴露给 UI。

> 本节只描述能力分工与依赖关系，不绑定具体时间节点或阶段划分。具体实施节奏建议单独记录在 `ROADMAP.md`，避免影响设计讨论。

### Logix 能力域 (Logix Capability Domains)

- **State & Path**：Schema 定义、精确路径读写。  
- **Logic Primitives (Flow Kit)**：`Flow.define`、Source/Task/Sink 算子体系，提供 AI-Ready 的声明式逻辑编排能力。  
- **External Integration**：`on` / `mount`，用于接入 WebSocket、轮询、第三方缓存等外部源。  
- **Batching & Transactions**：`batch` 等批处理能力，用于大规模更新时控制通知与渲染。  
- **Dynamic Logic & Observability**：`addRule`/`LogicHandle` 与 Trace/Debug 能力，支撑 AI 动态注入逻辑与复杂联动调试。

### Form 作为 Logix 的领域客户

- 在 Form 领域内，基于 Logix 的 Store 模型扩展出 `FormState`（如 `values/errors/touched/isSubmitting`）。  
- 利用 Logix 的逻辑编排能力实现表单校验、脏检查、联动等典型场景。  
- 通过这些场景反向验证 Logix API 的合理性，并将最佳实践回流到本规范和示例中。

### React Adapter 的职责

- 基于 Logix 的 `state$/batch/error$/debug$` 提供 `useStore`、`useForm` 等 Hooks。  
- 管理 Store 的 Scope 生命周期，确保创建/销毁与组件树挂钩。  
- 坚持“React 只负责渲染与事件派发”，禁止在 UI 层重新引入业务级副作用系统。
