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

### 1.6 TaskRunner / TaskExecution（长链路语法糖，后续演进）

> Task Runner 是在保持“逻辑入口 = 事务边界”不变量不变的前提下，对“pending → IO → result”长链路的高层封装；属于 Bound/Flow 层的可选语法糖。

- **TaskRunnerConfig**（每个 `run*Task` 方法的配置对象，高层抽象）：
  - `pending?: Effect | (payload) => Effect` — 同步 pending 写入；只对被接受并启动的 task 执行，且始终通过独立的 pending 事务提交；  
  - `effect: (payload) => Effect` — 真实 IO/异步任务；在事务外的 Fiber 中运行；  
  - `success?: (result, payload) => Effect` — 成功写回；  
  - `failure?: (errorOrCause, payload) => Effect` — 失败写回；  
  - `origin?: { pending?: StateTxnOrigin; success?: StateTxnOrigin; failure?: StateTxnOrigin }` — 允许覆写三笔事务的 origin；  
  - `priority?: number` — 预留字段，仅用于未来调度/观测排序，不改变事务边界（可选）。

- **TaskExecution**（运行期内部视图，不对外持久化）：
  - `taskId: number` — 在同一 IntentBuilder/实例内递增的任务序号，用于 latest guard；  
  - `status: "pending" | "running" | "success" | "failure" | "interrupted"`；  
  - `triggeredAt: number` / `finishedAt?: number`；  
  - `payload: any` / `result?: any` / `error?: any`（运行期可选记录，仅 dev 下采集）。  

- **默认 origin 约定**：
  - pending 事务：`origin.kind = "task:pending"`，`origin.name` 默认为触发源（如 actionTag / fieldPath），可被 config 覆写；  
  - success/failure 写回事务：默认 `origin.kind = "service-callback"`，`origin.name = "task:success" | "task:failure"`，可被 config 覆写。

- **Relationships**:
  - 1 个 `TaskExecution` 最多派生 3 笔 `StateTransaction`（pending / success / failure），且在单实例 txnQueue 中保持顺序；  
  - `runLatestTask` 的旧 `TaskExecution` 在被中断或 guard 掉后不再派生写回事务。


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

### 3.4 DevtoolsOriginTimelineEntry（未来阶段，Origin-first 视图用）

- **Description**: 业务开发者视角的全局时间线条目，用于在 Devtools 中按“逻辑入口 / 业务事件 / Devtools 操作”维度聚合多个模块/实例的状态事务。该实体仅存在于 Devtools 视图模型层，用于驱动 Origin-first Timeline 视图，不作为 Runtime 契约的一部分。  
- **Key Fields**（草案，后续可按需要细化）：
  - `originId: string` — Origin 唯一标识，可基于 StateTransaction.origin 或 Devtools 内部生成；  
  - `timestamp: number` — 代表该 Origin 的时间（通常为首个相关 StateTransaction.startedAt 或首个相关事件的 timestamp）；  
  - `origin: { kind: string; name?: string; details?: any }` — 逻辑入口 / 业务事件 / Devtools 操作的描述，例如 `"action"` / `"service-callback"` / `"devtools"`；  
  - `label: string` — 用于 Timeline 展示的简要文本，如 `"click: save"` / `"service: profileLoaded"` / `"devtools: timeTravel to Txn#42 AFTER"`；  
  - `moduleInstanceSummaries: Array<{
      moduleId: string;
      instanceId: string;
      txnIds: string[];
    }>` — 本 Origin 下触达的模块实例与对应的 StateTransaction 列表，用于在 Origin detail 面板中展开事务视图。  
- **Relationships**:
  - 派生自一组 StateTransaction（即 origin 相同的一批事务），由 Devtools VM 层聚合生成；  
  - 不直接持久化或对外暴露，只作为 RuntimeDebugEvent + StateTransaction 之上的派生视图。  


### 3.5 DevtoolsState & 状态模块拆解（`state.ts` 重构约束）

- **Description**: Devtools 模块内的统一视图状态模型与实现分层约束，用于指导 `packages/logix-devtools-react/src/state.ts` 拆解，避免「单文件过长 + 逻辑耦合」问题。重构后仍保持 Runtime 契约不变，仅在 Devtools VM 层做内部结构调整。

#### 3.5.1 DevtoolsState（视图状态模型）

- **Key Fields**（与实现中的 `DevtoolsStateSchema` 一一对应）：
  - `open: boolean` — Devtools 面板是否展开；
  - `selectedRuntime?: string` — 当前选中的 Runtime 标识；
  - `selectedModule?: string` — 当前选中的 ModuleId；
  - `selectedInstance?: string` — 当前选中的 InstanceId；
  - `selectedEventIndex?: number` — Timeline 中当前高亮的事件索引；
  - `selectedFieldPath?: string` — 由 TraitGraph 点击设置的字段路径，用于 Timeline 事件按字段关联筛选；
  - `runtimes: DevtoolsRuntimeView[]` — 由 Snapshot 派生出的 Runtime/Module/Instance 结构视图（见 3.1 / 3.2）；
  - `timeline: TimelineEntry[]` — 当前过滤条件下的事件时间线（带可选 `stateAfter` 快照）；
  - `activeState?: any` — Inspector 右侧展示的“当前状态”（基于选中事件的 stateAfter 或 latestStates 推导）；
  - `layout: DevtoolsLayout` — 面板高度、边距、拖拽状态等布局信息；
  - `settings: DevtoolsSettings` — Devtools 设置面板中集中管理的观测/性能相关配置（含事件窗口大小等）；
  - `theme: "system" | "light" | "dark"` — Devtools 主题偏好。
- **Invariants**：
  - `selectedEventIndex` 若存在，MUST 落在 `timeline` 当前长度范围内；超出范围时在 `computeDevtoolsState` 中自动回退为 `undefined`；
  - `selectedRuntime` / `selectedModule` / `selectedInstance` 若指向不存在的实体，MUST 在 `computeDevtoolsState` 中回退为“第一个可用项”或 `undefined`；
  - `layout.isDragging` 不持久化到 localStorage，刷新后 MUST 重置为 `false`。

#### 3.5.2 DevtoolsLayout & Storage（布局与持久化）

- **Key Fields**（与实现中的 `DevtoolsState['layout']` 对齐）：
  - `height: number` — 面板高度；
  - `marginLeft: number` / `marginRight: number` — 左右边距；
  - `isDragging: boolean` — 当前是否处于拖拽调整阶段；
  - `trigger?: { x: number; y: number; isDragging: boolean }` — 拖拽触发点记录，仅用于交互体验。
- **Storage 约束**：
  - 使用单独的 `DevtoolsLayoutStorage` 辅助模块封装 localStorage 访问逻辑（当前实现中的 `LAYOUT_STORAGE_KEY`、`loadLayoutFromStorage`、`persistLayoutToStorage`）；
  - 所有对 `window.localStorage` 的读写 MUST 只出现在该 Storage 模块中，其他文件通过纯函数接口使用，便于测试与未来替换存储后端；
  - localStorage 不可用时（如 SSR / 隐私模式） MUST 优雅降级为仅内存态，不影响 Devtools 基本功能。

#### 3.5.3 Timeline & Selection 计算（纯函数层）

- **职责**：从 `DevtoolsSnapshot`（事件 + latestStates + instances）与可选 `DevtoolsSelectionOverride` 派生出完整的 `DevtoolsState`，不直接触达 DOM 或存储。
- **核心纯函数**：
  - `getAtPath(obj: unknown, path: string): unknown` — 仅负责按 `"a.b.c"` 形式读取嵌套字段值，用于字段筛选与 diff 判断；
  - `computeDevtoolsState(prev: DevtoolsState | undefined, snapshot: DevtoolsSnapshot, overrides: DevtoolsSelectionOverride): DevtoolsState`：
    - 负责构建 `runtimes` 结构视图（包含活跃实例兜底逻辑）；
    - 负责根据 overrides + base state 决定选中的 Runtime/Module/Instance/Event/FieldPath；
    - 负责派生 Timeline（含字段筛选）与 activeState（事件快照或 latestStates 兜底）；
    - 不允许直接访问 `window` / `localStorage` / DOM，仅依赖入参。
- **约束**：
  - `computeDevtoolsState` MUST 可重入且无副作用，便于在 reducer / Effect 流中复用；
  - 字段筛选与事件选择逻辑须保持与 Spec 中「时间线游标 + 字段过滤」约束一致。

#### 3.5.4 Devtools Module & Logic（Logix 模块层）

- **DevtoolsModule（`state.module.ts` 目标形态）**：
  - 封装 `DevtoolsStateSchema`、Actions Schema（如 `toggleOpen` / `selectRuntime` / `selectModule` / `selectInstance` / `selectEventIndex` / `selectFieldPath` / `clearEvents` / `resizeStart` / `updateLayout` / `setTheme`）；
  - Reducer 仅负责：
    - 调用 `computeDevtoolsState` 更新视图状态；
    - 在 `updateLayout` 的场景下调用 `DevtoolsLayoutStorage` 落盘布局（仅当拖拽结束时）。
  - 禁止在 reducer 内直接访问 DOM 或注册订阅。
- **DevtoolsLogic（`state.logic.ts` 目标形态）**：
  - 只负责 Logix 生命周期与副作用：
    - 在 `run` 阶段通过 `DevtoolsSnapshotStore` Service 先读取一次当前 Snapshot（`yield* DevtoolsSnapshotStore` 并访问其 `get`），再使用 `$.on(snapshotStore.changes)` 订阅 Snapshot 流，在事件到达时触发 `$.state.update` 派生最新的 DevtoolsState；
    - 处理 `resizeStart` 拖拽行为（通过 `fromDomEvent('mousemove'/'mouseup')`）；
    - 处理 `clearEvents` 等需要调用 Runtime 侧清理函数的动作。
  - 是唯一允许使用 `window` / DOM 事件的层（通过封装好的 `fromDomEvent`）。
  - `DevtoolsSnapshotStore` 作为 Env Service 存在，其 Service 形状为 `{ get: Effect<DevtoolsSnapshot>; changes: Stream<DevtoolsSnapshot> }`，由 `devtoolsSnapshotLayer` 在 DevtoolsRuntime 中注入；DevtoolsLogic 不直接依赖 snapshot.ts 内部的全局 listeners，而只通过该 Tag 访问 Snapshot 及其变化流。

#### 3.5.5 Runtime Wire-up（运行时装配）

  - **DevtoolsRuntime（`state.runtime.ts` 目标形态）**：
  - 负责通过 `Logix.Runtime.make(DevtoolsImpl)` 创建独立的 Devtools Runtime；
  - 暴露 `devtoolsRuntime` 与 `devtoolsModuleRuntime` 给外层 React 适配（例如 DevtoolsShell）；
  - 不再包含复杂业务逻辑，仅做装配与导出。
- **重构后文件规划（建议）**：
  - `state/model.ts`：`TimelineEntrySchema` / `DevtoolsStateSchema` / `DevtoolsState` / `DevtoolsSelectionOverride` / `emptyDevtoolsState`；
  - `state/storage.ts`：`LAYOUT_STORAGE_KEY` / `loadLayoutFromStorage` / `persistLayoutToStorage`（封装 localStorage）；
  - `state/compute.ts`：`getAtPath` / `computeDevtoolsState` 及其相关纯函数；
  - `state/module.ts`：`DevtoolsModule` 定义（actions/reducers）；
  - `state/logic.ts`：`DevtoolsLogic`（订阅 Snapshot + 拖拽 + clearEvents 副作用）；
  - `state/runtime.ts`：`DevtoolsImpl` / `devtoolsRuntime` / `devtoolsModuleRuntime` / `fromDomEvent` 封装。
- **约束**：
  - 拆分仅限 Devtools 内部实现文件结构与职责，不改变对外导出的类型与 Runtime 界面；
  - 在实现层面必须保持「一个方向的依赖图」：`model` → `storage` / `compute` → `module` → `logic` → `runtime`，禁止出现反向导入。

### 3.6 DevtoolsSettings（设置面板模型）

- **Description**: 通过设置面板集中管理的观测策略与性能相关参数，持久化到 `localStorage`，用于控制 Debug 事件采集粒度、时间线视图行为以及事件窗口大小等。
- **Key Fields**：
  - `mode: "basic" | "deep"` — 观测模式，控制是否展示 Trait 细节、`react-render` 事件、时间旅行控件等（与 FR-016 一致）；  
  - `showTraitEvents: boolean` — 是否在 Timeline 中展示 Trait 级事件（在 `"basic"` 模式下通常为 false）；  
  - `showReactRenderEvents: boolean` — 是否展示 `react-render` 事件；  
  - `enableTimeTravelUI: boolean` — 是否在 UI 中展示时间旅行控件；  
  - `overviewThresholds: { txnPerSecondWarn: number; txnPerSecondDanger: number; renderPerTxnWarn: number; renderPerTxnDanger: number }` — overview strip 用于红黄绿分段的软阈值集合；  
  - `eventBufferSize: number` — Devtools 事件窗口大小，对应 Debug 层 ring buffer 的容量（例如默认 500，推荐范围 200–2000），用于控制在 dev 环境下保留多少条最近事件；  
  - `sampling: { reactRenderSampleRate: number }` — 针对高频 `react-render` 事件的采样率配置（例如 1.0 表示全量采集，0.1 表示采样 10%）。
- **Persistence & Invariants**：
  - `DevtoolsSettings` MUST 通过 Settings 面板读写，并持久化到 `localStorage`（键名可统一前缀，例如 `__logix_devtools_settings__`），在 Devtools 初始化时从存储恢复；  
  - 在 localStorage 不可用的环境中，Devtools MUST 使用内存态设置，并回退到内建默认值；  
  - `eventBufferSize` 读取后 MUST 在合理范围内裁剪（例如 `< 100` 自动提升到 100，`> 5000` 自动压缩到 5000），防止极端配置导致 DebugSink 占用过多内存或过少事件；  
  - Settings 改动生效后，Devtools SHOULD 将 `eventBufferSize` 等关键参数透传到 Debug 层（例如重新构造或调整 ring buffer Sink），以便真正影响事件采集行为，而不仅仅改变 UI。


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
