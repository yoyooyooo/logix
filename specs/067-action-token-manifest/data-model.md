# Data Model: Action 级别定义锚点（ActionToken-ready Manifest）

**Feature**: `specs/067-action-token-manifest/spec.md`  
**Created**: 2026-01-01

> 说明：本特性不涉及持久化存储；此处的 “Data Model” 指平台/运行时/Devtools 之间传输与对齐的可序列化 IR（Static）与事件引用（Dynamic Trace）。

## Entities

### 1) DevSource（源码锚点，best-effort）

**Represents**: 对 Studio/Devtools 可展示的源码位置（可选，缺失时必须可降级）。

**Fields**:

- `file: string`
- `line: number (>=1)`
- `column: number (>=1)`

**Validation rules**:

- 必须可序列化；不得包含运行时对象引用。
- 允许缺失（`undefined`），消费侧不得依赖其必然存在。

### 2) ActionRef（Action 引用）

**Represents**: 跨 Code/Runtime/Studio 指向同一 Action 的稳定标识（单一事实源）。

**Fields**:

- `moduleId: string`
- `actionTag: string`（以 `_tag` 为权威来源）

**Derived keys**:

- `actionRefKey = moduleId::actionTag`（仅作为展示/索引 convenience；不强制落在协议中）

**Validation rules**:

- 只允许稳定字段；不得包含时间戳/随机数。
- `actionTag` 必须与 manifest 中的 `actions[].actionTag` 一致；否则视为 unknown。

### 3) ActionDescriptor（Action 定义摘要）

**Represents**: Manifest 中单条 action 的平台级摘要（用于 UI 展示与对齐，不承载闭包/Schema 本体）。

**Fields**:

- `actionTag: string`
- `payload`：
  - `kind: "void" | "nonVoid" | "unknown"`（至少要区分 void 与非 void）
  - 可选：未来可扩展 `schemaKey/jsonSchemaDigest` 等，但必须满足 deterministic + budget
- `primaryReducer?: { kind: "declared" | "registered" }`
- `source?: DevSource`（可选）

**Validation rules**:

- `actions[]` 必须按 `actionTag` 稳定排序（字节级一致）。
- 禁止在此处输出不可序列化内容（Schema/函数/Effect/闭包）。

### 4) ModuleManifest（v067，Manifest IR）

**Represents**: 单模块的可序列化结构化摘要（CI/Studio/Agent 的输入）。

**Fields (subset)**:

- `manifestVersion: string`（建议 `067`）
- `moduleId: string`
- `actions: ReadonlyArray<ActionDescriptor>`
- `digest: string`（仅由结构字段决定；用于 diff/契约守护）
- 可选沿用：`schemaKeys/logicUnits/source/meta/staticIr`（需满足 Slim + 可裁剪）

**Determinism rules**:

- 所有 key/数组必须有稳定排序。
- 输出必须可在相同输入下做到字节级一致（禁止 `Date.now()` / `Math.random()` 进入 manifest）。

**Budget & truncation**:

- 必须支持 `maxBytes` 上界（默认建议 64KB）。
- 超限时以 deterministic 顺序裁剪低价值字段，并在 `meta.__logix` 中记录裁剪证据（dropped/truncatedArrays）。

### 5) RuntimeDebugEventRef → ActionRef 映射（Dynamic Trace 对齐）

**Represents**: Runtime→Studio 的事件侧如何定位 Action 定义。

**Rules**:

- 仅当 `event.kind === "action"` 时参与对齐：
  - `ActionRef.moduleId = event.moduleId`
  - `ActionRef.actionTag = event.label`
- `event.label` 必须等价于 dispatch 的 action `_tag`（必要时输入容错可接受 `type`，但输出语义以 `_tag` 为准）。

**Unknown action**:

- 若 `ActionRef` 在 `manifest.actions[]` 中找不到对应 `actionTag`，消费侧必须：
  - 标记为 `unknown/opaque`；
  - 保持时间线可用与后续事件不被破坏；
  - 不得把 unknown 误归并到其他 action。

## State Transitions

### A) 反射提取：Module → ModuleManifest

- **Input**: `AnyModule | ModuleImpl`（Loader/CI/试运行环境可动态 import）
- **Transition**: 从 actions map / reducers map / dev.source 提取结构摘要，按 budget 裁剪
- **Output**: deterministic JSON（`ModuleManifest`）

### B) 运行期：dispatch → Debug event → RuntimeDebugEventRef

- **Input**: action dispatch（事务内同步）
- **Transition**:
  - 生成 Debug 事件（`action:dispatch`）→ 投影为 `RuntimeDebugEventRef(kind="action")`
  - 保证 `moduleId/instanceId/txnId` 可用于回放与聚合
- **Output**: 可序列化事件引用（供 Devtools/Studio 消费）

### C) Studio/Devtools：RuntimeDebugEventRef(ActionRef) → ActionAnchor

- **Input**: `RuntimeDebugEventRef` + `ModuleManifest`
- **Transition**: 以 `ActionRef(moduleId, actionTag)` join `manifest.actions[]`
- **Output**: UI 可展示的 ActionAnchor（含 payload/reducer/source 的 best-effort 摘要）
