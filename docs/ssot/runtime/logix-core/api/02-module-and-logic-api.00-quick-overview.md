# 0. 快速总览（Trinity + `$`）

- `Logix.Module.make(id, def, extend?)`
  - 定义「领域模块」，只负责 **身份 + 形状**；
  - `extend.actions` 仅支持新增（不支持覆盖已有 action schema）；`extend.reducers` 合并且允许覆盖；
  - 返回 `ModuleDef`（定义对象），带 `.tag`（ModuleTag / Context.Tag）；
  - 不能被 `yield*` 当作 Effect/Tag 直接使用；需要 Env/DI 时请显式使用 `module.tag`。
- `ModuleDef.logic(($) => Effect.gen(...))`
  - 在该 Module 上编写一段 Logic 程序；
  - 返回值是一个可组合的 Logic 单元（Logic.Of），可以像普通值一样传递与复用。
- `ModuleDef.build({ initial, logics, imports?, processes?, stateTransaction? })`
  - 基于 ModuleDef + 初始状态 + Logic 集合生成 `Module`（program module）；
  - `Module` 暴露 `createInstance()`，可按需生成 **ModuleImpl 蓝图**；
  - 典型使用场景：
    - React 中直接 `useModule(module)` 消费 program module；
    - 应用级 Runtime 中通过 `Logix.Runtime.make(root, { layer, onError })` 把 Root program module（或 `root.createInstance()`）作为入口；
    - 平台/调试场景下将 ModuleImpl 交给内部 AppRuntime 工具函数组装 Runtime（仅面向引擎实现与平台工具，不作为对外 API）。
- `ModuleDef.layer(config)`
  - Layer-first 入口，等价于 `ModuleDef.build(config).createInstance().layer`；
  - 适合 Effect-Native 组合场景（直接参与 `Layer.mergeAll / Layer.provide`）；
  - 与 `build/createInstance` 并列为推荐主路径。
- `ModuleDef.createInstance(config)` / `Module.createInstance()`
  - 前者一步生成 ModuleImpl，后者从已有 Module 生成 ModuleImpl；
  - 推荐与 `build(...)`/`layer(...)` 配合使用，避免并行 legacy 入口漂移。
- legacy 兼容口（不推荐）
  - `ModuleDef.live(...)` / `ModuleDef.implement(...)` / `module.impl` 仅用于迁移窗口（其中 `implement/impl` 属于 legacy 实例化入口）；
  - `module_instantiation::legacy_entry` 仅在命中 legacy 实例化入口时发射（`ModuleDef.implement(...)` 或读取 `module.impl`，含 `source` / `hint`），不覆盖 `ModuleDef.live(...)`。
- `$`（Bound API）
  - 业务开发几乎只需要记住的唯一入口；
  - 提供 `$.state / $.actions / $.flow / $.on* / $.use / $.lifecycle` 等能力；
  - 同时是 IntentRule Parser 的静态锚点。

> 命名速查（022-module）：
>
> - `ModuleDef`：`Logix.Module.make(...)` 返回（定义对象）；
> - `Module`：`ModuleDef.build(...)` 返回（program module）；
> - `ModuleTag`：身份锚点（Context.Tag），即 `module.tag`；
> - `ModuleImpl`：装配蓝图，由 `Module.createInstance()`（或 `ModuleDef.createInstance(config)`）生成。  
>   入口语义：Logic 中 `yield* $.use(module)` 等价 `yield* $.use(module.tag)`；Runtime 中 `Logix.Runtime.make(module)` 与 `Logix.Runtime.make(module.createInstance())` 语义等价。

---
