# Contracts: Devtools ↔ Runtime & Trait Engine

> 说明：本节用「接口契约」的形式描述 Devtools 与 Runtime / Trait 引擎之间的最小交互面，不绑定具体传输协议（可映射为函数调用、消息通道或 WebSocket）。

## 1. 模块与实例列表

### 1.1 列出所有 Module

- **Operation**: `listModules()`
- **Input**: 无
- **Output**:
  - `modules: Array<{
      moduleId: string,
      displayName: string,
      instanceCount: number,
      hasTraitBlueprint: boolean,
      hasTraitRuntime: boolean,
    }>`
- **Semantics**:
  - 返回当前进程内已知的所有模块（至少包括已注册 Runtime 的模块）；
  - `hasTraitBlueprint` 表示该模块是否存在 StateTraitProgram / Graph；
  - `hasTraitRuntime` 表示是否存在至少一个带 TraitProgram 的运行实例。

### 1.2 列出某 Module 的实例

- **Operation**: `listModuleInstances(moduleId: string)`
- **Output**:
  - `instances: Array<{
      moduleId: string,
      instanceId: string,
      label: string,
      setupStatus: "blueprint-only" | "setup-partial" | "setup-complete" | "setup-error",
      activeTxnCount: number,
      lastTxnSummary?: { txnId: string, kind: string, startedAt: number },
    }>`

## 2. Trait 蓝图与生命周期

### 2.1 获取模块的 TraitProgram / Graph

- **Operation**: `getTraitBlueprint(moduleId: string)`
- **Output**:
  - `program?: StateTraitProgram`（抽象结构，至少包含 graph / plan）；
  - `graph?: StateTraitGraph`。
- **Semantics**:
  - 用于 Devtools 绘制 TraitGraph 与字段能力；
  - 在仅加载蓝图 + setup 的模式下可独立工作，不依赖 Env / 外部服务。

### 2.2 获取实例级 Trait 生命周期状态

- **Operation**: `getTraitLifecycle(moduleId: string, instanceId: string)`
- **Output**:
  - `nodes: Array<{
      traitNodeId: string,
      blueprintPresent: boolean,
      setupStatus: "not-attached" | "attached" | "error",
      hasRuntimeEvents: boolean,
      recentTxns: string[],
    }>`
- **Semantics**:
  - 用于在 TraitGraph 上标记每个节点在 setup / run 两个阶段的状态；
  - `recentTxns` 可用于从结构视图跳转到相关事务列表。

## 3. 事务与事件流

### 3.1 列出某实例的事务

- **Operation**: `listTransactions(moduleId: string, instanceId: string, options?: { limit?: number })`
- **Output**:
  - `txns: Array<{
      txnId: string,
      moduleId: string,
      instanceId: string,
      label: string,
      origin: { kind: string, name?: string },
      startedAt: number,
      durationMs: number,
      patchCount: number,
      traitTouchedNodeIds: string[],
    }>`

### 3.2 获取某事务的详细信息

- **Operation**: `getTransactionDetail(moduleId: string, instanceId: string, txnId: string)`
- **Output**:
  - `transaction: {
      txnId: string,
      moduleId: string,
      instanceId: string,
      origin: { kind: string, name?: string, details?: any },
      startedAt: number,
      endedAt: number,
      patches: StatePatch[],
      events: TraitRuntimeEventRef[],
      initialStateSnapshot?: any,
      finalStateSnapshot?: any,
    }`

### 3.3 订阅 Runtime Debug 事件流（可选）

- **Operation**: `subscribeEffectOp(onEvent: (event: TraitRuntimeEventRef) => void)`
- **Semantics**:
  - 提供按时间顺序的 RuntimeDebugEvent 流，用于实时更新 Timeline 视图；  
  - 事件结构与数据模型中的 `TraitRuntimeEvent / RuntimeDebugEventRef` 对齐：至少包含 `eventId / moduleId? / instanceId? / runtimeId? / txnId? / kind / label / timestamp / meta` 等字段；  
  - `kind` 字段用于归类：包括 `"action"`、`"state"`、`"service"`、`"trait-computed"`、`"trait-link"`、`"trait-source"`、`"lifecycle"`、`"react-render"`、`"devtools"` 等；  
  - React 渲染事件以 `kind = "react-render"` 暴露，`meta` 中提供 `componentLabel`、`selectorKey`/`fieldPaths`、`strictModePhase` 等信息，且在由某次 StateTransaction 提交触发时应附带对应的 `txnId`；  
  - Devtools 可结合 `listTransactions` 与 `getTransactionDetail` 做补充聚合，并在 UI 上按类别筛选或折叠不同类型的事件（例如只看 `action + trait + state`，或额外展开 `react-render` 以分析渲染代价）。

## 4. Devtools 对 Runtime 的控制入口

### 4.1 触发 source 刷新

- **Operation**: `refreshSourceField(moduleId: string, instanceId: string, fieldPath: string)`
- **Semantics**:
  - 映射到 BoundApi.traits.source.refresh(fieldPath)；
  - 将开启一个新的 StateTransaction（origin.kind = "source-refresh"）。

### 4.2 回放状态 / Time-travel

- **Operation**: `applyTransactionSnapshot(moduleId: string, instanceId: string, txnId: string, mode: "before" | "after")`
- **Semantics**:
  - 在开发 / 测试环境中，将指定模块实例状态回放到某次事务「开始前」或「提交后」的状态；  
  - Runtime 在执行该操作时：  
    - 只更新该实例的内部状态（例如通过内部 setState），并触发必要的纯 Trait 派生逻辑以保持派生字段一致；  
    - 不重新执行外部服务调用或重复执行业务副作用（例如不得重新发起 HTTP 请求或写入外部存储）；  
    - 必须将本次时间旅行操作记录为一个特殊的 StateTransaction（origin.kind = "devtools"），以便 Devtools 在事务时间线中展示与回溯 time-travel 操作的完整轨迹；该 devtools 事务可以选择不对外触发新的订阅通知。  
  - 该能力必须通过运行时配置或 Devtools 通道显式启用，不允许在生产环境默认开放。
