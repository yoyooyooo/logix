---
title: Fractal Runtime and Capability Plugin Injection
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ./01-capability-plugin-blueprint.md
  - ./03-config-as-service-for-capabilities.md
---

# Fractal Runtime and Capability Plugin Injection

> 本文专注从 Runtime 视角梳理「分形运行时」与 CapabilityPlugin 注入的语义，将原“Logix 4.0 分形能力与插件体系”中的运行时部分沉淀为 L 级草案。

## 1. 分形 Runtime 的心智模型

分形 Runtime 的目标是：

- 允许在不同作用域（应用根、页面、子树）安装/覆盖能力插件对应的 Layer；
- 保证能力与配置沿 Runtime 树天然“向下扩散”；
- 对实现而言，仅仅是 Effect Env 的分形，而不是额外的插件拓扑或插件注册表。

心智模型：

- **根 Runtime**：
  - 持有完整 Env：核心能力（Store Runtime 等）+ 所有安装的能力插件 Layers；
  - 对应应用根的 `RuntimeProvider`。
- **子 Runtime**：
  - 以父 Runtime 的 Env 为基底，叠加一层插件 Layers（或其他补充能力）；
  - 对应页面级/局部 `RuntimeProvider`。

## 2. Runtime.make：Layer 作为唯一能力安装点

在根部构造 Runtime 时，以 Layer 合并作为唯一的“能力安装点”：

```ts
const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    Query.layer({ staleTime: 5_000 }),
    Router.layer({ type: 'history' }),
    /* app infra layers */
  ),
})
```

运行时实现可以遵循以下步骤：

1. 业务入口聚合所有能力包暴露的 Layer（通常是 `Plugin.layer` / `Plugin.live` 等工厂产物）；
2. 与核心 Runtime Layer 合并；
3. 用合并后的 Layer 初始化 ManagedRuntime / StoreRuntime。

约束：

- 不维护额外的插件树或注册表；能力包只以 Layer + Helper + Schema 工厂的形式存在；
- Layer 内部可以自由使用 Tag / Service / Driver / Config as Service 模式；
- **同一个能力的 Tag 在同一 Runtime Scope 内只能出现一次**：
  - 入口合成 Layer 前应检测 Tag 冲突；
  - 避免同一能力在同一作用域内出现两套实现，导致 Env 冲突或行为不确定。

## 3. Runtime.fork：局部覆盖与能力分形

当需要在子树覆盖部分能力配置时，通过合成新的 Layer 覆盖：

```ts
const childRuntime = parentRuntime.fork({
  layer: Query.layer({ retries: 5 }),
})
```

语义：

- 业务方可提供任意 Layer 叠加（能力配置 / 平台差异 / 实验开关等）；
- `fork` 在实现层：
  - 克隆或复用父 Runtime 的核心状态（按需要优化）；
  - 在新的 Env 上叠加传入的 Layer；
  - 对同一能力 Tag，子 Runtime 的实现覆盖父 Runtime（每个 Scope 内仍必须保持 Tag 唯一）。

这样，能力与配置天然形成一棵分形树：

- 根节点提供默认能力；
- 子节点按需覆盖；
- 下游 Logic 代码始终通过 `$` 访问能力，无需感知所在层级。

## 4. 独立包与 Layer 注入

在 v3 架构下，能力包（如 `@logix/query`、`@logix/router`）作为**独立 npm 包**存在，不再通过模块扩展挂载到 `$` 上。

### 4.1 使用方式

```ts
// 业务 Logic 中：显式导入 Helper，传入 $ 作为首个参数
import { Query } from '@logix/query'

Effect.gen(function* () {
  yield* Query.query($, {
    target: 'profile',
    key: (s) => ['user', s.id],
  })
})
```

### 4.2 注入方式

仅在应用入口导入 Layer，通过 `Layer.mergeAll(...)` 组合：

```ts
// main.ts
const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(Query.layer({ staleTime: 5_000 }), Router.layer({ type: 'history' })),
})
```

### 4.3 收益

- **无 God Object**：`$` 保持精简，不因能力包数量膨胀；
- **Tree Shaking**：未使用的 Helper 可被静态移除；
- **类型安全**：Helper 的泛型自动从 `$` 推导 State/Action 类型，无需手动标注。

## 5. 微前端 / 局部试验 / 测试场景

分形 Runtime + CapabilityPlugin 提供了统一的能力注入模型，可以自然支持：

- **微前端边界**：
  - 每个子应用可以有自己的根 Runtime 与插件列表；
  - 通过约定好的插件 id 与 config Schema 维持能力一致性。

- **局部试验 / A/B**：
  - 为试验变体构建单独的子 Runtime，在插件配置中开启不同策略；
  - 例如：不同 AI 模型 / 缓存策略 / 路由行为。

- **隔离测试**：
  - 在测试根部注入 Mock 插件（或者替换部分插件实现）；
  - 测试用例只需在 `$` 层感知能力行为，无需关注底层 Tag / Layer。

这些场景的共同点是：**一切能力都通过 Layer 注入 + Helper 调用统一实现，并沿 Runtime 树分形传播**。
