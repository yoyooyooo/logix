# logix-cli-agent · 合同摘要（可复制的最小口径）

> 说明：本文件是 **skill 自包含** 的“最小合同摘要”。它不依赖任何仓库内文档路径；真实行为以你本机的 `logix`/`logix-devserver` 输出为准。

---

## 1) Logix CLI（`logix`）

### 1.1 stdout：单行 JSON（`CommandResult@v1`）

`logix` 的 stdout 应是一行 JSON，可按以下字段做自动化判断：

```ts
type SerializableErrorSummary = {
  name?: string
  message: string
  code?: string
  hint?: string
}

type ArtifactOutput = {
  outputKey: string
  kind: string
  schemaVersion?: number
  ok: boolean

  // 二选一（或都没有）
  file?: string
  inline?: null | boolean | number | string | object | any[]

  // 预算/裁剪（可选）
  truncated?: boolean
  budgetBytes?: number
  actualBytes?: number

  // 可选增强（不同命令会用到）
  digest?: string
  reasonCodes?: string[]
  error?: SerializableErrorSummary
}

type CommandResultV1 = {
  schemaVersion: 1
  kind: 'CommandResult'
  runId: string
  command: string
  mode?: 'report' | 'write'
  ok: boolean
  artifacts: ArtifactOutput[]
  error?: SerializableErrorSummary
}
```

最小判定建议：

- `kind !== "CommandResult"`：视为非预期输出（需要人工介入）。
- `ok === true`：命令成功（但仍建议检查 `artifacts[*].ok` 是否全部为 true）。
- `ok === false`：读取 `error.code/message/hint` 给出可行动提示。

### 1.2 exit code（门禁语义）

- `0`：PASS / SUCCESS
- `2`：VIOLATION / USER_ERROR（参数/输入/门禁失败/可预期失败）
- `1`：INTERNAL（非预期失败/异常）

常见（可预期）错误码示例（出现时通常应视为 exit=2）：

- `CLI_INVALID_ARGUMENT`
- `CLI_INVALID_COMMAND`
- `CLI_MISSING_RUNID`
- `CLI_INVALID_INPUT`
- `CLI_ENTRY_NO_EXPORT`
- `CLI_ENTRY_IMPORT_FAILED`
- `CLI_HOST_MISSING_BROWSER_GLOBAL`
- `CLI_HOST_MISMATCH`
- `CLI_VIOLATION*`（门禁失败，`*` 代表可能的细分后缀）

### 1.3 `--entry` 路径解析

- `modulePath` 支持绝对路径或相对当前进程 cwd；常见实现等价于 `path.resolve(process.cwd(), modulePath)`。
- 脚本/CI 推荐：使用绝对路径，或固定在 repo root 执行命令（避免 cwd 漂移导致入口解析偏离）。

### 1.4 工件（artifacts）命名建议（通用约定）

不同命令会产生不同工件；常见文件名（用于检索/归档/对比）：

- `control-surface.manifest.json`
- `workflow.surface.json`
- `anchor.index.json`
- `trialrun.report.json`
- `trace.slim.json`（非门禁口径）
- `ir.validate.report.json`
- `ir.diff.report.json`
- `contract-suite.verdict.json`
- `contract-suite.context-pack.json`
- `manifest.diff.json`
- `patch.plan.json`
- `autofill.report.json`
- `transform.report.json`
- `writeback.result.json`

---

## 2) Host adapters（`--host browser-mock`）

当入口模块顶层访问 `window/document/navigator` 等浏览器全局时，Node 环境可能失败。

最小策略：

- 首次失败时查看 `error.code` 是否为 `CLI_HOST_MISSING_BROWSER_GLOBAL` 或 `CLI_HOST_MISMATCH`。
- 若是：在同一命令后追加 `--host browser-mock` 再试一次。
- 若仍失败：不要继续“猜测修复”；改为输出原因 + 需要真实浏览器/更强 runner 的结论。

---

## 3) DevServer（`logix-devserver`）

### 3.1 协议与信封（WS）

协议常量（v1）：

- `protocol: "intent-flow.devserver.v1"`

Request：

```ts
type DevServerRequest = {
  protocol: 'intent-flow.devserver.v1'
  type: 'request'
  requestId: string
  method: 'dev.info' | 'dev.workspace.snapshot' | 'dev.run' | 'dev.runChecks' | 'dev.cancel' | 'dev.stop'
  params?: unknown
  auth?: { token: string }
}
```

Response：

```ts
type DevServerResponse =
  | { protocol: 'intent-flow.devserver.v1'; type: 'response'; requestId: string; ok: true; result: unknown }
  | { protocol: 'intent-flow.devserver.v1'; type: 'response'; requestId: string; ok: false; error: { code: string; message: string; data?: unknown } }
```

Event：

```ts
type DevServerEvent = {
  protocol: 'intent-flow.devserver.v1'
  type: 'event'
  requestId: string
  event: { kind: string; payload?: unknown }
}
```

### 3.2 `logix-devserver call` 的 exit code（重要区别）

`logix-devserver call` 的进程 exit code **只反映协议调用是否成功**：

- `0`：`response.ok === true`
- `1`：`response.ok === false` 或连接/超时失败
- `2`：CLI 参数错误（缺少 `--requestId/--method` 等）

业务结果（门禁）要看 `dev.run` 返回里的 `result.outcome.exitCode`（见下文）。

### 3.3 `dev.info`

返回建议至少包含：

- `protocol`
- `version`
- `cwd`
- `capabilities: { write: boolean }`（默认只读；只有启动时显式允许才为 true）

### 3.4 `dev.workspace.snapshot`

用途：一次返回 “workspace 最小信息 + CLI 配置发现结果”。

入参（建议）：

- `params?: { maxBytes?: number }`（限制返回中 `cliConfig` 的预算；超限应裁剪并标记）

返回（建议最小）：

```ts
type WorkspaceSnapshot = {
  repoRoot: string
  cwd: string
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'unknown'
  devserver: { protocol: string; version: string }
  cliConfig:
    | { found: false }
    | { found: true; path: string; ok: true; config: unknown; profiles: string[]; truncated?: boolean }
    | { found: true; path: string; ok: false; error: { code: string; message: string } }
}
```

### 3.5 `dev.run`

入参（建议最小）：

```ts
type DevRunParams = {
  argv: string[]
  injectRunId?: boolean // default true；若 argv 未含 --runId，则注入 --runId <requestId>
  trace?: { enabled: boolean; maxBytes?: number; chunkBytes?: number }
}
```

返回（建议最小）：

```ts
type DevRunOutcome =
  | { kind: 'help'; text: string; exitCode: 0 }
  | { kind: 'result'; result: CommandResultV1; exitCode: 0 | 1 | 2 }
```

只读策略（安全硬门）：

- 当 `capabilities.write === false` 且 argv 试图写回（例如包含 `--mode write` / `--mode=write`），必须返回 `ok:false` 且 `error.code === "ERR_FORBIDDEN"`。

### 3.6 trace 事件桥接（`dev.event.trace.*`）

当 `dev.run params.trace.enabled === true` 且 CLI 结果包含 `trace.slim.json` 时，server 会发送 events：

- `dev.event.trace.started`
- `dev.event.trace.chunk`
- `dev.event.trace.finished`

建议 payload（JSON 文本 chunks）：

```ts
type TraceStarted = { schemaVersion: 1; kind: 'DevServerTraceStarted'; fileName: 'trace.slim.json' }
type TraceChunk = { schemaVersion: 1; kind: 'DevServerTraceChunk'; seq: number; text: string; bytes: number }
type TraceFinished = {
  schemaVersion: 1
  kind: 'DevServerTraceFinished'
  fileName: 'trace.slim.json'
  available: boolean
  truncated?: boolean
  totalBytes?: number
  droppedBytes?: number
}
```

### 3.7 `dev.runChecks`

用途：在 devserver 侧触发 `typecheck/lint/test`（一次性、非 watch）。

### 3.8 `dev.cancel` / `dev.stop`

- `dev.cancel`：取消某个 `targetRequestId` 的 in-flight 请求（若存在）。
- `dev.stop`：请求停止（通常用于协作式关闭；进程如何退出取决于实现）。
