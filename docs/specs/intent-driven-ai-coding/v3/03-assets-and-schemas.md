---
title: 03 · 资产映射与 Schema 定义 (Assets & Schemas)
status: draft
version: 3 (Refined)
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

  // 全局约束 (原 Constraint Intent)
  constraints?: {
    performance?: PerformanceBudget;
    security?: SecurityPolicy;
  };
}

// 通用节点结构：双模态
interface IntentNode<T_Spec, T_Impl> {
  id: string;
  // 需求规格 (PM)
  spec: {
    description: string;
    acceptanceCriteria?: string[];
    attachments?: string[];
    status: 'Draft' | 'Review' | 'Approved';
  };
  // 技术实现 (Dev)
  impl: {
    patternId?: string; // 选用的模式
    config?: T_Impl;    // 具体配置
    status: 'Pending' | 'Implementing' | 'Done';
  };
}
```

## 2. UI Intent Schema

UI 意图描述界面结构。它是一棵组件树。

```typescript
// T_Impl for UI
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

Logic 意图描述业务流程。它的 Impl 就是 Flow DSL。

```typescript
// T_Impl for Logic
interface LogicImplConfig {
  trigger: {
    type: 'onSignal';
    signalId: string;
  };
  
  // 流程编排 (Flow DSL)
  flow: {
    nodes: Record<string, FlowNode>;
    edges: FlowEdge[];
  };
}

type FlowNode = 
  | { type: 'service-call'; service: string; method: string; args: any }
  | { type: 'branch'; condition: string }
  | { type: 'emit-signal'; signalId: string; payload: any }
  | { type: 'update-state'; path: string; value: any };
```

## 4. Domain Intent Schema

Domain 意图描述数据模型。它的 Impl 是 Schema 定义。

```typescript
// T_Impl for Domain
interface DomainImplConfig {
  name: string;
  fields: Record<string, FieldSchema>;
  relations: RelationSchema[];
  
  // 数据源配置
  source?: {
    type: 'api' | 'store' | 'local';
    config: any;
  };
}
```

## 5. PatternSpec v3 (The Mold)

Pattern 是对一类 Intent 实现的封装。它吞噬了原有的 Template 和 Code Structure 概念。

```typescript
interface PatternSpecV3 {
  id: string;
  name: string;
  type: 'UI' | 'Logic' | 'Domain'; // 作用域
  
  // 1. 接口定义 (Props Schema)
  propsSchema: JSONSchema;
  
  // 2. 实现模板 (原 Template)
  // 定义了该 Pattern 实例化时，如何生成代码文件
  implementation: {
    files: Array<{
      pathTemplate: string; // e.g. "src/components/{{name}}.tsx"
      contentTemplate: string;
    }>;
    dependencies?: string[];
  };
  
  // 3. 默认行为
  defaultConfig?: any;
}
```

### Pattern 如何处理“工程结构”？

用户不再定义“我要创建 `order-list.tsx`”。
用户选择 `TablePattern`，该 Pattern 的 `implementation` 字段定义了：“使用我时，请在 `components/` 目录下创建一个 `.tsx` 文件，并在 `stores/` 下创建一个 slice。”

平台根据 Pattern 的定义自动生成 Plan，用户无需操心文件路径。

## 6. 资产关系图

```mermaid
graph TD
    Intent[Intent (SSoT)] -->|包含| UI[UI Intent]
    Intent -->|包含| Logic[Logic Intent]
    Intent -->|包含| Domain[Domain Intent]

    UI -->|引用| UIPattern[UI Pattern]
    Logic -->|引用| LogicPattern[Logic Pattern]
    Domain -->|引用| DomainPattern[Domain Pattern]

    UIPattern -->|生成| Code[Code Files]
    LogicPattern -->|生成| Code
    DomainPattern -->|生成| Code

    PM((PM)) -->|编辑 Spec| Intent
    Dev((Dev)) -->|编辑 Impl| Intent
    LLM((LLM)) -->|辅助转化| Intent
```
