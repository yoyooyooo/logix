---
title: 03 · 资产映射与 Schema 定义 (Assets & Schemas)
status: draft
version: 14 (Effect-Native)
---

> 本文档定义了“三位一体”模型下的核心资产结构。Intent 是唯一的真理来源，逻辑执行层在早期曾统一归纳为 LogicDSL；当前 v3 在实现上已收敛为 **Store / Logic / Flow** 三大运行时原语 + 基于 Effect 的 **pattern-style 长逻辑封装风格**。LogicDSL 可以理解为这些原语在 Intent / 工具链视角下的统称，具体类型设计以 `@logix/core`（`packages/logix-core/src`）为准；场景验证以 `examples/logix` 为准；Pattern 资产（带 id/config 的可复用逻辑）属于平台层概念，而不是运行时内建类型。

## 1. IntentSpec v3 (The SSoT)

Intent 不再是扁平的配置，而是分层的树状结构，每个节点包含 `spec` (需求) 和 `impl` (实现)。

```typescript
interface IntentSpecV3 {
  id: string;
  title: string;
  version: string;

  // 三大维度
  ui: UIIntentNode[];
  logic: LogicIntentNode[];
  module: ModuleIntentNode[];

  // 全局约束
  constraints?: {
    performance?: PerformanceBudget;
    security?: SecurityPolicy;
  };
}
```

## 2. UI Intent Schema

UI 意图描述界面结构。它是一棵组件树。

```typescript
interface UIImplConfig {
  component: string; // 组件名或 Pattern 资产 ID（平台层概念）
  props: Record<string, any>;
  slots?: Record<string, string>; // 插槽映射到子节点 ID

  // 信号发射配置
  emits?: Record<string, { _tag: string, payload?: any }>; // e.g. { onClick: { _tag: 'submitOrder' } }

  // 视觉交互状态 (Visual State)
  state?: Record<string, any>; // e.g. { isOpen: false }
}
```

## 3. Logic Intent Schema (Intent Graph)

Logic 意图描述业务流程。在 v3 中，Logic 的“可执行实现载体”落在代码里；平台侧的 Logic/IntentRule/Graph 视图是从代码中可解析子集抽取出的结构化投影（Memory AST），用于可视化与对齐。

```typescript
interface LogicImplConfig {
  // 触发器
  trigger: {
    type: 'onAction';
    actionTag: string; // e.g. 'submitOrder'
    payloadSchema?: JSONSchema;
  };

  // 源码引用 (The Truth)
  source: {
    file: string;
    exportName: string;
  };

  // 内存图结构 (The View)
  // 仅用于画布渲染，不持久化存储
  graph: {
    nodes: Record<string, LogicNode>;
    edges: LogicEdge[];
  };
}

type LogicNode =
  // 基于 Effect 的长逻辑封装（pattern-style）：(input) => Effect
  | { type: 'effect-block'; fnName: string; config?: any }
  // Flow 侧骨架节点：围绕 actions$ / state 的时序与并发语义
  | { type: 'flow-op'; op: 'debounce' | 'throttle' | 'filter'
      | 'run' | 'runLatest' | 'runExhaust' }
  // Control 侧骨架节点：围绕 Effect 的结构化控制流
  | { type: 'control-op'; op: 'branch' | 'tryCatch' | 'parallel' }
  // 其它无法结构化展开的代码块（黑盒）
  | { type: 'code-block'; content: string };

// 元数据：用于支持全双工同步
interface NodeMetadata {
  source?: {
    file: string;
    line: number;
    hash: string; // 内容指纹，用于检测人工修改
  };
  visual?: {
    x: number;
    y: number;
    collapsed?: boolean;
  };
}
```

## 4. Module Intent Schema

Module 意图描述数据模型和服务契约。

```typescript
interface ModuleImplConfig {
  name: string;

  // 实体 / 状态定义 (映射为 Effect.Schema)
  fields: Record<string, FieldSchema>;

  // 服务契约 (映射为 Effect Service / Tag)
  services: Record<string, {
    args: FieldSchema[];
    return: FieldSchema | 'void';
    errors?: string[];
  }>;

  /**
   * 实现来源：
   * - "module"：生成 Logix.Module + ModuleImpl（形如 Module.implement({ initial, logics })）；
   * - "pattern"：基于 Pattern 直接生成 ModuleImpl（例如 场景 Pattern -> ImplWithService）；
   * - "custom"：由业务自定义落点，仅在 Schema 层记录结构。
   *
   * 在 runtime 中，ModuleImplConfig 会被落实为：
   * - 一个 Module 蓝图（ModuleInstance）；
   * - 至少一个 ModuleImpl（配置好的 initial/logics/Env 组合）；
   * - 可选的 withLayer 组合（例如 Impl.withLayer(ServiceLayer)）。
   */
  source?: {
    type: 'module' | 'pattern' | 'custom';
    config?: any;
  };
}
```

## 5. Logix Builder SDK (`@logix/builder`)

为了支持 **pattern-style 长逻辑封装**，Logix 体系提供了一套基于 Store / Logic / Flow 的 Builder SDK。它不是另一个运行时，而是帮助开发者（或 LLM）更容易写出「可被平台理解的 `(input) => Effect` 函数」。

详细设计仍参考：**[Logix Builder SDK Design](../../runtime-logix/builder/01-builder-design.md)**，但当前 v3 的约定是：

```typescript
import { Effect } from "effect";

// 示例：使用 Builder 定义一个 pattern-style 提交流程
// 对外暴露的只是 (input) => Effect 程序，本身不引入第二套 Flow/Logic 运行时。
export const runReliableSubmit = (input: { data: SubmitData }) =>
  Effect.gen(function* (_) {
    // 内部可以调用 Module Service 或其它 pattern-style 函数；
    // 如需与 Logix ModuleRuntime / Flow 交互，则由调用侧在 Module.logic 中通过 Bound API `$` 访问 state / flow / control。
  });
```

**核心价值**：
1.  **同构体验**：pattern-style 函数在语言层面仍基于 Effect / Service / Config，与业务 Logic 使用的原语一致；区别只在于它被资产化为 `(input) => Effect`。
2.  **类型安全**：基于 TypeScript 与本地 `effect` d.ts 的强类型推导。
3.  **逻辑复用 (Composition)**：长逻辑本质是 `(input) => Effect`，可以像积木一样组合，并在平台层选择性资产化（挂接 id/configSchema 等 meta）。
4.  **图码同步**：通过 Logic / Flow / Control 在业务 Logic 中的标准调用（如 `flow.runLatest` / `$.match` 等），Parser 可以稳定识别逻辑骨架并渲染为图；pattern-style 函数则作为图中的 `effect-block` 节点出现。

## 6. 自上而下的资产分层与复用视角

为了在平台化与资产复用阶段保持一致的语言，本节从“自上而下”的角度给出资产分层视图，补充前文从运行时/实现角度给出的分类。

可以粗略将资产分为四个层级，对应从“业务需求”到“运行时代码”的渐进演化：

### 6.1 Level 0：业务需求资产（Business Requirement）

- 形态：需求文档 / 用户故事 / PRD 片段，通常记述为“当 X 发生，若满足 Y，则系统应 Z”。
- 资产示例：
  - 搜索结果第一条应在右侧详情展示；
  - 审批通过时记录审计日志并刷新待办列表；
  - 用户切换国家时清空省份和城市。
- 复用方式：
  - 通过「需求模板 / 用例库」复用：为常见业务场景提供结构化的描述模板，便于在新项目中快速“叫出”类似需求；
  - 在平台侧，与 `IntentSpecV3` 的顶层字段（`ui / logic / domain / constraints`）对齐。

### 6.2 Level 1：需求意图资产（Requirement Intent / Use Case Blueprint）

- 形态：将 Level 0 的自然语言需求投影到 v3 三维 Intent 模型与 Logic Intent Graph 上，形成“用例级蓝图”：
  - 明确涉及哪些 UI/Interaction 节点、哪些 Module 实体/字段、哪些 Logic 步骤；
  - 使用较粗粒度的 `IntentRule` 集合作为内部表示（source/sink 已绑定模块/字段，但 pipeline 可以暂留自然语言注释）。
- 资产示例：
  - “搜索-详情联动蓝图”：一组从 Search.State/Action 到 Detail.Action 的规则；
  - “审批流蓝图”：一组从 UI 交互到 Service 调用与状态更新的规则。
- 复用方式：
  - 在平台 Galaxy 视图上作为“用例模板”出现，通过参数（模块 ID、字段路径、策略选项）应用到具体项目；
  - 为 Level 2 的开发意图提供约束与参考，不直接决定具体 API 形态。

### 6.3 Level 2：开发意图资产（Developer Intent）

- 形态：在 Level 1 蓝图的基础上，落到具体的 Module / Pattern / Intent API 选择上：
  - 确定使用哪些 Logix.ModuleShape / Logic / Spec 模块；
  - 为每条规则选择对应的表现形式：
    - L1：单 Store 内同步联动 —— 代码侧推荐使用 Fluent DSL（`$.onState / $.onAction + $.state.update/mutate`），在 IR 中映射为 L1 IntentRule；
    - L2：跨 Store 协作 —— 代码侧推荐使用 Fluent DSL（`$.use(StoreSpec) + Fluent DSL（$Other.changes/… → $SelfOrOther.dispatch）`），在 IR 中映射为 L2 IntentRule（Coordinate）；
    - L3：复杂 Flow/Pattern 组合 —— 直接使用 `Flow.*` / Pattern / Effect 组合，平台视为部分可解析或 Gray/Black Box；
  - 形成结构化、可出码的 `IntentRule` 集合。
 - 资产类型：
  - **Pattern 资产**：`(input) => Effect` 行为积木，配有 `configSchema` 与 meta，可在多个模块/项目中复用；
  - **Logic 模板**：针对某一类场景的 Logic 程序值（如标准搜索场景 Logic），适合在一个产品线内部复用；
  - **Module 模板**：包含特定 State/Action 形状与一组 Logic 的“模块级模板”（如标准分页列表 Module）；
  - **IntentRule 集合**：一个模块内或跨模块的完整规则表。
- 复用方式：
  - Pattern 与 IntentRule 集合是平台化的首选资产，适合在团队/多项目间共享；
  - Logic/Store 模板更像是“中层模板”，适合在单项目或单条产品线内复用，并在实践验证后逐步提炼出更通用的 Pattern/Blueprint。

### 6.4 Level 3：实现资产（Implementation / Code）

- 形态：具体项目中的 Module / Logic / Pattern / UI 代码与运行时配置：
  - 类型安全的 State/Action Schema、`Logix.Module.make('Id', { state, actions })` 定义与对应的 `Module.logic(($) => Effect.gen(...))` 调用；
  - Logic 程序中的 `Effect.gen` 逻辑，结合 Fluent DSL（`$.onState` / `$.onAction` / `$.on`）/ Flow / Control，IR 层统一使用 `IntentRule` 表达语义；
  - Pattern 实现文件、测试用例与 React 绑定代码。
- 复用方式：
  - 以普通工程方式拷贝/改造；
  - 更推荐在日常开发中“从 Level 3 反向提炼出 Level 2/1 资产”：
    - 将经常被 Copy 的行为逻辑提炼为 Pattern；
    - 将稳定的模块协作关系提炼为 Use Case Blueprint 与 IntentRule 集合；
    - 将高频需求表述方式归档为 Level 0 的需求模板。

### 6.5 平台化时的关注重点

在规划平台与资产复用时，可按照层级决定“优先平台化的对象”：

- **优先级 1：Pattern + IntentRule 集合（Level 2）**
  - 这是「开发意图」层的主力资产，既与运行时代码紧密相关，又足够抽象、易于配置。
- **优先级 2：Use Case Blueprint（Level 1）**
  - 面向 PM/架构师的“业务用例蓝图”，适合在 Galaxy 视图中作为起点，通过参数化派生多个项目内的实现。
- **优先级 3：Logic/Store 模板（Level 2 / 3 之间）**
  - 更适合作为某条产品线内部的模板，经过实际项目打磨后，再考虑部分内容上升为 Pattern/Blueprint。
- **Level 0 模板**
  - 用于支撑从需求文档到 IntentSpec 的结构化录入，属于平台 UX 层面的建设，不直接参与运行时代码生成。

本节视图不是对前文资产分类的替代，而是从“业务需求 → 意图 → 实现”的链路出发，为后续平台化与资产运营提供一个统一的参照维度。***
