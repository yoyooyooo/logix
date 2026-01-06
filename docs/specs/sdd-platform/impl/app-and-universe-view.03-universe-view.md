# 3. 从 ModuleIR 构建 Universe View

Universe View 关注的是“模块间拓扑”与“模块内部的 Store/Link 结构”。

## 3.1 节点类型

推荐的节点类型：

- **App/Feature Node**：根 Runtime 节点（由 Root ModuleImpl + `Logix.Runtime.make` 定义）；
- **Module Node**：通过 `Logix.Module.make(...)` 定义的模块（ModuleDef）；
- **Store Node**：`providers` 中 valueSymbol 对应的 Store（通常是 `Logix.ModuleRuntime` 或 `ModuleRuntime.make()` 结果）；
- **Link Node**：`links` 中的业务编排逻辑（胶水节点）；
- **Process Node**：`processes` 中的基础设施进程（通常默认隐藏，仅在详细模式显示）。

## 3.2 边类型

基础边：

- **Module Import Edge**：
  - 从 A 模块指向其 `imports` 中的每个模块；
  - 表示“组合/包含关系”，与 Runtime 中的 Layer.mergeAll 对应。

- **Module → Store Edge**：
  - 从 Module/App Node 指向其 `providers` 中的 Store Node；
  - 表示“该 Store 由此模块提供”。

- **Module → Link Edge**：
  - 从 Module Node 指向其 `links` 中的 Link Node；
  - 表示“该 Link 属于此模块的业务编排”。

扩展边（依赖于进一步解析）：

- **Link → Store/Service Edge**：
  - 通过对 `links` 所指 Effect 代码做二次解析，识别其中 `yield* StoreTag` / `yield* ServiceTag` 等模式；
  - **这是 Universe View 的核心价值**：展示 Link 如何连接多个 Module（例如 Link A 同时指向 Store B 和 Store C）。

## 3.3 Drill‑down 规则

- 第一层仅显示 App/Feature Node + 顶层 Module Node：
  - 节点标签使用 `ModuleDef.id`；
  - 提供“展开”操作。
- 展开某 Module 节点时：
  - 展示该 Module 内部的 Store Node / Link Node；
  - **Link Node 会显示其连接的跨域连线**（即使连接的目标 Store 在其他 Module 中）；
  - 可继续展开子 Module（imports）形成多级树。

这样形成的视图既能从宏观上看到“模块/领域之间的关系”，又能通过 Link Node 清晰地看到“业务是如何跨域流转的”。
