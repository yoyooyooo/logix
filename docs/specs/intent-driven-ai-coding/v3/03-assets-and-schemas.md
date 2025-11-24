---
title: 03 · 资产映射与 Schema 定义 (Assets & Schemas)
status: draft
version: 12 (Code-First)
---

> 本文档定义了“三位一体”模型下的核心资产结构。Intent 是唯一的真理来源，Pattern 是复用的模具，LogicDSL 和 Schema 是 Intent 的高保真投影。

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
  component: string; // 组件名或 Pattern ID
  props: Record<string, any>;
  slots?: Record<string, string>; // 插槽映射到子节点 ID
  
  // 信号发射配置
  emits?: Record<string, string>; // e.g. { onClick: 'signal:submitOrder' }
  
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
    type: 'onSignal';
    signalId: string;
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
  | { type: 'pattern-block'; patternId: string; config: any } // 积木节点
  | { type: 'dsl-op'; op: 'branch' | 'emit' | 'set' }       // 骨架节点
  | { type: 'code-block'; content: string };                  // 黑盒节点

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

为了支持 **Pattern** 的编写，Logix 体系提供了一套强类型的 Builder SDK。它是 Pattern 定义的“契约”。

详细设计请参考：**[Logix Builder SDK Design](../../runtime-logix/builder/01-builder-design.md)**

```typescript
import { definePattern } from '@logix/pattern';
import { LogicDSL } from '@logix/dsl';

// 示例：使用 Builder 定义 Pattern
export const ReliableSubmit = definePattern({
  config: Schema.Struct({ ... }),
  body: (config) => Effect.gen(function*(_) {
    const dsl = yield* _(LogicDSL);
    
    // 使用 Unified API 编写逻辑
    yield* dsl.retry(
      { times: config.retry },
      dsl.call(config.service, "submit")
    );
  })
});
```

**核心价值**：
1.  **同构体验**：Pattern 内部逻辑与业务逻辑完全一致，均使用 `LogicDSL`。
2.  **类型安全**：基于 TypeScript 的强类型推导。
3.  **逻辑复用 (Composition)**：Pattern 本质是函数，可以像搭积木一样组合。
4.  **全双工支持**：通过 `definePattern` 提供元数据，支持 Parser 识别和可视化。
