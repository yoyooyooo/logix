# Research: StateTrait 状态事务与生命周期分层（Devtools 升级）

## Decision 1: 在 Runtime 内核中引入显式 StateTransaction 模型

- **Decision**: 为每个 ModuleRuntime 增加 StateTransaction / StateTxnContext 抽象，将一次逻辑入口（dispatch / traits.refresh / service 回写等）视为一个状态事务，在事务内部聚合所有 Reducer / Trait / Middleware 对状态的修改，只在事务提交时执行一次真实的状态写入与对外通知。
- **Rationale**:
  - 现状依赖 SubscriptionRef.changes + Stream.changes 的值级去重，加上 React 的 useSyncExternalStore 批处理，行为虽“看起来正确”，但事务边界隐式且难以推理；
  - Trait 越多，内部的 state:update 事件越多，如果没有事务语义，很难在 Devtools 中解释“这几步到底属于哪一次交互”；
  - 显式 StateTransaction 让 Runtime 具备：
    - 原子性：一次逻辑入口内的所有变更对外表现为一次提交；
    - 可观测性：Devtools 可以按 txnId 聚合事件和 Patch；
    - 可扩展性：未来可以在事务层做更多策略（批处理、限流、回放）。
- **Alternatives considered**:
  - 仅在 Devtools 层做“软聚合”：根据时间戳/事件顺序猜测哪些 state:update 属于同一次点击。
    - 放弃：难以在边界场景（并发 dispatch / 背景刷新）保持正确聚合，也无法约束 Runtime 实际提交行为。
  - 在 Trait 层做局部 batching（只对 computed/link 做合并）。
    - 放弃：Trait 只是状态变更的一部分，真正的事务边界仍然在 Runtime；局部 batching 无法给 Devtools 提供全局可见的事务语义。

## Decision 2: StateTrait 显式拆为「蓝图 → setup → run」三段

- **Decision**: 将 StateTrait 生命周期划分为：
  - 蓝图层：`StateTrait.from` + `StateTrait.build`，只依赖 stateSchema + traitsSpec，生成 Program / Graph / Plan；
  - setup 层：在 ModuleRuntime / BoundApi 构造阶段运行，只做 Env 无关的结构 wiring（注册 source-refresh 入口、向 Devtools/Debug 注册 TraitPlanId/Graph 节点锚点等），禁止调用 run-only 能力；
  - run 层：在 Runtime 运行阶段基于 Program / Plan 安装 watcher / Flow / Middleware 行为，并在 StateTransaction 内执行具体步骤。
- **Rationale**:
  - 与 Module.reducer / lifecycle / Middleware 能力在“蓝图 vs Runtime”层级上对齐，便于 Studio / Alignment Lab 统一处理各种能力；
  - setup 与 run 分离后，Phase Guard 更简单：
    - setup 只跑结构接线，不依赖 Env / 外部服务，易于在测试中单独验证；
    - run 只承载真实 Effect 行为，出错时指向更清晰；
  - Studio / Devtools 可以：
    - 在只加载蓝图 + setup 的模式下做结构校验与可视化，不必 boot 完整 Runtime；
    - 在 run 模式下基于相同 Program / Graph 解释事务内的 Trait 行为。
- **Alternatives considered**:
  - 保持现状，在 StateTrait.install 内混合做结构 wiring 与 watcher 安装。
    - 放弃：Phase Guard 难以区分结构行为与运行行为；Devtools 无法精确判断“蓝图有但 setup 未接线”的情况；结构测试需要完整 Runtime，成本高。

## Decision 3: Devtools 以「Module → Instance → Transaction → Event」层级组织视图

- **Decision**: 以 Devtools 面板为中心，将观察对象分为四级父子关系：
  - Module（蓝图）：对应 Module 图纸与 StateTraitProgram / Graph；
  - Instance（实例）：同一 Module 在不同 Runtime 环境下的实例，携带 moduleId + instanceId，与 BoundApi / Runtime 绑定；
  - Transaction（事务）：一次逻辑入口对应的一次 StateTransaction，标识为 txnId，内部包含 Patch 与 Trait 步骤；
  - Event（事件）：EffectOp 流中的 action/state/service/trait 事件，附着在某个 txnId 之下。
- **Rationale**:
  - Module 层便于从图纸和 TraitGraph 视角理解“模块本应如何工作”；
  - Instance 层便于看“在这个具体运行时环境中是否接线成功（setup）、是否有多实例”；
  - Transaction 层便于把一次业务交互的所有内部步骤打包起来调试和回放；
  - Event 层保留 EffectOp 粒度，用于深入分析和时间线视图。
- **Alternatives considered**:
  - 在 Devtools 中将 Module / Instance / Transaction 做成三个平行 Tab 或独立面板。
    - 放弃：难以在调试时自然地从蓝图追到某个实例，再追到某次事务；导航成本高，用户心智更复杂。

## Decision 4: React 层继续使用 useSyncExternalStore 作为订阅桥梁

- **Decision**: 在 React 集成层继续使用 `useSyncExternalStoreWithSelector` 作为状态订阅入口，但将订阅源语义从“每次 setState”提升为“每次 StateTransaction 提交”，即：ModuleRuntime.changes(selector) 只在事务提交时 emit。
- **Rationale**:
  - 现有 hooks（useModule/useSelector）已经稳定依赖 useSyncExternalStore 行为，不宜在本特性中替换订阅机制；
  - StateTransaction 模型可以在 Runtime 内部收敛状态变更次数，使得对 React 而言，每次用户交互对应的 commit 次数有明确上限；
  - React 自带的批处理（同一事件内多次 onStoreChange 合并渲染）仍然可以发挥作用，但不再被用作“唯一的兜底机制”。
- **Alternatives considered**:
  - 为 Devtools 专门维护一份 Shadow Store，React 订阅与 Runtime 状态分离。
    - 放弃：引入双写与一致性问题，且不能从根本上解决“事务语义缺失”的问题。

## Decision 5: Devtools 视图按「蓝图 / setup / run」分层而非新增完全独立大面板

- **Decision**: 在现有 Devtools 面板（或 Debug Tab）上扩展：
  - 在 TraitGraph 视图中增加蓝图 vs setup 状态标记；
  - 在 Timeline / Transaction 视图中增加 txnId 维度和按 Trait 节点过滤的能力；
  - 以一个轻量「Traits」子视图呈现当前 Module/Instance 的蓝图、setup 状态与近期事务行为，而不是另起一整套新 UI。
- **Rationale**:
  - 减少 Devtools 入口碎片化，保持“一个面板解决 Trait + Middleware 调试”的心智；
  - 利用现有 EffectOp Timeline 和 Graph 的基础，迭代成本小；
  - 有利于后续在同一 Devtools 中持续增加与 Trait 相关的对齐能力（Alignment Lab）。
- **Alternatives considered**:
  - 单独做一个「Trait Devtools」应用或面板，与现有 Debug 面板完全分离。
    - 放弃：Module 作者和平台侧都需要统一的调试入口，将 Debug / Trait / Middleware 拆成多个面板会让学习和使用成本显著升高。

