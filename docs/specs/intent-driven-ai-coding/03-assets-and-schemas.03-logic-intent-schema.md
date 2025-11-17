# 3. Logic Intent Schema (Intent Graph)

Logic 意图描述业务流程。在当前主线中，Logic 的“可执行实现载体”落在代码里；平台侧的 Logic/IntentRule/Graph 视图是从代码中可解析子集抽取出的结构化投影（Memory AST），用于可视化与对齐。

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
  // “Control” 概念层骨架节点：围绕 Effect 的结构化控制流（实现无独立 Control 模块）
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
