# 2. AppRuntime.makeApp：应用级组装

如果说 `ModuleRuntime.make` 是单个器官的制造者，那么 Runtime（内部基于 `AppRuntime.makeApp` 实现，并通过 `Logix.Runtime.make` 暴露）就是组装整个人体的医生。

## 2.1 职责（逻辑模型）

- **Flattening**：将所有模块的依赖（Imports）和自身（Providers）拍平到同一层 Layer。
- **Scope Root**：创建应用的根 Scope，管理所有全局 Service 和 Global Store 的生命周期。
- **Entry Point**：提供 `run` 方法，作为 React `RuntimeProvider` 的输入。

在当前主线 Effect-Native 实现中，AppRuntime 还有一个 **硬约束职责**：

- **TagIndex / Tag 冲突检测**：
  - 在合并所有模块 Layer 之前，AppRuntime 会构建一份 `TagIndex`，收集：
    - 每个模块自身的 Runtime Tag（`ModuleTag` 作为 Tag）；
    - 通过 `AppRuntime.provideWithTags` 显式声明的 Service Tag 列表。
  - 一旦发现同一个 Tag Key 被多个不同模块声明，AppRuntime 必须抛出带 `_tag: "TagCollisionError"` 与 `collisions` payload 的错误，禁止依赖 `Layer.mergeAll` 顺序进行静默覆盖；
  - 该行为是 Hard Constraint，后续 DevTools / Universe View 会在此基础上扩展 Env 拓扑与 TagIndex 可视化能力（见 `impl/01-app-runtime-and-modules.md` 与 TagIndex 草案）。

## 2.2 实现草图

```ts
function makeRuntimeFromDefinition(def: AppDefinition) {
  // 1. 拍平依赖
  const layer = flattenLayers(def.imports, def.providers)

  // 2. 构造 Runtime
  const runtime = ManagedRuntime.make(layer)

  return runtime
}
```

> **注意**：`makeApp` 并不直接调用 `ModuleRuntime.make`，而是通过组合 `Module.live` 返回的 Layer 来间接触发它。

---
