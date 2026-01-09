# 3. StateTrait（字段能力引擎）

- **StateTrait**
  - 概念上是「字段能力与 State Graph 的统一引擎」：
    - 从 Module 图纸上的 `state + traits` 槽位，抽象出每个字段的能力（Computed / Source / Link 等）；
    - 生成结构化的 Graph 与 Plan，用于 Runtime 与 DevTools 消费；
    - 以 Module 维度作为边界，不跨模块偷偷引入隐式字段依赖。
  - 在实现层由 `@logixjs/core` 内部的 StateTrait 模块承载（见 `docs/ssot/runtime/logix-core/api/02-module-and-logic-api.md` 与 `specs/000-module-traits-runtime/*`），早期分离包 `@logixjs/data` 的方案已被统一收敛到 StateTrait。
- **StateTraitGraph / StateTraitPlan / StateTraitProgram**
  - Graph（图）：字段与能力的结构视图（节点 = 字段；边 = 计算/联动/资源依赖）；
  - Plan（计划）：Runtime 执行这些能力的步骤清单（何时重算 computed、何时刷新 source、何时进行 link 传播）；
  - Program：从「State Schema + traits 声明」build 出来的统一 Program 对象，既包含原始 Spec，又包含 Graph/Plan，作为 Runtime 与 DevTools 的单一入口。
- **设计要点**：
  - StateTrait 只负责「字段如何被维护」的 **What**（例如：sum 是 a/b 的函数、profile.name 跟随 profileResource.name、某字段来自外部资源），不关心具体 IO 细节；
  - Runtime 通过 StateTraitPlan 将这些能力编译为实际的 Effect/Watcher/EffectOp 流，DevTools 则以 StateTraitGraph 作为 State Graph 的事实源。

- **显式 deps（Explicit Dependencies）**
  - 对 computed/source/check 等规则声明的依赖字段路径集合；
  - 是依赖图构建与调度优化的唯一事实源：后续任何“最小触发 / 反向闭包 / 增量调度”都只认 deps。

- **Dependency Graph（依赖图）**
  - 从 StateTraitProgram 中的 `deps/link` 关系构建出的字段依赖图；
  - 同时承担：
    - 结构诊断（循环/冲突/热点定位）；
    - scoped validate 的最小范围计算；
    - 后续增量调度（reverse slicing）的基础设施。

- **Reverse Closure（反向闭包）**
  - 在依赖图中，某个 target 节点及其所有“直接或间接依赖 target”的节点集合；
  - 用于 scoped validate 等“只重跑受影响规则”的范围收敛。

- **RowID（虚拟身份）**
  - 内核用于给列表项分配的稳定身份（对外仍以 index 语义表达）；
  - 目标是在 insert/remove/reorder 下仍能稳定关联：
    - in-flight 异步写回门控；
    - 缓存复用；
    - 诊断与回放定位。
  - RowID 可以由业务提供 `trackBy` 提示以提升稳定性；但 RowID 本身不应泄漏为业务状态事实源。

- **TraitLifecycle（领域包统一下沉协议）**
  - 领域包（Form/Query/…）与 Trait 内核之间的统一桥接协议；
  - 以“可序列化、可比较的请求”表达校验/刷新/清理/失效等意图，确保所有领域能力最终可降解到统一的事务/回放/诊断语义。

- **FieldRef（字段引用）**
  - TraitLifecycle 中用于指向“要操作的字段实例”的引用结构；
  - 可表达：
    - `root`（整棵结构）；
    - `field(path)`（字段路径）；
    - `list(path)`（列表路径）；
    - `item(path, index, field?)`（列表项/列表项字段）。
  - 设计目标是：既能被日志/回放记录，也能在不同运行时实例中被一致解释。
