# 0. 快速总览（Trinity + `$`）

> 收敛说明：
> 当前实现名：
> `ModuleDef -> ModuleDef.implement(...) -> Module / module.impl`
>
> 未来公开口径：
> `Module -> Program.make(...) -> Program`
>
> 也就是，未来公开 `Module` 承接当前 `ModuleDef` 的定义期角色，未来公开 `Program` 承接当前装配期对象。
> 未来公开装配入口固定为 `Program.make(Module, config)`，不新增 `Module.program(config)` 一类 sugar。

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
  - 基于 ModuleDef + 初始状态 + Logic 集合生成当前实现里的装配期对象；
  - 未来公开口径里，这一层会收敛成 `Program.make(...)` 返回的 `Program`；
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
> - 当前实现 `ModuleDef`：`Logix.Module.make(...)` 返回（不含 `.impl`）；
> - 当前实现 `Module`：`ModuleDef.implement(...)` 或领域工厂返回（含 `.impl`）；
> - 未来公开 `Module`：承接当前 `ModuleDef` 的定义期角色；
> - 未来公开 `Program`：承接当前装配期对象；
> - `ModuleTag`：身份锚点（Context.Tag），即 `module.tag`；
> - `ModuleImpl`：当前实现里的装配蓝图，即 `module.impl`。

---
