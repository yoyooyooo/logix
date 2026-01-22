# Data Model: 085 Logix CLI（CommandResult@v1）

> 本文件描述 CLI 输出 envelope 的“概念数据模型”（人读），权威 schema 见：
>
> - `specs/085-logix-cli-node-only/contracts/schemas/cli-command-result.schema.json`

## Entities

### CommandResult@v1

- `schemaVersion`: number（当前为 `1`）
- `kind`: `"CommandResult"`
- `runId`: string（显式传入；禁止默认 `Date.now()`/随机）
- `command`: string（稳定的命令标识，例如 `ir.export` / `trialrun` / `anchor.index` / `anchor.autofill`）
- `mode?`: `"report" | "write"`（仅对存在写回语义的命令适用，例如 `anchor.autofill`）
- `ok`: boolean
- `artifacts`: `ArtifactOutput[]`（允许为空；失败也应尽可能给出部分工件与结构化原因）
- `error?`: `SerializableErrorSummary`（仅当 `ok=false`）

### ArtifactOutput

单个输出工件（可 stdout inline，也可落盘引用，或两者同时存在）：

- `outputKey`: string（命令内唯一、确定性；例如 `manifest` / `trialRunReport` / `anchorIndex` / `patchPlan` / `writeBackResult`）
- `kind`: string（工件类型名，例如 `AnchorIndex` / `PatchPlan` / `WriteBackResult`）
- `schemaVersion?`: number（若工件自带 schemaVersion，建议同步填）
- `ok`: boolean
- `file?`: string（落盘相对路径；建议相对 `--out` 目录）
- `inline?`: `JsonValue`（stdout inline 工件）
- `truncated?`: boolean（若超预算截断则为 `true`）
- `budgetBytes?`: number
- `actualBytes?`: number
- `digest?`: string（可选；用于稳定对比）
- `reasonCodes?`: `string[]`（用于 skip/fail 的可解释原因）
- `error?`: `SerializableErrorSummary`（仅当 `ok=false`）

## Artifact Kinds（本 spec 关注的常见工件）

> 仅描述“语义与命名”，不在此处新增 schema；如需 schema，优先复用既有 specs（例如 082 的 PatchPlan@v1）。

### `ControlSurfaceManifest` / `workflowSurface`

- Root IR 与其 slices（075/平台合同）；建议提供 `digest` 并与 budgets 口径对齐。

### `TrialRunReport`

- 受控试跑的结构化输出（用于证据链/诊断/对齐检查）；可选引用 Slim Trace artifact。

### `AnchorIndex@v1`

- Platform-Grade 子集索引（081）；对子集外形态必须显式 Raw Mode + reason codes。

### `PatchPlan@v1`

- 结构化写回计划（report/write 共用；优先复用 `specs/082-platform-grade-rewriter-mvp/contracts/schemas/patch-plan.schema.json`）。

### `WriteBackResult@v*` / `AutofillReport@v*`

- 写回执行结果与补全报告（079/082）；必须可 diff、可门禁、可解释。

### `IrValidateReport@v1`

- `ir validate` 的结构化门禁报告（reason codes + Raw Mode 统计 + 违规明细）；用于 CI gate 与 Agent 自证。

### `IrDiffReport@v1`

- `ir diff` 的稳定 diff 报告（added/removed/changed keys + reason codes）；用于 CI gate。

### `TransformReport@v1`

- `transform module` 的高层摘要（ops 状态与 reason codes），并与 PatchPlan/WriteBackResult 相互引用。

## Notes

- `CommandResult@v1` 只负责提供**稳定 envelope**；具体工件形态以各自的 `kind@vN` schema 为准（例如 `AnchorIndex@v1`/`PatchPlan@v1`/`WriteBackResult@v1`）。
- 任何非确定性信息（时间戳/随机/机器特异字段）不得进入默认输出；如确需采样/性能度量，应作为单独工件并显式 opt-in。
