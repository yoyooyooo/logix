---
title: Schema-Capability Dual Pattern (v3)
status: definitive.v3
version: 3.0.0
layer: Architecture Pattern
related:
  - 01-capability-plugin-blueprint.md
---

# Schema-Capability Dual Pattern (SCD v3)

> **"Schema as Metadata, Logic as Reality"**
>
> SCD 模式定义了 Logix 中“配置面 (Schema)”与“能力面 (Capability)”的二象性统一。在 v3 架构中，这种统一通过 **元数据协议 (Metadata Protocol)** 与 **Module.live 编译过程** 实现。

## 1. 模式定义

SCD 模式包含三个要素：

1.  **Dual Declaration (二象声明)**:
    在 Schema 中声明字段的同时，通过 Annotation 附着能力配置。
    _(e.g., `Query.field` declares both `Type: Data` and `Capability: Fetch`)_

2.  **Metadata Bridge (元数据桥)**:
    使用标准 `CapabilityMeta` 协议，将能力配置携带在 Schema AST 上。

3.  **Lazy Compilation (惰性编译)**:
    在 `Module.live` 运行时，Runtime 扫描元数据并调用对应的 Helper Factory，生成真实的 Logic。

## 2. 实现规范

### 2.1 The Declaration (Layer 1)

用户侧 API。看起来像是一个普通字段定义，实则携带了私货。

```typescript
// @logix/query
export const field = <T>(config: QueryConfig) =>
  Schema.annotations({
    // Standard V3 Protocol
    [CapabilityMeta]: {
      kind: 'Query',
      priority: 10,
      // The bridge to Logic
      factory: ($, key) => Query.query($, { ...config, target: key }),
    },
  })(Schema.from(config.schema))
```

### 2.2 The Compilation (Runtime Core)

核心层 (`Module.live`) 的职责被简化为“执行者”。

```typescript
// @logix/core internal/module_runtime.ts
const compileSchemaCapabilities = (schema, $) => {
  // 1. Scan structural metadata
  const metaMap = getCapabilityMeta(schema)

  // 2. Execute factories
  return Effect.forEach(metaMap, ([key, meta]) =>
    // This effectively calls: Query.query($, { target: key, ... })
    meta.factory($, key),
  )
}
```

### 2.3 The Capability (Layer 2)

最终落地的逻辑。这正是 `01-capability-plugin-blueprint.md` 定义的 Helper。

```typescript
// Standard Helper
Query.query = ($, config) =>
  Effect.gen(function* () {
    const client = yield* $.use(QueryClientTag)
    // ... actual orchestration ...
  })
```

### 2.4 冲突与错误处理 (Runtime Core)

- 同一字段存在多条 `CapabilityMeta` 时，按 `priority` 降序执行；重复 `kind` 视为配置冲突，应在编译期报错。  
- `factory` 抛错应视为配置错误（编译期 fail-fast）；运行时缺失依赖的能力应输出具名错误而非静默跳过。

## 3. 架构收益

- **Zero Magic**: 没有隐式的 `$.extension` 注入，只有显式的 Logic 生成。
- **Tree Shaking**: 如果用户只用了 React Query 的 Layer 2 (`Query.query`) 而不用 Layer 1 (`Query.field`)，整个 Schema 扫描逻辑都是死代码（如果实现得当）。
- **Extensibility**: 第三方插件只需遵循 `CapabilityMeta` 协议，即可让自己的能力“寄生”在 Schema 上，获得与官方功能一致的 DX。

### 3.1 静态 / 工程化编译路径（补充）

SCD 模式本身只规定了 **Schema ↔ Capability** 的双向契约，并不强制“编译”一定发生在 Runtime。对于不同能力，可以选择：

- **Runtime Compilation**：`Module.live` 扫描 Schema AST / `CapabilityMeta`，在启动时按需展开 Logic（Query / Reactive / Link 等推荐走这条路径）；  
- **Build-Time Compilation**：本地工具（CLI / Vite 插件）在构建期读取 Schema Metadata，生成：
  - Module 级实现（例如自动推导 `actions` / `reducers` 并调用 `Module.make`）；
  - 类型声明文件（`.d.ts`），保证 IDE / LSP 下的完整类型安全。

例如 `L9/logix-state-first-module-codegen.md` 中的 State-First Module Codegen 草案，就是在 SCD 范式下，将“Reducer 能力”的编译提前到构建期的一种实现。无论采用哪种路径，**Blueprint 仍然只存在于 Schema/Metadata，执行逻辑始终由 Helper / 生成物承载**。

## 4. 与 UI/AI 的关系

- **Studio**: 读取 `CapabilityMeta`，将其渲染为 State 字段旁边的 "功能徽标 (Function Badge)"。
- **AI**: 理解 `CapabilityMeta` 对 State 行为的暗示（例如：这个字段会自动刷新），从而生成更准确的后续逻辑。
