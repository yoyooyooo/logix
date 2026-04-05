# 1. IntentSpec（SSoT）

Intent 不再是扁平的配置，而是分层的树状结构，每个节点包含 `spec` (需求) 和 `impl` (实现)。

```typescript
interface IntentSpec {
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
