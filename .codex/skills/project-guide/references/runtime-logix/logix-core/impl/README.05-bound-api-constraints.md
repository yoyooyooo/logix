# Universal Bound API / Module 的实现硬约束（定稿）

以下内容是对 `../api/02-module-and-logic-api.md` 与 `../api/03-logic-and-flow.md` 中最终架构的 **实现侧补充**，一旦开始写运行时代码，应视为硬性约束：

1. **Module 形态与品牌化**
   - `Logix.Module.make(...)` 返回 `ModuleDef`（定义对象，不是 Tag）：带 `.tag`（ModuleTag）、`.logic(...)`、`.implement(...)`（产出 `Module` wrap）。
   - `ModuleTag`（Context.Tag）才是运行时“身份锚点”：用于 Env/Layer 提供、实例解析与 `Root.resolve(...)`。
   - `Module`（wrap）是业务侧推荐消费形态：带 `.tag + .impl`，并支持 `withLogic/withLayers` 做不可变组合。
   - 品牌约束：
     - ModuleLike：`_kind: "ModuleDef" | "Module"` + `tag` 字段（用于 `$.use(module)` 拆壳）；
     - ModuleTag：`_kind: "ModuleTag"`（Context.Tag，解析出 ModuleRuntime）。
   - `$.use` **只允许**：
     - ModuleLike（ModuleDef / Module wrap）或 ModuleTag（返回 ModuleHandle）；
     - 普通 Service Tag（返回 Service）；
     - 禁止接受手写 `Context.GenericTag` 伪装成“Module”。

2. **ModuleHandle 与 Runtime 的解耦**
   - 对外暴露的 ModuleHandle 类型必须是 Runtime 的「只读投影」，能力固定为：
     - `read(selector?)`：从当前 State 拿到一个快照值（非 Stream）；
     - `changes(selector)`：返回对应 selector 的 `Stream`；
     - `dispatch(action)`：向该 Store 派发 Action。
   - ModuleHandle **不得** 直接暴露 `mutate` / `update` 或任何可以跨 Module 写入 State 的方法；
   - 内部实现可以通过封装底层运行时容器，但类型上要确保未来新增 Runtime 能力不会自动“渗透”到 Handle 接口。

3. **`$.use` 的运行时语义**
   - `$.use(module)` / `$.use(module.tag)`：
     - 在类型上返回 `ModuleHandle<Shape>`（即某个 ModuleRuntime 的只读视图，可含 handle-extend 扩展）；
     - 在运行时，严格从“当前 Effect Env / 当前模块实例 scope”解析 ModuleRuntime（imports-scope 最近 wins；缺失视为装配错误并稳定失败）。
   - `$.use(ServiceTag)`：
     - 只是 `Effect.service(tag)` 的语法糖；
     - 建议在实现上仍通过 Tag 机制获取依赖，以避免出现“旁路注入”。
   - `Root.resolve(Tag)`：
     - 显式从 root provider 解析（固定 root；忽略更近 override），用于“全局单例”语义（ServiceTag / ModuleTag）。

4. **Fluent DSL（`$.onState` / `$.onAction` / `$.on`）与 Flow 的翻译关系**
   - 所有 Fluent API 必须在运行时被机械地翻译为已有 `Flow.Api` 组合，而不是引入第二套执行语义：
     - `$.onState(selector)` → `$.flow.fromState(selector)`；
     - `$.onAction(predicate)` → `$.flow.fromAction(predicate)`；
     - `$.on(stream)` → 原样使用传入的 Stream；
     - `update/mutate/run*(effect)` → 等价于 `source.pipe(...ops, $.flow.run* (effect))`。
   - 并发策略映射表应在实现中固定下来，例如：
     - `mode: "parallel"` → `runParallel`；
     - `"latest"` → `runLatest`；
     - `"exhaust"` → `runExhaust`；
     - `"sequence"` → `run`（队列语义与默认 `run` 一致）。
   - 任何新增 Fluent API（例如 `whenEffect` 或 `whenInterval`）都必须以同样的方式可逆映射到 Flow/Effect 原语。

5. **白盒/黑盒边界在 runtime 层的配合**
   - 即便 Parser 只对白盒 Fluent 链给出结构化语义，runtime 实现也应保证：
     - Fluent 与非 Fluent 路径在错误语义与资源管理上完全一致（同样的 Scope / 同样的取消行为）；
     - Raw Mode（直接使用 `Flow.*` 或 `Stream.pipe`）不会绕开并发控制 / Lifecycle 约束。
   - 建议在实现中为 Fluent 路径留出 Hook（例如记录链路元信息），便于后续在调试/追踪视图中展示更友好的信息。

6. **多实例 Module 与 Runtime 的关系（留白但需记录）**
   - 目前文档默认“一类 Module 定义对应一类领域模块的 Runtime 实例”，但实际实现可能需要支持多实例（例如多 Tab Cart）；
   - 建议在实现设计中预留：
     - Module 作为「类型与 Factory」；
     - 实际实例标识（如 key / scopeId）由上层 Runtime 或 React Adapter 管理。
   - 一旦确定多实例方案，应在本目录单独补一份 `module-and-multi-instance.md`，并同步更新 `../api/02-module-and-logic-api.md`。

以上条目如果在实现中出现偏差（例如 `$.use` 支持第三类 Tag、ModuleHandle 新增写接口），**必须优先回到本文件与 core 规范中进行讨论与修订**，再进入代码变更。这样可以保证实际运行时代码始终围绕「Context is World + Universal $」的初衷演进。

---
