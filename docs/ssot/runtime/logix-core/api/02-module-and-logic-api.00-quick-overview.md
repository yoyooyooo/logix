# 0. 快速总览（Trinity + `$`）

- `Logix.Module.make(id, def, extend?)`
  - 定义「领域模块」，只负责 **身份 + 形状**；
  - `extend.actions` 仅支持新增（不支持覆盖已有 action schema）；`extend.reducers` 合并且允许覆盖；
  - 返回 `ModuleDef`（定义对象），带 `.tag`（ModuleTag / Context.Tag）；
  - 不能被 `yield*` 当作 Effect/Tag 直接使用；需要 Env/DI 时请显式使用 `module.tag`。
- `ModuleDef.logic(($) => Effect.gen(...))`
  - 在该 Module 上编写一段 Logic 程序；
  - 返回值是一个可组合的 Logic 单元（Logic.Of），可以像普通值一样传递与复用。
- `ModuleDef.live(initialState, ...logics)`
  - 将 Module 定义 + 初始 State + 一组 Logic 程序组合成一个 Live Layer；
  - 每次调用都会生成一个新的 Layer，可在不同 Runtime/Scope 下多次注入；
  - 适合“一次性拼装 + 立即注入”的场景（如 CLI 脚本、单模块演练）。
- `ModuleDef.implement({ initial, logics, imports?, processes? })`
  - 基于 ModuleDef + 初始状态 + Logic 集合生成 `Module`（wrap module）；
  - `module.impl` 是可复用的 **ModuleImpl 蓝图**：
    - 暴露 `impl.layer`（`Layer<ModuleRuntime, never, any>`）、`impl.module` 以及可选的 `impl.processes`；
    - 支持通过 `impl.withLayer(...)` / `impl.withLayers(...)` 注入额外 Env（Service / 平台能力等）；
  - 典型使用场景：
    - React 中通过 `useModule(module)` 直接消费配置好的模块实现（默认走 `module.impl` 局部实例）；
    - 应用级 Runtime 中通过 `Logix.Runtime.make(root, { layer, onError })` 把某个 Root program module（或其 `.impl`）作为入口；
    - 平台/调试场景下可将这些 ModuleImpl 交给内部 AppRuntime 工具函数组装成可视化/调试用 Runtime（仅面向引擎实现与平台工具，不作为对外 API）。
- `$`（Bound API）
  - 业务开发几乎只需要记住的唯一入口；
  - 提供 `$.state / $.actions / $.flow / $.on* / $.use / $.lifecycle` 等能力；
  - 同时是 IntentRule Parser 的静态锚点。

> 命名速查（022-module）：
>
> - `ModuleDef`：`Logix.Module.make(...)` 返回（不含 `.impl`）；
> - `Module`：`ModuleDef.implement(...)` 或领域工厂返回（含 `.impl`）；
> - `ModuleTag`：身份锚点（Context.Tag），即 `module.tag`；
> - `ModuleImpl`：装配蓝图，即 `module.impl`。  
>   入口语义：Logic 中 `yield* $.use(module)` 等价 `yield* $.use(module.tag)`；Runtime 中 `Logix.Runtime.make(module)` 等价 `Logix.Runtime.make(module.impl)`。

---
