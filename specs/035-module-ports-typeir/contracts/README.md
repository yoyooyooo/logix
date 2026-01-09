# 035 Contracts: Module Ports & TypeIR

本目录固化 **035 的协议合同（Contract）**：用于平台/Workbench/CI/Agent 侧校验 `TrialRunReport.artifacts` 中导出的 **PortSpec/TypeIR** 工件。

## Artifact Keys（031 artifacts 槽位）

- `@logixjs/module.portSpec@v1` → `ModulePortSpec@v1`
- `@logixjs/module.typeIr@v1` → `TypeIr@v1`

> 说明：这些 payload 通过 `specs/031-trialrun-artifacts` 定义的 `TrialRunReport.artifacts` 输出，外层包裹 `ArtifactEnvelope`。

## Schemas

- `schemas/port-address.schema.json`
  - `PortAddress`：端口寻址基元（**不包含** instanceId；instanceId 属于 032/033 的语义层锚点）
  - `kind`：
    - `action` / `event` / `output`：用 `key`
    - `export`：用 `path`

- `schemas/module-port-spec.schema.json`
  - `ModulePortSpec@v1` payload
  - 必含：`moduleId` + `actions/events/outputs/exports`（数组可为空）

- `schemas/type-ir.schema.json`
  - `TypeIr@v1` payload（best-effort）
  - 必含：`moduleId` + `types[]`
  - 可选：`truncated` + `budget` + `roots/notes`

## Budget / Truncation Semantics（两层裁剪）

本特性存在 **两种**“截断/降级”，语义不同，消费者必须区分：

1. **031 ArtifactEnvelope 层（字节预算）**
   - `ArtifactEnvelope.truncated=true` 表示 artifact 的原始 value 超过字节预算，`value` 会被降级为 `{"_tag":"oversized","bytes","preview"}`。
   - 这种情况下 **不要**再按 035 payload schema 校验 `value`（因为它已不是 payload）。

2. **035 TypeIR payload 层（结构预算）**
   - `TypeIr.truncated=true` 表示 TypeIR 在内部预算下被裁剪（例如 `maxNodes/maxDepth`），但 payload 仍保持 schema 形状（仍可 JSON 序列化/可 diff）。
   - 平台在 `TypeIr` 缺失或 `truncated=true` 时，必须降级为基于 `ModulePortSpec` 的 key-level 校验（见 `specs/035-module-ports-typeir/quickstart.md`）。

## Versioning Strategy

- 外层 key 版本化：`@logixjs/module.*@vN` 是破坏性变更的唯一手段（不做兼容层）。
- payload 内仍保留 `protocolVersion: "v1"` 作为字段级演进钩子（新增字段默认向前兼容）。

## Determinism Requirements（硬约束）

- 稳定排序（key/path 排序）与稳定字段输出
- 禁止时间戳/随机/机器特异字段
- 如存在 `digest`：必须仅由稳定字段派生（禁止混入时间/随机）
