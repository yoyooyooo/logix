# Reference: Devtools 与 Debug 在 Trait + EffectOp 下的收敛

> 作用：拆开说明 Devtools / Debug 如何在 StateTraitProgram + EffectOp 总线上工作，并给出旧 Debug 模块的迁移路径。  
> 对应 spec：FR-005、FR-009~FR-013，US3、US6、US7；research 中的 Devtools/Debug 部分。

---

## 1. 数据入口：Graph + EffectOp，而不是私有通道

本特性下，Devtools / Debug 的**唯一事实源**是：

1. 结构侧：`StateTraitProgram`（含 `StateTraitGraph` 与 `StateTraitPlan`）；  
2. 事件侧：`EffectOp` 流（通过统一 Middleware 总线发出）。

Runtime 负责：

- 在构建 ModuleRuntime 时调用 `StateTrait.build`，得到 Program / Graph / Plan；  
- 在运行时通过 `StateTrait.install` 将 Plan 转译为若干 EffectOp 触发点；  
- 通过 EffectOp Middleware 管道执行具体行为，并在某个环节将 EffectOp 流复制给 Devtools / Debug Observer。

Devtools 负责：

- 基于 Program / Graph 构建结构视图；  
- 基于 EffectOp 流构建时间线视图；  
- 基于 Program/Graph 中的源代码元信息（moduleId / 文件路径 / 大致行号）实现“跳回代码”能力。

旧有的“直接在某个模块里 console.log / DebugSink.push”的模式需要收敛到：

- 要么变成 EffectOp Observer 中间件（统一入口）；  
- 要么在 Devtools UI 内消费 EffectOp 与 Program 信息。

---

## 2. 结构视图：基于 StateTraitGraph 的模块图

StateTraitGraph 提供了字段级别的依赖拓扑信息，Devtools 可以据此渲染：

- 节点：
  - State 字段（`a` / `b` / `profile.name` / `profileResource` 等）；  
  - 外部资源节点（逻辑上的 `"user/profile"` 等，可选）。  
- 边：
  - computed 边：`deps → target`，标记为 `kind="computed"`；  
  - link 边：`from → to`，标记为 `kind="link"`；  
  - source 边：`resourceId → targetField`，标记为 `kind="source"`。

结构视图功能建议：

- 点击节点可高亮其所有入边/出边；  
- 支持按 Trait kind 过滤（只看 source/link/computed）；  
- 支持从资源节点出发查看“依赖该资源的所有字段/模块”；  
- 节点上展示源码位置 hint（文件路径 + 行号），便于一键跳回 traits 定义。

这些能力全部建立在 StateTraitGraph / Program 中的静态信息之上，不依赖 Runtime 当前状态。

### 2.1 数据入口与结构视图协议

- `@logixjs/core` 暴露内部调试 API：`Logix.Debug.getModuleTraits(module)`：

  ```ts
  interface ModuleTraitsDebug {
    readonly program?: StateTraitProgram<any>
    readonly graph?: StateTraitGraph
    readonly plan?: StateTraitPlan
  }

  const traits = Logix.Debug.getModuleTraits(SomeModule)
  // traits.graph / traits.plan 仅在该 Module 使用了 traits 槽位时存在
  ```

- Devtools / Studio 只依赖上述协议获取结构信息，而不直接访问 `__stateTraitProgram` 等内部字段；
- 未来扩展 ActionTrait / FlowTrait / ModuleTrait 时，约束：
  - 可以在 Program 的 meta 中增加其他 Trait 家族的入口，但 **不改变** 现有 StateTraitProgram / Graph / Plan 的形状；
  - Devtools 结构视图组件（例如 `StateTraitGraphView`）只消费 StateTraitGraph，不感知具体 runtime 实现细节。

---

## 3. 时间线视图：基于 EffectOp 的事件流

EffectOp 流携带了运行时的所有关键事件（Action/Flow/State/Service/Lifecycle）。Devtools 时间线需要重点呈现：

- State 相关事件：
  - 例如 `kind="state"`、`name="computed:update"` 或 `name="link:propagate"`；  
  - meta 中包含 `moduleId`、`fieldPath`、`deps`、`reason` 等信息。  
- Service 相关事件：
  - 例如 `kind="service"`、`name=resourceId`；  
  - meta 中包含 `resourceId`、`key`、`moduleId`、`fieldPath` 等信息。

时间线视图功能建议：

- 支持按 moduleId / kind / resourceId / fieldPath 过滤和搜索；  
- 支持展开单个事件，查看其 Effect 结果的概要信息（例如成功/失败、耗时）；  
- 支持以“事件顺序”查看某个字段的变化历史（结合 Graph）。

时间线只消费 EffectOp，不需要知道 Trait 的细节；Trait 相关信息通过 meta 中的字段与 Graph 做关联。

### 3.1 DebugObserver 中间件的实现形态（v001）

在当前实现中，EffectOp → DebugSink 的桥接通过 `@logixjs/core/Middleware` 命名空间下的 DebugObserver 完成，并视为接入 Debug/Devtools 的**唯一**运行时事件入口：

- 入口文件：`packages/logix-core/src/Middleware.ts`
- 公共 API：

  ```ts
  import * as Middleware from "@logixjs/core/Middleware"

  // DebugObserver：将 EffectOp 流统一收口为 trace:* Debug 事件
  const observer = Middleware.makeDebugObserver({
    filter: (op) => op.kind !== "lifecycle", // 可选：按需过滤
  })

  const stack: Middleware.MiddlewareStack = [
    observer,
    // ...其他中间件（Query / 超时 / 重试等）
  ]
  ```

- 行为（v001）：
  - 对每一条通过总线的 EffectOp 发送一条 Debug 事件：

    ```ts
    Debug.record({
      type: "trace:effectop",
      moduleId: op.meta?.moduleId,
      data: op,
    })
    ```

  - DebugSink 仍通过 `currentDebugSinks` FiberRef 收集事件；Devtools 可以直接消费 `trace:effectop` 事件重建 EffectOp 时间线。

说明：

- 所有新的 Debug / Devtools 能力都应通过 DebugObserver（或其家族中间件）消费 EffectOp，而不是新增其他运行时事件入口；  
- Runtime 内部不再推荐直接发结构化 Debug 事件（例如 module:init/state:update 等），而是由 EffectOp + DebugObserver 统一推导出 Debug 视图所需的数据。

---

## 4. Graph ↔ Timeline 联动与“跳回代码”

为了实现 FR-013 中提到的“玻璃盒调试”体验，需要让 Graph 与 Timeline 相互联动，并支持跳回 traits 源码。

必要的元信息：

- Program / Graph 中：
  - moduleId（通常是 `Logix.Module.make` 的 id）；  
  - fieldPath（`"profile.name"` 等）；  
  - resourceId（对于 source 节点）；  
  - sourceLocation（文件路径 + 近似行号/列号）。  
- EffectOp.meta 中：
  - moduleId；  
  - fieldPath 或 deps；  
  - resourceId + key（对于 service 事件）；  
  - opId（唯一事件 ID，可用于 trace）。

联动行为示例：

- 在 Graph 里点击某一字段节点：
  - 时间线自动过滤出与该字段相关的 EffectOp；  
  - 可选：高亮最近一次更新该字段的 computed/link/source 事件。  
- 在时间线点击某个事件：
  - Graph 高亮对应字段/资源节点；  
  - Devtools 提供“打开代码”按钮：跳转到 traits 定义的位置。

这样，开发者可以在“图纸视角”和“事件视角”之间自如切换。

---

## 5. 旧 Debug 模块的归档说明（Legacy）

本特性之后，Debug 与 Devtools 的**唯一事实源**已经收敛为：

- 行为侧：EffectOp 流（由 Runtime 在 Action / Flow / State / Service / Lifecycle 等边界发出，并统一交由 Middleware/Observer 处理）；  
- 结构侧：StateTraitProgram / StateTraitGraph（由 StateTrait.build 提供）。

因此，历史上的 Debug 模块（如早期版本中的 DebugSink 直连 Runtime / Store 的各种 hook）在本规范中统一视为 **Legacy 实现**：

- 不再作为新增能力的接入点；  
- 不再鼓励在 Runtime 内部新增任何绕过 EffectOp 总线的调试通道；  
- 仅在必要时作为一次性迁移/清理的参考。

迁移/清理指导（一次性动作，而非常态模式）：

1. **入口统一**：对仍在使用的旧 Debug 接口，应通过适配层改写为 EffectOp Observer 的内部实现；完成迁移后，应避免在代码中继续直接使用旧的 Debug API。  
2. **结构收敛**：对依赖 ModuleRuntime / Store 内部结构做状态快照或拓扑分析的旧实现，应改为消费 StateTraitProgram / StateTraitGraph，并以此作为唯一结构事实源。  
3. **能力清理**：迁移完成后，旧 Debug 模块应从主代码路径中彻底移除；如确需保留历史实现，只以 Git 历史或独立 PoC 形式留存，不在主线代码中保留任何兼容壳或对外入口。

Devtools 侧的演进则完全基于本参考文档前面的两条事实源（Graph + EffectOp），不再单独为 legacy Debug 定义新的 UI 或事件模型。

---

## 6. 对应 Phase 与验收要点

在 plan 中，本文件主要支撑：

- Phase 2：确认 EffectOp 总线提供足够信息支撑基础时间线；  
- Phase 4：Devtools / Debug 的结构设计与旧模块迁移。

实现完成后，应至少满足：

1. 可以在一个示例模块上同时看到：
   - StateTraitGraph 的字段依赖图；  
   - 与之对应的 EffectOp 时间线（含 computed/link/source/service 事件）。  
2. 从 Graph 节点可以跳到相关事件，从事件可以跳回 traits 定义；  
3. 旧 DebugSink 通过 EffectOp Observer 完成迁移，不再需要直接在 Runtime 内部 scattered hook；  
4. 在禁用 Debug 中间件时，运行时性能与未接入 Devtools 的版本接近。

这些检查项通过后，方可认为 spec 中关于 Devtools / Debug 的部分真正落地。
