---
title: 03 · 资产映射与 Schema 定义 (Assets & Schemas)
status: draft
version: 11 (Metadata-Enhanced)
---

> 本文档定义了“三位一体”模型下的核心资产结构。Intent 是唯一的真理来源，Pattern 是复用的模具，Flow 和 Schema 是 Intent 的高保真投影。

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

## 3. Logic Intent Schema (Flow DSL)

Logic 意图描述业务流程。它的 Impl 是 Flow DSL，直接映射到 Logix Engine / Effect 运行时。

```typescript
interface LogicImplConfig {
  // 触发器
  trigger: {
    type: 'onSignal';
    signalId: string;
    payloadSchema?: JSONSchema;
  };
  
  // 流程编排 (DAG)
  flow: {
    nodes: Record<string, FlowNode>;
    edges: FlowEdge[];
  };

  // 运行时约束 (Effect Context)
  constraints?: {
    concurrency?: 'switch' | 'queue' | 'exhaust'; // Effect.switchMap 等
    timeout?: number;
    retry?: { count: number; delay: string }; // Effect.retry
    transaction?: boolean; // Logix Transaction
  };

  // 自动化测试用例 (Self-Verification)
  testCases?: Array<{
    name: string;
    input: any;
    mock?: Record<string, any>; // Mock Service Returns
    expect?: {
      state?: Record<string, any>;
      signals?: string[];
      error?: string;
    };
  }>;
}

type FlowNode = 
  | { type: 'service-call'; service: string; method: string; args: any }
  | { type: 'update-state'; path: string; value: any }
  | { type: 'emit-signal'; signalId: string; payload: any }
  | { type: 'branch'; condition: string }
  // 逃逸节点：用于承载无法解析的代码块
  | { type: 'raw-code'; content: string; originalHash?: string };

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

为了支持 **Dynamic Pattern** 的编写，Logix 体系提供了一套强类型的 Builder SDK。它是 Pattern 生成逻辑的“笔”。

详细设计请参考：**[Logix Builder SDK Design](../../runtime-kernel/builder/01-builder-design.md)**

```typescript
import { Flow, UI, Domain } from '@logix/builder';
import { OrderService } from './domain/order'; // 引用 Domain 定义

// 示例：使用 Builder 构建 Logic Intent
const logic = Flow.define({
  trigger: Flow.onSignal('submit'),
  steps: [
    // 1. 直接调用 Service Proxy (生成 AST)
    OrderService.validate({ entityName }),
    
    // 2. 组合：嵌入其他 Pattern 生成的 Flow
    Flow.embed(otherFlow),
    
    // 3. 结构化控制流
    Flow.if(
      '${result.valid}',
      OrderService.submit(),
      Flow.emit('toast', 'Error')
    )
  ]
});
```

**核心价值**：
1.  **同构体验**：Service 调用语法与 Runtime 完全一致。
2.  **类型安全**：Service 引用是强类型的，防止拼写错误。
3.  **逻辑复用 (Composition)**：支持 `Flow.embed`，像搭积木一样组合 Pattern。
4.  **全双工支持 (Source Map)**：在开发模式下，自动注入 `__source` 元数据（文件/行号/Hash），支持 Graph -> Code 的精准反写。
