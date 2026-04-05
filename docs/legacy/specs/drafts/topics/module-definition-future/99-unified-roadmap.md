---
title: Unified Roadmap (Module NG) · State-First & ActionToken
status: draft
version: 1.0.0
value: core
priority: high
layer: Consolidation
---

# Unified Roadmap: State-First & ActionToken

> **一句话总结**：以 **ActionToken (04)** 为运行时与类型基座，以 **State-First Codegen (01)** 为开发者界面，以 **Primary Reducer (03)** 为同步性能保障，构建 "Write Design, Generate Primitives" 的下一代 Module 体系。

---

## 1. 核心决策：三层架构

我们不再把 01/02/03/04 看作独立的提案，而是同一套架构的不同切面。

### L0: Runtime Kernel (Primitives)

> 来源：**04-action-token-api.md** + **03-primary-reducer.md**

- **核心基元**：`ActionToken`。
  - 它是值级符号（Value-level Symbol），也是类型锚点。
  - 它显式携带 `schema` (Payload) 和可选的 `reduce` (Primary Reducer)。
- **执行模型**：
  - `dispatch(Token(payload))` 优先命中 Token 携带的 `reduce` 函数，执行 **同步、无 Watcher、高性能** 的状态变更（Primary Path）。
  - 然后才进入 Stream/Watcher 供 Logic 消费（Secondary Path）。
- **定位**：这是 **"目标汇编语言"**。除非写库或做底层设施，业务开发者 **不用手写** 它。

### L1: Toolchain (Bridge)

> 来源：**01-state-first-codegen.md**

- **核心机制**：Codegen。
- **输入**：`*.design.ts`（State Schema + Annotations）。
- **输出**：`*.generated.ts`（包含 ActionToken 定义和 Module 组装）。
- **定位**：这是 **"生产力层"**。它负责把 State Design 翻译成 Runtime Primitives。

### L2: Developer Experience (Surface)

> 来源：**01-state-first-codegen.md** 的设计部分

- **核心交互**：只维护 **State Design**。
  - 开发者只写 State Schema。
  - 通过注解（如 `logix/autoReducer`）描述简单的 CRUD 意图。
  - 对于复杂逻辑，引用生成的 Token 在 Logic 中写 Watcher。

---

## 2. 端到端工作流（The Golden Path）

### 步骤 1: 设计 (Design)

开发者创建 `ProjectState.design.ts`，这是唯一的 **Source of Truth**。

```typescript
// ProjectState.design.ts
import { Schema } from "effect";

export const ProjectState = Schema.Struct({
  // 简单字段：注解驱动生成 ActionToken + Primary Reducer
  name: Schema.String.annotations({
    "logix/auto": { action: "renameProject" },
  }),

  // 复杂字段：只生成 ActionToken，逻辑留给外部
  commits: Schema.Array(Schema.String).annotations({
    "logix/action": "pushCommit",
  }),
});
```

### 步骤 2: 生成 (Codegen)

工具链（Watch 模式）自动生成 `ProjectModule.generated.ts`。这里是 **04-action-token-api** 的主场。

```typescript
// (Generated) ProjectModule.generated.ts
import { Action, Module } from "@logixjs/core";
import { ProjectState } from "./ProjectState.design";

// 1. 生成 ActionTokens (04)
// 自动绑定了 Primary Reducer (03)
export const RenameProject = Action.make("renameProject", Schema.String, {
  reduce: (state, name) => ({ ...state, name }),
});

// 仅生成 Token，无 Primary Reducer
export const PushCommit = Action.make("pushCommit", Schema.String);

// 2. 组装 Module
export const ProjectModule = Module.make("Project", {
  state: ProjectState,
  actions: { RenameProject, PushCommit },
});
```

### 步骤 3: 消费 (Usage)

在 UI 和 Logic 中，开发者直接使用生成的 Token。**DX 闭环完成。**

```typescript
// 1. UI: 类型安全，F12 可跳转
import { RenameProject } from "./ProjectModule.generated";
dispatch(RenameProject("New Name"));

// 2. Logic: 引用 Token，享受 Find References
import { PushCommit } from "./ProjectModule.generated";

$.onAction(PushCommit).run((commitId) => {
  // 复杂副作用逻辑...
});
```

---

## 3. 为什么这条路线是“完美”的？

1.  **解决了 04 的“样板代码”问题**：
    用户担心 `Action.make` 太麻烦？没关系，Codegen 帮你写。用户只需要写 Schema 注解。

2.  **解决了 01 的“类型黑盒”问题**：
    01 如果没有 04（ActionToken）做支撑，生成的代码往往是一堆难以调试的类型体操。现在生成的全是 **实体代码（Tokens）**，类型推导自然且透明。

3.  **解决了 03 的“Reducer 归属”问题**：
    Primary Reducer 不再尴尬地挂在 Module 配置对象上，而是物理地绑定在 `ActionToken` 上。这使得 "Go to Definition" 能直接看到 Action 的定义及其同步变更逻辑。

4.  **保留了逃生舱**：
    如果 Codegen 无法满足需求，用户完全可以手动写一个 `ActionToken` 并 merge 进 Module。底层 API（ActionToken）是公开且稳健的。

## 4. 实施阶段规划

1.  **Phase 1: Runtime Primitives (Core)**

    - 实现 `Action.make` / `ActionToken`。
    - 改造 `ModuleRuntime` 的 `dispatch` 链路，支持识别 Token 并优先执行绑定的 pure reducer。
    - _产出_：`@logixjs/core` vNext，支持 Token API。

2.  **Phase 2: Codegen MVP (Tooling)**

    - 实现 `@logixjs/codegen`。
    - 解析 `logix/auto` 注解，生成 `Action.make` 代码。
    - _产出_：CLI 工具，输入 demo state，输出 working module。

3.  **Phase 3: Integration (DX)**
    - Vite 插件 / Watcher 集成。
    - VSCode 体验优化（隐藏 generated 文件，只看 design 文件）。

---

## 5. 对 Drafts 的裁决

- **04 (ActionToken)**: **采纳**。作为底层表示。建议增加 `Action.group` 语法糖方便手动党。
- **03 (PrimaryReducer)**: **采纳**。逻辑下沉到 ActionToken 的 `reduce` 属性中。
- **01 (Codegen)**: **采纳**。作为上层写法标准。需更新文档明确其生成目标是 ActionToken。
- **02 (ReducerRedesign)**: **部分采纳**。其 "Action Map + Schema" 的理念被 Codegen 吸收，但其 "Logic 内部 DSL ($.reducer)" 方案被 **废弃**（或仅作为 Legacy 兼容），因为我们选择了更静态的 "Token 携带 Reducer" 模型。
