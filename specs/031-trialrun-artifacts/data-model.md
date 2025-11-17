# Data Model: TrialRun Artifacts（031：artifacts 槽位）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/031-trialrun-artifacts/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/031-trialrun-artifacts/plan.md`

> 本文件固化 031 的“artifacts 槽位”数据模型（协议层），不规定具体导出实现。

## Design Principles

- **JsonValue 硬门**：跨宿主输出必须可 JSON 序列化（见 005）。
- **确定性**：同输入重复导出结果一致（稳定排序、禁止随机/时间默认）。
- **按需路径**：正常运行路径零成本；artifacts 只在 trial-run/inspection 时计算。
- **单项失败不阻塞**：单个 artifact 失败不应导致整个 TrialRunReport 丢失。
- **概念域命名**：artifactKey 表达契约域，而非实现包名。

## Entity: ArtifactKey

**Purpose**：唯一标识一个版本化 artifact 协议（长期可存储、可 diff）。  
**Shape**：`"@scope/name@vN"`，其中 `name` 可包含 `.` 用于表达概念域（例如 `form.rulesManifest`）。

Examples：

- `@logix/form.rulesManifest@v1`
- `@logix/module.portSpec@v1`
- `@logix/module.typeIr@v1`

## Entity: ArtifactEnvelope

**Purpose**：以统一形态表达 artifact 的可用性、截断与失败原因（不让消费者猜）。  
**Canonical schema**：`specs/031-trialrun-artifacts/contracts/schemas/artifact-envelope.schema.json`

Fields（概要）：

- `artifactKey: ArtifactKey`
- `ok: boolean`
- `value?: JsonValue`：成功时的 payload（必须可序列化）
- `truncated?: boolean`：是否发生预算裁剪
- `budgetBytes?: number`：预算上限（可选）
- `actualBytes?: number`：裁剪前估算体积（可选）
- `digest?: string`：可选稳定摘要（不得含随机/时间）
- `error?: SerializableErrorSummary`：失败摘要（可选；复用 016）
- `notes?: JsonValue`：可选说明（严格 JsonValue）

## Entity: TrialRunArtifacts

**Purpose**：TrialRunReport 的 artifacts 槽位承载：`Record<ArtifactKey, ArtifactEnvelope>`。  
**Canonical schema**：`specs/031-trialrun-artifacts/contracts/schemas/trial-run-artifacts.schema.json`

语义：

- key 冲突必须被检测并以失败呈现（避免静默覆盖）。
- 导出失败/不可序列化必须以 `error` 标注（而不是让 JSON.stringify 抛错）。
- 截断必须显式（`truncated/budgetBytes/...`），平台可以据此降级。

## Artifact: `@logix/form.rulesManifest@v1`

**Purpose**：Form rules 的 Supplemental Static IR（规则清单 + warnings）。  
**Canonical schema**：`specs/031-trialrun-artifacts/contracts/schemas/form-rules-manifest-artifact.schema.json`

Payload：

- `manifest: RulesManifest`（复用 028）
- `warnings: string[]`

RulesManifest 事实源：

- `specs/028-form-api-dx/contracts/schemas/rules-manifest.schema.json`

## References

- JsonValue：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- SerializableErrorSummary：`specs/016-serializable-diagnostics-and-identity/contracts/schemas/serializable-error-summary.schema.json`
