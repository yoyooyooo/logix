# Contracts: `CliDiagnostics@v1`（099）

> 目的：在不修改 `CommandResult@v1.error` 结构的前提下，输出机器可消费的“下一步怎么做”建议（action）。
> 本产物只用于 CLI/Agent 辅助，不作为门禁口径。

## Artifact 形态（建议）

在 `CommandResult@v1.artifacts[]` 中追加一条：

- `outputKey`: `cliDiagnostics`
- `kind`: `CliDiagnostics`
- `schemaVersion`: `1`
- `ok`: `true`
- `inline`: `CliDiagnostics@v1`

## 数据结构（v1）

```ts
type CliDiagnosticsV1 = {
  schemaVersion: 1
  kind: 'CliDiagnostics'
  diagnostics: ReadonlyArray<DiagnosticV1>
}

type DiagnosticV1 = {
  severity: 'error' | 'warning' | 'info'
  code: string
  message: string
  pointer?: { file: string; line?: number; column?: number }
  action?: { kind: 'run.command'; command: string }
  data?: unknown
}
```

## 用法约定（Host 场景）

当错误码为 `CLI_HOST_MISSING_BROWSER_GLOBAL` / `CLI_HOST_MISMATCH` 时：

- 至少输出 1 条 `DiagnosticV1`，且必须包含：
  - `action.kind === "run.command"`
  - `action.command` 为“原命令 + `--host browser-mock`”的可执行重跑命令

## 预算与确定性

- `CliDiagnostics@v1` 必须 JsonValue-only、稳定排序（如有多条 diagnostics，应按 `code` 或生成顺序固定排序）。
- 不得包含时间戳、随机数等非确定性字段。

