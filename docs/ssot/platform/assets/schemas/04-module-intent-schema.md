# 4. Module Intent Schema

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
   * - "module"：生成 ModuleDef + program module（wrap module）；需要蓝图时取 `.impl`（ModuleImpl），例如 `XxxDef.implement({ initial, logics }).impl`；
   * - "pattern"：基于 Pattern 直接生成 ModuleImpl（例如 场景 Pattern -> ImplWithService）；
   * - "custom"：由业务自定义落点，仅在 Schema 层记录结构。
   *
   * 在 runtime 中，ModuleImplConfig 会被落实为：
   * - 一个 Module 蓝图（ModuleTag）；
   * - 至少一个 ModuleImpl（配置好的 initial/logics/Env 组合）；
   * - 可选的 withLayer 组合（例如 Impl.withLayer(ServiceLayer)）。
   */
  source?: {
    type: 'module' | 'pattern' | 'custom';
    config?: any;
  };
}
```
