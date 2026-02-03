# Public API: Dev Server Local Bridge（094）

本特性对外暴露两层契约：

1. **进程启动（CLI）**：`logix-devserver` 输出 `DevServerStarted@v1`（单行 JSON）。
2. **通信协议（WS）**：`intent-flow.devserver.v1`（JsonValue-only；request/response/event 信封）。

协议总裁决（平台 SSoT）：`docs/ssot/platform/contracts/04-devserver-protocol.md`

## 1) `logix-devserver`（CLI）

### 命令

```bash
# start（默认）
logix-devserver [start] --host 127.0.0.1 --port 0 [--maxMessageBytes <n>] [--shutdownAfterMs 30000] [--token <token>] [--stateFile <path>] [--allowWrite|--readOnly]

# governance（用于 Agent/CI 的可发现、自检、停止）
logix-devserver status [--stateFile <path>] [--timeoutMs <ms>] [--token <token>]
logix-devserver health [--stateFile <path>] [--timeoutMs <ms>] [--token <token>]
logix-devserver stop   [--stateFile <path>] [--timeoutMs <ms>] [--token <token>]
```

也提供一个“纯命令行 client”用于调用已启动的 devserver（便于 Agent 只用 shell 命令完成闭环）：

```bash
logix-devserver call [--url <ws://...>] [--stateFile <path>] [--token <token>] [--timeoutMs <ms>] [--includeEvents]
  --requestId <id> --method dev.info
logix-devserver call [--url <ws://...>] [--stateFile <path>] [--token <token>] [--timeoutMs <ms>] [--includeEvents]
  --requestId <id> --method dev.workspace.snapshot [--maxBytes <n>]
logix-devserver call --requestId <id> --method dev.info           # 省略 --url：从 state file 读取
logix-devserver call [--url <ws://...>] [--trace] [--traceMaxBytes <n>] [--traceChunkBytes <n>] --requestId <id> --method dev.run -- <logix argv...>
logix-devserver call [--url <ws://...>] --requestId <id> --method dev.runChecks --checks typecheck,lint,test [--timeoutMs <ms>]
logix-devserver call [--url <ws://...>] --requestId <id> --method dev.cancel --targetRequestId <id>
logix-devserver call [--url <ws://...>] --requestId <id> --method dev.stop
```

v1 扩展说明（已落地）：

- `--allowWrite|--readOnly`（互斥；默认只读）：见 `specs/101-devserver-safety-hardening/contracts/public-api.md`
- `dev.workspace.snapshot`：见 `specs/100-devserver-project-awareness/contracts/public-api.md`
- `dev.run params.trace` + `dev.event.trace.*`：见 `specs/102-devserver-trace-bridge/contracts/public-api.md`

环境变量（flags 优先）：

```text
LOGIX_DEVSERVER_STATE_FILE  # state file 路径
LOGIX_DEVSERVER_TOKEN       # token
```

### stdout（启动信息）

默认模式下 stdout 必须只输出 **一行 JSON**（后续不再写 stdout）：

```ts
export type DevServerStartedV1 = {
  readonly schemaVersion: 1
  readonly kind: 'DevServerStarted'
  readonly protocol: 'intent-flow.devserver.v1'
  readonly host: string
  readonly port: number
  readonly url: string
  readonly pid: number
  readonly stateFile?: string
}
```

启动失败时，stdout 仍必须输出 **一行 JSON**（用于机器可解析失败）：

```ts
export type DevServerStartFailedV1 = {
  readonly schemaVersion: 1
  readonly kind: 'DevServerStartFailed'
  readonly protocol: 'intent-flow.devserver.v1'
  readonly error: { readonly code: string; readonly message: string }
}
```

`--help` 例外：输出多行帮助文本，不输出 JSON。

### state file（`DevServerState@v1`）

state file 内容必须是单个 JSON 对象（稳定序列化），用于发现 `url/token` 等信息：

```ts
export type DevServerStateV1 = {
  readonly schemaVersion: 1
  readonly kind: 'DevServerState'
  readonly protocol: 'intent-flow.devserver.v1'
  readonly url: string
  readonly pid: number
  readonly cwd: string
  readonly host: string
  readonly port: number
  readonly token?: string
}
```

解析优先级（v1）：

- state file 路径：`--stateFile` > `LOGIX_DEVSERVER_STATE_FILE` > default（基于 repoRoot 的 tmp 路径）
- token：`--token` > `state.token` > `LOGIX_DEVSERVER_TOKEN`

### stdout（call 模式）

`call` 模式下 stdout 必须输出一行 `DevServerResponse` JSON（见下文 WS Response shape），并设置 exit code：

- `0`：`ok: true`
- `1`：`ok: false` 或连接失败
- `2`：CLI 参数错误（缺少 `--url/--requestId/--method` 等）

常见错误码（call 本地层）：

- `ERR_INVALID_ARGS`：本地参数/环境不满足（例如缺少 `--url` 且无可用 state file）
- `ERR_CALL_FAILED`：连接失败/超时/WS 异常等
- 其余错误码来自 devserver 响应（例如 `ERR_INVALID_REQUEST/ERR_UNAUTHORIZED/ERR_CANCELLED/ERR_INTERNAL` 等）

注意：`call` 的进程 exit code **只反映协议调用是否成功**；业务结果需要解析 stdout JSON：

- `dev.run`：看 `result.outcome.exitCode`
- `dev.runChecks`：看 `result.results[*].ok/diagnostics`

当提供 `--includeEvents` 时，stdout 仍必须保持单行 JSON，但允许额外附加：

- `events: DevServerEvent[]`（仅累积匹配 `requestId` 的 events）

### stdout（status/health/stop）

- `status/health`：输出 `DevServerStatus@v1`（单行 JSON；`ok:false` 时包含最小错误码）
- `stop`：输出 `DevServerStopResult@v1`（单行 JSON）

常见错误码（v1）：

- `status/health`：`ERR_STATE_NOT_FOUND` / `ERR_CALL_FAILED` / `ERR_INVALID_RESPONSE` /（转发）`ERR_UNAUTHORIZED` 等
- `stop`：`ERR_STATE_NOT_FOUND` / `ERR_CALL_FAILED` /（转发）`ERR_UNAUTHORIZED` 等

```ts
export type DevServerStatusV1 =
  | {
      readonly schemaVersion: 1
      readonly kind: 'DevServerStatus'
      readonly protocol: 'intent-flow.devserver.v1'
      readonly ok: true
      readonly state: DevServerStateV1
      readonly info: { readonly protocol: 'intent-flow.devserver.v1'; readonly version: string; readonly cwd: string }
    }
  | {
      readonly schemaVersion: 1
      readonly kind: 'DevServerStatus'
      readonly protocol: 'intent-flow.devserver.v1'
      readonly ok: false
      readonly state?: DevServerStateV1
      readonly error: { readonly code: string; readonly message: string }
    }

export type DevServerStopResultV1 =
  | {
      readonly schemaVersion: 1
      readonly kind: 'DevServerStopResult'
      readonly protocol: 'intent-flow.devserver.v1'
      readonly ok: true
      readonly stopped: true
    }
  | {
      readonly schemaVersion: 1
      readonly kind: 'DevServerStopResult'
      readonly protocol: 'intent-flow.devserver.v1'
      readonly ok: false
      readonly error: { readonly code: string; readonly message: string }
    }
```

## 2) WS 协议（`intent-flow.devserver.v1`）

### Request

```ts
export type DevServerRequest = {
  readonly protocol: 'intent-flow.devserver.v1'
  readonly type: 'request'
  readonly requestId: string
  readonly method: 'dev.info' | 'dev.workspace.snapshot' | 'dev.run' | 'dev.runChecks' | 'dev.cancel' | 'dev.stop'
  readonly params?: unknown
  readonly auth?: { readonly token: string }
}
```

### Response

```ts
export type DevServerResponse =
  | {
      readonly protocol: 'intent-flow.devserver.v1'
      readonly type: 'response'
      readonly requestId: string
      readonly ok: true
      readonly result: unknown
    }
  | {
      readonly protocol: 'intent-flow.devserver.v1'
      readonly type: 'response'
      readonly requestId: string
      readonly ok: false
      readonly error: { readonly code: string; readonly message: string; readonly data?: unknown }
    }
```

### Event

```ts
export type DevServerEvent = {
  readonly protocol: 'intent-flow.devserver.v1'
  readonly type: 'event'
  readonly requestId: string
  readonly event: { readonly kind: string; readonly payload?: unknown }
}
```

### 2.1 `dev.info`

返回（最小）：

- `protocol`: 固定字面量
- `version`: Dev Server 版本（来自 package.json）
- `cwd`: 进程启动目录（用于解释路径解析）
- `capabilities: { write: boolean }`：server policy（默认只读；`--allowWrite` 才允许写回）

### 2.2 `dev.workspace.snapshot`

一次返回 Studio/Agent 所需的最小工作区信息（repoRoot/cwd/包管理器）与 CLI 配置（若存在）。

- 入参：`params?: { maxBytes?: number }`
- 返回 shape：见 `specs/100-devserver-project-awareness/contracts/public-api.md`

### 2.3 `dev.run`

入参：

- `argv: string[]`：等价于执行 `logix <argv...>` 的 argv（不含 `node`/脚本路径）
- `injectRunId?: boolean`：默认 `true`；当 `argv` 未包含 `--runId` 时，自动附加 `--runId <requestId>`
- `trace?: { enabled: boolean; maxBytes?: number; chunkBytes?: number }`：可选；启用后 server 会桥接 `trace.slim.json` 到 events（见 `specs/102-devserver-trace-bridge/contracts/public-api.md`）

返回：

- `outcome`: `@logixjs/cli` 的 `RunOutcome`（通常是 `kind: "result"` + `CommandResult@v1`）

### 2.4 `dev.runChecks`

入参：

- `checks: Array<'typecheck' | 'lint' | 'test'>`
- `timeoutMs?: number`（可选；默认 120000）

返回（最小）：

- `results: Array<{ check: string; ok: boolean; exitCode: number; durationMs: number; preview?: string; diagnostics: Diagnostic[] }>`

### 2.5 `dev.cancel`

入参：

- `targetRequestId: string`

返回（最小）：

- `{ cancelled: true, targetRequestId }`

### 2.6 `dev.stop`

返回（最小）：

- `{ stopping: true }`

## v1 扩展索引（已落地）

- `dev.workspace.snapshot`：`specs/100-devserver-project-awareness/contracts/public-api.md`
- `capabilities.write` + `ERR_FORBIDDEN`（readOnly/allowWrite）：`specs/101-devserver-safety-hardening/contracts/public-api.md`
- `dev.run params.trace` + `dev.event.trace.*`：`specs/102-devserver-trace-bridge/contracts/public-api.md`
