# Data Model: Action Surface（actions/dispatchers/reducers/effects）与 Manifest

**Feature**: `specs/067-action-surface-manifest/spec.md`  
**Created**: 2026-01-01  
**Updated**: 2026-01-02

> 说明：本特性不涉及持久化存储；此处的 “Data Model” 指平台/运行时/Devtools 之间传输与对齐的可序列化 IR（Static）与事件引用（Dynamic Trace）。

## Entities

### 0) ActionToken（代码侧定义锚点，非协议）

**Represents**: action 的源码定义锚点（value-level symbol），用于 IDE 跳转/引用/重命名，以及为 manifest/事件提供确定性的 `actionTag` 与 payload 形态来源。

**Fields (conceptual)**:

- `_tag: string`（权威 tag；默认规则：`actionTag = key`）
- `payloadSchema: Schema`（用于区分 void/nonVoid，并支撑后续更强摘要）

**Rules**:

- `ActionToken` 本身不是 on-wire 协议字段（不可把函数/闭包/Schema 本体塞进 manifest）。
- `ActionToken._tag` MUST 与 `ActionRef.actionTag`、`ModuleManifest.actions[].actionTag` 一致；重命名（key 变更）视为协议变更（forward-only）。

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
- `effects?: ReadonlyArray<EffectDescriptor>`（可选：副作用摘要；不得承载闭包/Effect 本体）
- `digest: string`（仅由结构字段决定；用于 diff/契约守护）
- 可选沿用：`schemaKeys/logicUnits/source/meta/staticIr`（需满足 Slim + 可裁剪）

**Determinism rules**:

- 所有 key/数组必须有稳定排序。
- 输出必须可在相同输入下做到字节级一致（禁止 `Date.now()` / `Math.random()` 进入 manifest）。

**Budget & truncation**:

- 必须支持 `maxBytes` 上界（默认建议 64KB）。
- 超限时以 deterministic 顺序裁剪低价值字段，并在 `meta.__logix` 中记录裁剪证据（dropped/truncatedArrays）。

### 5) EffectSourceKey（副作用来源键，运行时派生）

**Represents**: 在 Devtools/诊断/manifest 中稳定标识一个 effect handler 的“来源键”（用于去重与解释，不要求跨版本稳定）。

**Fields**:

- `sourceKey: string`（必须可序列化；建议派生自 `logicUnitId + handlerId`，其中 handlerId 由运行时对函数引用分配）

**Rules**:

- 去重键为 `(actionTag, sourceKey)`：同一个 sourceKey 重复注册不得导致副作用翻倍。
- sourceKey 不依赖随机/时间；在相同输入/顺序下应 deterministic。

### 6) EffectDescriptor（Effect 定义摘要）

**Represents**: Manifest/诊断中的副作用摘要（用于展示与排错，不承载闭包/Effect 本体）。

**Fields**:

- `actionTag: string`
- `sourceKey: string`
- `kind: "declared" | "registered"`（declared 来自 `Module.make({ effects })`；registered 来自 `$.effect(...)` 的 setup 注册）
- `source?: DevSource`（可选）

**Validation rules**:

- `effects[]` 必须按 `(actionTag, sourceKey)` 稳定排序（字节级一致）。
- 禁止在此处输出不可序列化内容（函数/Effect/闭包）。

### 7) EffectRef（Effect 引用）

**Represents**: 在诊断/Devtools 中定位某个 effect handler 的稳定引用。

**Fields**:

- `moduleId: string`
- `actionTag: string`
- `sourceKey: string`

**Rules**:

- `EffectRef` 只包含可序列化字段；不得包含函数/Effect/闭包。
- 允许消费侧仅展示 `actionTag + sourceKey`，但 join/聚合时建议以三元组为键。

### 8) RuntimeDebugEventRef → ActionRef 映射（Dynamic Trace 对齐）

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
- **Transition**: 从 actions map / reducers map / effects map / dev.source 提取结构摘要，按 budget 裁剪；必要时通过受控试运行补齐 setup 注册的 reducers/effects keys
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
