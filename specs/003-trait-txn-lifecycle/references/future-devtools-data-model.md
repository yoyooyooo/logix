# Extensions: Devtools & Trait Data Model

> 本文档补充记录在当前特性设计中已经考虑到、但在实施时可以按优先级推进的 Devtools / 数据模型扩展点。主体数据模型已将这些扩展纳入整体设计，这里提供更细的讨论，便于后续演进时查阅。

## 0. 当前实现快照（2025-12）

- 本轮 `003-trait-txn-lifecycle` 实现中，已经落地的部分包括：
  - 基于 `StateTransaction` 的事务模型与 Patch 记录，`RuntimeDebugEventRef` 中的 `txnId` / `patchCount` / `originKind` 字段；
  - 事务级时间旅行 API：`Logix.Runtime.applyTransactionSnapshot(moduleId, instanceId, txnId, mode)`，仅在 dev/test 环境可用，并基于事务的 `initialStateSnapshot` / `finalStateSnapshot` 回放状态；
  - Devtools 中的时间旅行控件：在 Transaction 详情里支持“回到事务前状态 / 回到事务后状态 / 返回最新状态”，并使用 `origin.kind = "devtools"` 记录时间旅行事务；
  - 基于 runtime 内部 ring buffer 的事务历史（目前为每个实例约 500 条），以及以 `RuntimeDebugEventRef` 为核心的 Timeline 视图。
- 相比最初的数据模型草案，当前实现刻意 **尚未** 提供：
  - 事务内部“步级” time-travel：时间线中选中某个事件目前只影响高亮与过滤，不会单独回放到“第 k 步”；对应能力仍作为未来扩展保留在 2.3 节；
  - 事务序列录制与导出：尚未实现 sessionId / 导出文件等机制，事务历史仅在内存 ring buffer 中短暂保存；
  - Origin-first 跨模块时间线、跨实例对比视图，以及事务/事件的持久化存储。
- 因此，可以将本文件剩余章节理解为：**在当前实现基础上的扩展路线图**。若未来实现这些能力，需要同时检查：
  - 是否仍沿用现有 `StateTransaction + StatePatch + RuntimeDebugEventRef` 结构；
  - 是否与 `docs/ssot/runtime/logix-core/*` 与 Devtools 合同（`contracts/devtools-runtime-contracts.md`）保持一致。

## 1. 更细粒度的 Patch / Snapshot 策略

### 1.1 全量状态快照与采样策略

- 现状（本轮范围内）：
  - `StateTransaction.initialStateSnapshot` / `finalStateSnapshot` 是可选字段，主要用于调试和验证 Patch 应用正确性；
  - 在数据模型中仅作为“可采样字段”存在，是否记录由实现与配置决定。
- 未来扩展：
  - 按环境或事务类型配置快照策略：
    - dev 环境对所有事务保留 `initial + final`；
    - test 环境按测试用例需要选择性保留；
    - prod 中仅对标记为异常或慢事务采样。
  - 在 Devtools 中支持按事务直接查看「前后状态 diff」，而不仅仅是 Patch 列表。

### 1.2 更丰富的 StatePatch 结构

- 本轮数据模型中，StatePatch 聚焦：`path / from / to / reason / traitNodeId / stepId`。
- 未来可能增加：
  - `groupId`：将多个 Patch 归为同一“逻辑步骤”（例如同一次 Trait 派生内部对多个字段的修改）；
  - `payloadPreview`：对大型对象做截断后的预览（避免在 Devtools 中渲染过大 JSON）。

## 2. Time-travel / 回放能力

### 2.1 Transaction 级回放

- 现状（对齐本特性 FR-010/FR-011）：
  - 契约文档中定义了 `applyTransactionSnapshot(moduleId, instanceId, txnId, mode: "before" | "after")` 作为 Devtools → Runtime 的控制接口，本轮特性期望在 dev/test 环境中至少提供“事务前/事务后”两个落点的回放能力；
  - StateTransaction + StatePatch 结构保证可以根据快照 + Patch 重建任意事务前/后的状态，时间旅行操作本身不得重新触发外部副作用。
- 未来扩展：
  - 在事务级回放的基础上，对「事务内部步骤」提供更细粒度的游标与回放语义，例如支持在时间线中选中第 k 个事件后，将实例状态回放到“执行完第 k 步之后”的状态；
  - 这类扩展可以继续复用 StateTransaction + Patch + TraitRuntimeEventRef 结构，通过在 Devtools 侧维护事件游标，组合快照与 Patch 应用顺序实现，不必改变现有实体的核心语义；
  - 无论实现方式如何，仍需满足：能力只在开发/测试环境开启，并与网络/IO 等外部副作用严格隔离。

### 2.2 事务序列回放

- 潜在需求：将一段时间内的事务序列录制下来，并在 Devtools 中重放，观察 Trait 行为与中间状态。
- 数据模型扩展点：
  - 记录事务序列的全局顺序与外部输入（例如用户操作脚本）；
  - 在 EffectOp 事件流中标记“录制 sessionId”。

### 2.3 Origin-first Timeline 与步级回放（Future）

- 视图目标：
  - 在 Devtools 中提供一个以 Origin-first Timeline 为主的第二视图，让业务开发者可以从“某次交互/请求/Devtools 操作”切入，观察跨模块的事务与事件序列。
  - 对每个 Origin，允许在右侧展开所有相关 StateTransaction，并在其中使用事务级或步级 time-travel。
- 数据与行为关系：
  - Origin-first 视图不引入新的 Runtime 状态单元，所有状态仍由 StateTransaction + Patch + RuntimeDebugEvent 决定；
  - OriginTimelineEntry 作为 Devtools VM 层的派生实体，通过聚合相同 origin 的 StateTransaction 计算得到；
  - 步级 time-travel 的状态重建依赖 `initialStateSnapshot` + Patch 序列：
    - Devtools 先在内存中根据 Txn 的初始快照与 Patch 序列构造“Step k 的虚拟状态”（仅用于 Inspector 展示）；
    - 若用户进一步点击“回到第 k 步”，再通过 dev-only setState 能力将该虚拟状态写回 Runtime，并记录一条 origin.kind = "devtools" 的 StateTransaction。
- UI 层约束：
  - 选中时间线中的第 k 个事件时，默认行为仅为高亮/过滤与 Inspector 更新，不修改 Runtime/React 组件状态；
  - 只有在用户显式点击 time-travel 按钮（事务级或步级）时，才会触发 Runtime state 回放，并以 devtools 事务形式记录。

## 3. 更细的 Trait 生命周期状态

- 本轮生命周期视图只区分：
  - 蓝图是否存在；
  - setup 是否完成/错误；
  - run 阶段是否有相关事件。
- 未来扩展：
  - 将 setup 细分为：
    - 蓝图存在但未尝试安装（例如某些环境下禁用 Trait）；
    - 安装过程中遇到资源缺失（resourceId 未注册等）；
    - 安装过程中遇到配置错误（字段路径不合法等）；
  - 将 run 细分为：
    - 有事件但全部成功；
    - 有事件且存在 Trait 级错误（例如 derive 抛异常）、中间件错误等。

## 4. 跨实例 / 跨模块视图

- 本轮：
  - Devtools 左侧导航仅按 `Module → Instance → Transaction` 三层组织；
  - 数据模型只覆盖单实例内的事务与 Trait 行为。
- 未来扩展：
  - 增加「跨实例」视图，用于对比同一 Module 在多个实例上的行为差异（例如多租户场景）；
  - 增加「跨模块」视图，用于追踪一个事务在多个模块之间传播的路径（例如通过 Action / Event Bus 传播）。

## 5. 数据持久化与导出

- 当前假设：
  - Devtools 数据完全驻留在内存中，仅用于开发/调试时的即时观测；
  - 事务 / Patch / 事件不会长期存盘。
- 未来可能需求：
  - 将事务日志导出为独立文件（JSON / NDJSON），用于离线分析或共享 bug 重现场景；
  - 接入轻量级存储（例如浏览器 IndexedDB 或后端日志管道），以支持更长窗口的历史数据浏览。
