--- 
title: 03 · 资产映射与 Schema 定义 (Assets & Schemas)
status: draft
version: 14 (Effect-Native)
---

> 本文档定义了“三位一体”模型下的核心资产结构。Intent 是唯一的真理来源，逻辑执行层在早期曾统一归纳为 LogicDSL；当前 v3 在实现上已收敛为 **Store / Logic / Flow** 三大运行时原语 + 基于 Effect 的 **pattern-style 长逻辑封装风格**。LogicDSL 可以理解为这些原语在 Intent / 工具链视角下的统称，具体类型设计以 `v3/effect-poc` 下 PoC 为最新事实源；Pattern 资产（带 id/config 的可复用逻辑）属于平台层概念，而不是运行时内建类型。

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
  domain: DomainIntentNode[];

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

Logic 意图描述业务流程。在 v3 中，**Code is Truth**。Logic Intent Schema 实际上是 Parser 从源码中提取的 **Memory AST**，用于可视化渲染。

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
  // Flow 侧骨架节点：围绕 actions$ / changes$ 的时序与并发语义
  | { type: 'flow-op'; op: 'debounce' | 'throttle' | 'filter' 
      | 'run' | 'runLatest' | 'runExhaust' | 'runSequence' }
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

## 4. Domain Intent Schema

Domain 意图描述数据模型和服务契约。

```typescript
interface DomainImplConfig {
  name: string;
  // 实体定义 (映射为 Zod/Effect Schema)
  fields: Record<string, FieldSchema>;
  
  // 服务契约 (映射为 Effect Tag)
  services: Record<string, {
    args: FieldSchema[];
    return: FieldSchema | 'void';
    errors?: string[];
  }>;
  
  // 实现来源 (映射为 Effect Layer)
  source?: {
    type: 'api' | 'store' | 'custom';
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
    // 内部可以调用 Domain Service 或其它 pattern-style 函数；
    // 如需与 Logix Store / Flow 交互，则由调用侧在 Logic.make 中注入 state / flow / control。
  });
```

**核心价值**：
1.  **同构体验**：pattern-style 函数在语言层面仍基于 Effect / Service / Config，与业务 Logic 使用的原语一致；区别只在于它被资产化为 `(input) => Effect`。  
2.  **类型安全**：基于 TypeScript 与本地 `effect` d.ts 的强类型推导。  
3.  **逻辑复用 (Composition)**：长逻辑本质是 `(input) => Effect`，可以像积木一样组合，并在平台层选择性资产化（挂接 id/configSchema 等 meta）。  
4.  **图码同步**：通过 Logic / Flow / Control 在业务 Logic 中的标准调用（如 `flow.runLatest` / `control.branch` 等），Parser 可以稳定识别逻辑骨架并渲染为图；pattern-style 函数则作为图中的 `effect-block` 节点出现。
