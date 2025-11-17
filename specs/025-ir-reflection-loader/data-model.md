# Data Model: IR Reflection Loader（IR 反射与试运行提取）

**Date**: 2025-12-24  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/025-ir-reflection-loader/spec.md`

> 本文件固化 025 的“可导出/可序列化”数据结构口径（Manifest / Static IR / Environment IR / Trial Run Report）。  
> 所有跨宿主负载必须满足 005 的 `JsonValue` 硬门：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`。

## Entity: ModuleManifest（Manifest IR）

**Purpose**: 平台化结构摘要（Studio/CI/Agent 消费），不依赖 AST；可复现、可对比。
字段命名与 `packages/logix-core/src/Module.ts` 的 `ModuleDescriptor` 对齐（`moduleId/actionKeys/logicUnits/schemaKeys/meta/source`）；Manifest 是可序列化投影，不包含 runtime 实例 `instanceId`。

**Fields（建议）**

- `manifestVersion: string`：例如 `"025"`（版本化，便于演进与兼容检查）。
- `moduleId: string`：模块身份（来自 `Module.id` / `ModuleTag.id`）。
- `actionKeys: string[]`：可见 action keys（稳定排序）。
- `schemaKeys?: string[]`：可见 schema keys（稳定排序；仅 keys，不包含 Schema 对象）。
- `logicUnits?: Array<{ id: string; kind: string; name?: string; derived?: boolean }>`：逻辑槽位摘要（稳定排序）。
- `source?: { file: string; line: number; column: number }`：dev source（可选）。
- `meta?: Record<string, JsonValue>`：平台链路/可追溯元信息（必须可序列化）。
- `staticIr?: StaticIR`：可选 Static IR（见下）；建议按开关/预算导出。
- `digest: string`：稳定摘要（由可导出字段稳定排序后生成，用于 CI drift detection）。

**Invariants**

- 必须可 `JSON.stringify`。
- 不得包含 `Date.now()` / `Math.random()` 等非确定性锚点。
- `meta` 仅允许稳定、可复现的元信息（禁止时间戳/随机/机器特异信息）。
- 数组/对象字段在导出前必须稳定排序（避免 diff 噪音）。
- `digest` 必须只由结构字段决定（不包含 `meta/source`），用于降低 CI diff 噪音并保证确定性。
- 输出体积必须有上界与裁剪策略（超限必须显式标注 `truncated` 或降级为 keys-only）。

## Entity: ModuleManifestDiff（契约防腐差异摘要 / CI 可机读）

**Purpose**: 对比两份 `ModuleManifest` 的差异，输出可机器消费（CI 阻断/告警）且可直接被 UI 渲染的结构化结果（FR-009）。

**Canonical shape（当前裁决）**

- 以 JSON Schema 为单一事实源：`specs/025-ir-reflection-loader/contracts/schemas/module-manifest-diff.schema.json`
- 关键字段（建议）：
  - `version`：diff 协议版本（例如 `"025"`）
  - `moduleId`：对比对象身份
  - `before/after.digest`：两份 Manifest 的 digest
  - `verdict`：`PASS | WARN | FAIL`（FAIL 表示存在 BREAKING）
  - `changes[]`：结构化差异条目（含 severity/code/pointer/details）
  - `summary`：按 severity 聚合的计数（便于 CI 与 UI 顶部摘要）

**Invariants**

- 输出必须确定性：同一输入必须产出同序/同内容的 `changes[]`（排序规则在实现中固化）。
- `pointer` 必须使用 JSON Pointer（便于 UI 高亮与定位字段）。
- `details` 必须是 JsonValue（005 硬门），避免把运行时对象图/闭包漏到输出里。

## Entity: StaticIR（声明式推导关系的静态依赖图）

**Purpose**: 描述模块内“可声明式推导的关系”（computed/link/source/check 等）的依赖图或等价摘要，用于平台可视化与 CI diff。

**Canonical shape（当前裁决）**

- 复用 `StateTrait.exportStaticIr` 的输出（`packages/logix-core/src/internal/state-trait/ir.ts`）：
  - `version: string`（当前为 `"009"`）
  - `moduleId: string`
  - `digest: string`（稳定）
  - `nodes: Array<{ nodeId; kind; reads[]; writes[]; writesUnknown?; policy?; meta? }>`
  - `edges: Array<{ edgeId; from; to; kind }>`
  - `conflicts?: JsonValue[]`（可选）

**Invariants**

- 必须可 `JSON.stringify`，且 digest 必须只由结构决定（稳定可对比）。
- `reads/writes` 路径必须使用 canonical field path（对齐 009 约束）。

## Entity: EnvironmentIR（依赖观测摘要）

**Purpose**: trial run 期间导出的“依赖观测摘要（best-effort）”，用于部署预检/自动编排/合规检测提示。

**Fields（建议）**

- `tagIds?: string[]`：观测到的 Tag 标识集合（稳定排序、去重）。
  - Tag → string 的规则：优先 `tag.id`，否则 `tag.key`（对齐 `packages/logix-core/src/Root.ts` 的 `tagIdOf`）。
- `configKeys?: string[]`：观测到的 Config keys（稳定排序、去重）。
- `missingServices?: string[]`：构建态缺失服务（可行动违规摘要；稳定排序、去重）。
- `missingConfigKeys?: string[]`：构建态缺失配置 key（可行动违规摘要；稳定排序、去重）。
- `runtimeServicesEvidence?: RuntimeServicesEvidence`：控制面证据（可选，复用 020 schema）。
- `notes?: JsonValue`：可选说明（必须可序列化）。

**Invariants**

- EnvironmentIR 是“观测到的集合（best-effort）”，不承诺穷尽；必须允许“未覆盖的分支/条件路径”。
- 违规摘要必须可行动：至少包含缺失服务 id 与/或缺失配置 key（并给出阶段提示）。

## Entity: TrialRunReport（受控试运行报告）

**Purpose**: 把“试跑结果 + 证据包 + IR 摘要”组装成平台可消费的单一输出。

**Fields（建议）**

- `runId: string`
- `ok: boolean`
- `manifest?: ModuleManifest`
- `staticIr?: StaticIR`
- `environment?: EnvironmentIR`
- `evidence?: EvidencePackage`：可选全量证据包（events + summary）
- `summary?: JsonValue`：面向平台的 slim 摘要（若不导出全量 events）
- `error?: SerializableErrorSummary | { message: string; type?: string }`

**Invariants**

- 必须可 `JSON.stringify`。
- 失败时仍应尽可能携带可解释 IR：至少包含 `environment` 的缺失依赖摘要；若能提取 `manifest` 则一并携带；提取失败或超限时允许省略对应字段。
- `evidence.summary` 若包含扩展字段（如 `environment`），必须保持 slim 且可裁剪。
- 必须能区分失败类型（至少：missing_service / build_violation / timeout / runtime_failure）。

## External Reuse（复用资产）

- **EvidencePackage / JsonValue**：复用 005/016/020 的 contracts 与口径（证据包协议不再发明新形态）。
- **RuntimeServicesEvidence**：复用 `specs/020-runtime-internals-contracts/contracts/schemas/runtime-services-evidence.schema.json`（控制面证据单一事实源）。
