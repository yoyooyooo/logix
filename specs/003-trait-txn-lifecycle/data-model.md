# Data Model: StateTrait 状态事务与生命周期分层（Devtools 升级）

## 1. Core Runtime Entities

### 1.1 Module

- **Description**: 逻辑模块蓝图，承载 `state / actions / traits` 三个槽位定义。Devtools 以 Module 为根节点组织实例与事务视图。
- **Key Fields**:
  - `moduleId: string` — 模块唯一标识（与 ModuleInstance.id 对齐）；
  - `name: string` — 用于 Devtools 展示的模块名称；
  - `stateSchema: any` — 状态 Schema 描述（供 TraitProgram 构建使用）；
  - `traitsSpec: StateTraitSpec` — Trait 声明蓝图。
- **Relationships**:
  - 1:N 到 `ModuleInstance`；
  - 1:1 到 `StateTraitProgram` / `StateTraitGraph`（蓝图层）。

### 1.2 ModuleInstance

- **Description**: 同一 Module 在某个 Runtime 环境中的具体实例（例如一个 React Host 中的某个 RuntimeProvider 下挂载的实例）。
- **Key Fields**:
  - `moduleId: string` — 所属模块标识；
  - `instanceId: string` — 实例唯一标识；
  - `runtimeId: string` — 对应底层 ModuleRuntime 的内部 ID（如存在）；
  - `setupStatus: SetupStatus` — Trait 蓝图是否全部正确接线的状态枚举：
    - `"blueprint-only"` — 仅有蓝图，未执行 setup；
    - `"setup-partial"` — 部分 TraitPlan 已接线，存在缺失；
    - `"setup-complete"` — 所有 TraitPlan 均已成功接线；
    - `"setup-error"` — setup 阶段发生错误（含诊断信息）。
- **Relationships**:
  - N:1 到 `Module`；
  - 1:N 到 `StateTransaction`；
  - 1:1 到运行中的 `ModuleRuntime`。

### 1.3 StateTransaction

- **Description**: 一次逻辑入口下的完整状态演进单元，是 Devtools 中「事务视图」的核心实体。
- **Key Fields**:
  - `txnId: string` — 事务唯一标识（在 moduleId + instanceId 作用域内唯一）；
  - `moduleId: string` — 所属模块；
  - `instanceId: string` — 所属实例；
  - `origin: {
      kind: "action" | "source-refresh" | "service-callback" | "devtools" | string,
      name?: string,
      details?: any,
    }` — 事务发起来源及其附加信息；
  - `startedAt: number` — 事务开始时间戳（ms）；
  - `endedAt: number` — 事务结束时间戳（ms）；
  - `durationMs: number` — 事务耗时（derived）；
  - `initialStateSnapshot?: any` — 可选的初始状态快照（为节省成本可以只在 Dev 模式或采样保存）；
  - `finalStateSnapshot?: any` — 提交时的最终状态快照（同上，可采样）；
  - `patches: StatePatch[]` — 事务内状态变更集合；
  - `events: TraitRuntimeEventRef[]` — 与本事务相关的 EffectOp 事件引用（按时间顺序）。
- **Relationships**:
  - N:1 到 `ModuleInstance`；
  - 1:N 到 `StatePatch`；
  - 1:N 到 `TraitRuntimeEventRef`。

### 1.4 StatePatch

- **Description**: 某次事务内部对状态的原子变更记录，用于在 Devtools 中展示字段级差异和 Trait 的影响范围。
- **Key Fields**:
  - `path: string` — 被修改的字段路径（如 `"meta.isDirty"`）；
  - `from?: any` — 原值（可选，为控制成本可按配置采样）；
  - `to?: any` — 新值（同上）；
  - `reason: PatchReason` — 变更原因：
    - `"reducer"` — 由 Primary Reducer 或 Logic 的 state.update/mutate 引起；
    - `"trait-computed"` — 由 Trait 的 computed 步骤引起；
    - `"trait-link"` — 由 Trait 的 link 步骤引起；
    - `"source-refresh"` — 由某个 source 刷新结果写回引起；
    - 其他可扩展类型（如 `"devtools"` 回放）。
  - `traitNodeId?: string` — 若来自 Trait 步骤，对应 StateTraitGraph 节点 ID；
  - `stepId?: string` — 若来自 TraitPlan 步骤，对应 Plan 中的 step ID。
- **Relationships**:
  - N:1 到 `StateTransaction`；
  - 可选 1:1 到 `StateTraitGraphNode` / PlanStep。

### 1.5 TraitRuntimeEvent / RuntimeDebugEventRef

- **Description**: Devtools 消费的统一 Runtime Debug 事件视图，是对底层 `Logix.Debug.Event` / EffectOp 事件的轻量抽象，用于在事务视图和时间线中做聚合和过滤。虽然名称中仍保留 Trait，但语义上覆盖所有与模块运行相关的事件（动作、状态提交、Trait 步骤、服务调用、React 渲染、Devtools 操作等）。  
- **Key Fields**:
  - `eventId: string` — 事件唯一标识（在单进程内唯一，通常由 DebugSink 生成）；  
  - `txnId?: string` — 所属事务 ID（若事件可以归属到某个 StateTransaction，则必填；例如 `action:dispatch` / Trait 步骤 / `state:update` / 由事务引发的 `react-render`；若是全局 Devtools 操作或单纯布局事件，则可为空）；  
  - `moduleId?: string` — 所属模块（如有）；  
  - `instanceId?: string` — 所属实例（如有）；  
  - `runtimeId?: string` — 底层 ModuleRuntime 的内部 ID，便于与 React 实例/Devtools 实例标签对齐；  
  - `timestamp: number` — 事件时间戳（ms）；  
  - `kind: "action" | "state" | "service" | "trait-computed" | "trait-link" | "trait-source" | "lifecycle" | "react-render" | "devtools" | string` — 归一化事件类别，用于时间线分组与筛选；  
  - `label: string` — 简要描述（例如 `"action: changeName"`、`"trait: meta.isDirty computed"`、`"react: TraitForm render"`）；  
  - `meta: any` — 事件特定的附加信息，典型字段包括：
    - `traitNodeId?: string` / `planStepId?: string` — 若为 Trait 步骤，关联的图节点 ID 与 Plan 步骤 ID；  
    - `actionTag?: string` / `actionType?: string` — 若为 action 事件；  
    - `serviceName?: string` / `requestId?: string` — 若为服务调用；  
    - `componentLabel?: string` / `selectorKey?: string` / `fieldPaths?: string[]` — 若为 `react-render` 事件，对应 React 组件标识和关键 selector / 字段路径；  
    - `strictModePhase?: "mount" | "double-invoke" | "effect"` — 对应 React 严格模式阶段；  
    - 其他与 Devtools 操作（如时间旅行、布局调整）相关的元信息。
- **Relationships**:
  - N:1 到 `StateTransaction`（当 `txnId` 存在时）；  
  - 与底层 Debug 事件（`Logix.Debug.Event`）之间应有可逆或可追溯映射，便于后续扩展更细粒度的诊断能力。


## 2. Trait Blueprint & Lifecycle Entities

### 2.1 StateTraitProgram

- **Description**: 从 `stateSchema + traitsSpec` 构建出的 Trait 蓝图程序，对 Devtools 来说是「TraitGraph / Plan」的数据来源。
- **Key Fields**（高层抽象）：
  - `moduleId: string` — 所属模块；
  - `stateSchema: any` — 状态 Schema 类型描述；
  - `spec: StateTraitSpec` — Trait 规格；
  - `graph: StateTraitGraph` — 字段与 Trait 的图结构视图；
  - `plan: StateTraitPlan` — 运行阶段应执行的步骤计划列表。

### 2.2 StateTraitGraph

- **Description**: Trait 蓝图的图结构表示，用于 Devtools 绘图和结构分析。
- **Key Fields**：
  - `nodes: StateTraitGraphNode[]` — 节点集合，节点可以是字段节点、Trait 节点等；
  - `edges: StateTraitGraphEdge[]` — 边集合，描述字段依赖和 Trait 链接；
  - `metadata: any` — 附加元信息，如模块文件路径、源位置等。

### 2.3 StateTraitPlan

- **Description**: 从 Program 中导出的执行计划，用于指导 setup/run 如何安装和执行 Trait 行为。
- **Key Fields**：
  - `steps: StateTraitPlanStep[]` — 有序步骤列表，每个步骤有 kind（computed-update / link-propagate / source-refresh 等）、目标字段路径、依赖字段集合等。

### 2.4 StateTraitLifecycleState

- **Description**: 某个 Trait 节点在蓝图 / setup / run 三阶段的状态视图，用于 Devtools 上高亮和过滤。
- **Key Fields**：
  - `moduleId: string`；
  - `instanceId?: string` — 若与具体实例绑定；
  - `traitNodeId: string` — 来自 StateTraitGraph 的节点 ID；
  - `blueprintPresent: boolean` — 蓝图中是否存在该节点；
  - `setupStatus: "not-attached" | "attached" | "error"` — setup 阶段是否完成及错误情况；
  - `hasRuntimeEvents: boolean` — run 阶段是否观察到该节点相关的 TraitRuntimeEvent；
  - `recentTxns: string[]` — 最近触达该节点的事务 ID 列表（可裁剪）。


## 3. Devtools View Model

### 3.1 DevtoolsModuleView

- **Description**: Devtools 左侧导航中 Module 层节点的视图模型。
- **Key Fields**：
  - `moduleId: string`；
  - `displayName: string`；
  - `instanceCount: number`；
  - `hasTraitBlueprint: boolean`；
  - `hasTraitRuntime: boolean` — 是否有当前运行中的实例带 TraitProgram。

### 3.2 DevtoolsInstanceView

- **Description**: Devtools 左侧导航中 Instance 层节点的视图模型。
- **Key Fields**：
  - `moduleId: string`；
  - `instanceId: string`；
  - `label: string` — 简要说明实例来源（例如 “TraitForm@Sandbox”）；
  - `setupStatus: SetupStatus`；
  - `activeTxnCount: number` — 当前可回放的事务数量；
  - `lastTxnSummary?: { txnId: string; kind: string; startedAt: number }`。

### 3.3 DevtoolsTransactionView

- **Description**: Devtools 左侧导航或中部事务列表中的 Transaction 节点视图模型。
- **Key Fields**：
  - `txnId: string`；
  - `moduleId: string`；
  - `instanceId: string`；
  - `label: string` — 例如 "clickName(changeName)" 或 "source-refresh(profile)"；
  - `startedAt: number`；
  - `durationMs: number`；
  - `patchCount: number`；
  - `traitTouchedNodeIds: string[]` — 本事务涉及的 TraitGraph 节点 ID 集合。


## 4. Validation & Invariants

- 对同一 `moduleId + instanceId` 组合，任何时刻同一 `txnId` 的 StateTransaction 必须是唯一的。  
- 对任一 StateTransaction：
  - 所有关联的 StatePatch 的 `txnId` 必须与事务一致；
  - 所有 TraitRuntimeEvent 的 `txnId` 必须与事务一致；
  - 若 `finalStateSnapshot` 存在，则它应等价于按顺序将 Patch 应用到 `initialStateSnapshot` 后的结果（在开启快照记录的配置下）。
- TraitLifecycleState 必须满足：
  - `blueprintPresent = true` 时，`traitNodeId` 必须在 StateTraitGraph.nodes 中存在；
  - `setupStatus = "attached"` 时，Devtools 应能在 Runtime 内部找到与该节点对应的 setup 接线记录；
  - `hasRuntimeEvents = true` 时，该节点至少出现在一条 TraitRuntimeEvent 的 meta 中。


## 5. Extensions & Later Phases

本数据模型同时覆盖「当前必需」与「已知的扩展点」，扩展点在设计上已纳入整体模型，但实际落地可以按你的实施优先级分阶段推进。典型扩展包括：  
- `initialStateSnapshot` / `finalStateSnapshot`：为事务级回放与 Patch 校验预留的状态快照字段；  
- 更细粒度的 Patch 分组 / payload 预览：支持在 Devtools 中按“逻辑步骤”展示一组字段修改，或对大型对象做截断预览；  
- 完整的 time-travel 回放与事务序列录制：在 Dev 环境中基于 Transaction + Patch 重建状态演进，用于问题复现与演示。  

这些扩展点的更详细讨论与约束，可见：  
- `specs/003-trait-txn-lifecycle/references/future-devtools-data-model.md`
