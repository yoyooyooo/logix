---
title: Logic.forShape Env-First 路线草稿
status: superseded
version: 0.1.0
superseded_by: ../L5/dsl-evolution-roadmap.md
priority: 500
---

# Logic.forShape · Env-First 形态路线草稿

> 层级：L9（生草稿，尚未与现有规范充分对齐）
> 关联规范：
> - `docs/specs/runtime-logix/core/01-architecture.md`
> - `docs/specs/runtime-logix/core/02-module-and-logic-api.md`
> - `docs/specs/runtime-logix/core/03-logic-and-flow.md`

## 1. 背景与动机

当前 v3 PoC 中，Bound API `$` 的**唯一正式入口**是：

- `Logix.Module('Id', { state, actions })` 定义模块；
- `Module.logic(($)=>Effect.gen(...))` 为模块挂载 Logic，并在回调参数中注入基于 Runtime 的 Bound API `$`；
- Pattern / Namespace 等二次封装场景通过 `( $: Logix.BoundApi<Sh,R> ) => Logic.Of<Sh,R,...>` 形式复用逻辑。

`Logic.forShape` 在文档中被保留为一种“Env-First 形态”的草图：
理想状态下，Logic 可以只依赖 `Logic.Env<Sh,R>` + `Logic.RuntimeTag`，不直接感知具体 Module 实例或 Runtime 构造路径。

本草稿只讨论 **是否以及如何在未来引入真正的 Env-First `Logic.forShape`**，不会影响当前 PoC 的正式用法。

## 2. 当前共识（v3 PoC 阶段）

从代码与规范调整后得到的临时共识：

- 对于**业务代码**：
  - 记住一个入口即可：`SomeModule.logic(($)=>Effect.gen(...))`；
  - `$` 的语义由 `BoundApi` 定义，包含 `state / actions / flow / match / use / lifecycle / onState / onAction / on` 等子域；
  - 文档中的 `Logic.forShape` 记号仅作为“针对某个 Shape/Env 的 `$` 缩写”，不对应实际实现。

- 对于 **Pattern / 库作者**：
  - 推荐使用 `( $: Logix.BoundApi<Sh,R> ) => Logic.Of<Sh,R,...>` 作为 Pattern 形态；
  - 调用方通过 `Module.logic(($)=>pattern($))` 负责绑定 Module 与 Env；
  - Pattern 不直接依赖 `Logic.RuntimeTag` / `ModuleRuntime`，保持 `(input)=>Effect` 心智。

- 对于 **平台 / 图谱 / LLM**：
  - 以 `Module.logic(($)=>...)` 作为“Logic 与 Module 绑定”的静态锚点，利于构建 Logic Graph 与 Intent → Code 映射；
  - 示例中出现的 `Logic.forShape` 只作为概念性语法糖，不增加新的图谱节点类型。

## 3. Env-First `Logic.forShape` 的潜在形态（设想）

若未来需要真正实现 `Logic.forShape`，一个可能的方向（尚未定稿）：

1. **Env 语义收紧**
   - 约定 `Logic.Env<Sh,R> = Logix.ModuleTag<Sh> | Logic.Platform | R`；
   - 在 `Module.live(initial, ...logics)` 内部，通过 `Effect.provideService(Logic.RuntimeTag, runtime)` 或等价方式，将当前模块 Runtime 注入 Env。

2. **BoundApi/Flow Env-First 变体**
   - 在 `BoundApi` / `Flow` 内部，引入“基于 `Logic.RuntimeTag` 取 Runtime”版本：
     - `BoundApi.forShape<Sh,R>()` / `Flow.forShape<Sh,R>()`（命名未定，仅作为草图）；
     - 实现上从 `Logic.Env<Sh,R>` 中解析当前 `ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>`。

3. **Logic.forShape 作为工厂**
   - 在 `Logic` 命名空间中提供：
     - `Logic.forShape<Sh,R>(): BoundApi<Sh,R>`；
   - 要求调用点运行在 `Logic.Env<Sh,R>` 上，否则在运行时 fail/die；
   - 文档中现有示例 `const $ = Logic.forShape<Shape, Env>()` 可以从“概念缩写”升级为可运行写法。

4. **与 Module.logic 的关系**
   - 业务层继续推荐使用 `Module.logic(($)=>...)` 作为入口；
   - `Logic.forShape` 更多服务于：
     - Pattern / Namespace 内部提前“绑形状，不绑具体 Module”；
     - 极端拆分场景下，在多个文件中共享相同 `Shape` 的 `$` 约束。

## 4. 与现有 API 的边界关系

需要明确的边界（开放问题）：

- Env-First 与 Runtime-First 两条路径是否需要在实现上合并为一套？
  - 一种可能：`Module.logic(($)=>...)` 内部本身就运行在 `Logic.Env<Sh,R>` 上，`$` 的实现既可以闭包 Runtime，也可以在需要时 fallback 到 `Logic.RuntimeTag`。
- Pattern 是否仍然首选 `( $: BoundApi<Sh,R> ) => Logic.Of<Sh,R,...>` 形态？
  - 倾向保持不变：Pattern 持续依赖 `$`，而不是直接依赖 `Logic.forShape`。

这些问题需要在未来的 L6/L5 草稿中结合更多使用场景（Form、列表、跨 Module 协作）具体推演。

## 5. 待决问题 / 下一步梳理方向

- [ ] 是否存在“**只有 Env-First forShape 才能优雅解决**”的真实场景？需要从现有 PoC（Form / Matrix / Flow Orchestration 等）中反向挖掘。
- [ ] 若实现 Env-First forShape，是否需要对 `Flow.Api` / `BoundApi` 做统一抽象，避免双轨实现？
- [ ] 与平台静态分析、Intent IR 的关系：forShape 是否会干扰“以 Module 为锚点构图”的模型？
- [ ] 命名与学习成本：是否有比 `forShape` 更直观的名字（例如 `Logic.env<Sh,R>()` 或 `Logic.$<Sh,R>()`）？

本草稿当前只负责“把问题挂起来”，不做结论。后续若形成更清晰的路线，应在 L6/L5 层级产出更完整的设计稿，并同步调整：

- `runtime-logix/core/01-architecture.md`
- `runtime-logix/core/02-module-and-logic-api.md`
- `runtime-logix/core/03-logic-and-flow.md`
