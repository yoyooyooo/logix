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

## Notes

- `CommandResult@v1` 只负责提供**稳定 envelope**；具体工件形态以各自的 `kind@vN` schema 为准（例如 `AnchorIndex@v1`/`PatchPlan@v1`/`WriteBackResult@v1`）。
- 任何非确定性信息（时间戳/随机/机器特异字段）不得进入默认输出；如确需采样/性能度量，应作为单独工件并显式 opt-in。

