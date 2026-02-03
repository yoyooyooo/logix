---
title: contracts/04 · Dev Server 本地桥接协议（Local WS / 最小特权）
status: living
---

# Dev Server 本地桥接协议（Local WS / 最小特权）

## 结论（TL;DR）

本文件裁决：平台 Studio ↔ 本地工作区 之间的“全双工桥接进程”必须通过 **版本化、可序列化、最小特权** 的本地协议暴露能力，避免把“读写源码/跑检查/解析 IR”做成不可审计的 ad-hoc 脚本。

定位：

- **CLI（085）**：一次性执行（Oracle/Gate/Transform/WriteBack），输出 `CommandResult@v1` 与版本化工件。
- **Dev Server（本章）**：常驻桥接（Project Awareness + Code↔IR + Diagnostics），通过本地 WS/RPC 暴露能力给 Studio/工具链。

硬约束：

- **JsonValue only**：禁止函数、Error 实例、循环引用；所有 payload 必须 JSON-safe。
- **最小特权**：默认不回传整文件内容，只回传 anchors/diagnostics/补丁摘要；写入必须带并发校验信息（hash/digest）。
- **工作区只读优先**：默认 report-only；任何写回必须是显式方法，并且返回可审阅产物（PatchPlan/WriteBackResult 或等价）。
- **禁止破坏性 git 操作**：Dev Server 不得执行 `git reset/clean/stash/restore` 等破坏性操作；也不应自动 `git add/commit/push`。

## 1) 协议标识与消息信封

协议标识（固定字面值）：

- `protocol`: `"intent-flow.devserver.v1"`

请求（request）：

```json
{
  "protocol": "intent-flow.devserver.v1",
  "type": "request",
  "requestId": "uuid",
  "method": "dev.info",
  "params": {}
}
```

响应（response）：

```json
{
  "protocol": "intent-flow.devserver.v1",
  "type": "response",
  "requestId": "uuid",
  "ok": true,
  "result": {}
}
```

错误响应（error）：

```json
{
  "protocol": "intent-flow.devserver.v1",
  "type": "response",
  "requestId": "uuid",
  "ok": false,
  "error": { "code": "ERR_INVALID_PARAMS", "message": "params.checks must be an array", "data": {} }
}
```

约定：

- `ok:false` 只用于“请求未被正确处理”的协议层失败（解析/校验/鉴权/取消/内部错误等）。
- 业务/检查失败应尽量结构化落在 `result` 内（例如 `dev.run` 的 `outcome.exitCode`、`dev.runChecks` 的 `results[*].ok/diagnostics`），避免把“失败当异常”塞到 `ok:false`。

事件（event，服务端推送）：

```json
{
  "protocol": "intent-flow.devserver.v1",
  "type": "event",
  "requestId": "uuid",
  "event": { "kind": "dev.event.check.started", "payload": { "check": "typecheck" } }
}
```

## 2) 方法集合（v1：本地桥接最小可用）

> 方法名与参数仅固定“对外语义与最小字段”；实现可扩展字段，但不得破坏兼容口径。

### 2.1 `dev.info`

目的：返回 devserver 自身的最小信息（用于 UI/Agent 自检与排障），且不得引入非确定性噪音字段。

返回（最小）：

- `protocol`: 固定字面量（`intent-flow.devserver.v1`）
- `version`: devserver 版本（来自 package.json）
- `cwd`: 进程启动目录（用于解释路径解析与相对路径）
- `capabilities: { write: boolean }`：能力位（v1 目前只暴露 write 是否允许；默认只读）

### 2.2 `dev.workspace.snapshot`

目的：一次返回 Studio/Agent 所需的最小工作区信息与 CLI 配置发现结果（零猜测启动）。

入参（建议）：

- `maxBytes?: number`：限制返回中 `cliConfig.config` 的预算（默认建议 `65536`）；超限必须裁剪并显式标记。

返回（最小）：

- `repoRoot: string`
- `cwd: string`
- `packageManager: "pnpm" | "npm" | "yarn" | "unknown"`
- `devserver: { protocol: string; version: string }`
- `cliConfig`：
  - `{ found: false }`
  - `{ found: true; path: string; ok: true; config: JsonValue; profiles: string[]; truncated?: boolean }`
  - `{ found: true; path: string; ok: false; error: { code: string; message: string } }`

约束（v1）：

- `cliConfig.config` 必须是 JsonValue-only（必要时做裁剪/清洗）。
- 不回传源码全文。

### 2.3 `dev.run`

目的：在 devserver 进程内运行一条 `logix` CLI 命令（085），并返回与 CLI 同形的 `CommandResult@v1`（或 help 文本）。

入参（建议）：

- `argv: string[]`（等价于执行 `logix <argv...>` 的 argv，不含 `node`/脚本路径）
- `injectRunId?: boolean`（默认 true；当 argv 未包含 `--runId` 时，自动附加 `--runId <requestId>`）
- `trace?: { enabled: boolean; maxBytes?: number; chunkBytes?: number }`
  - `enabled=true` 时启用 trace 事件桥接（v1 为 post-run stream；来源仍是 CLI 的 `trace.slim.json` 工件）
  - devserver 不主动注入 `--includeTrace`，客户端需在 argv 中显式包含（否则 `finished.available=false`）

返回（最小）：

- `outcome`: `{ kind: "help"; text: string; exitCode: 0 } | { kind: "result"; result: CommandResult@v1; exitCode: 0 | 1 | 2 }`

事件（trace，v1）：

- `dev.event.trace.started`：`{ fileName: "trace.slim.json" }`（payload 可扩展）
- `dev.event.trace.chunk`：`{ seq, text, bytes }`（JSON 文本 chunks；预算受 `maxBytes/chunkBytes` 限制）
- `dev.event.trace.finished`：`{ available, truncated?, totalBytes?, droppedBytes? }`

### 2.4 `dev.runChecks`

目的：按请求运行 typecheck/lint/test 等检查并返回结构化结果（避免流式日志污染 UI）。

入参（建议）：

- `checks: Array<"typecheck" | "lint" | "test">`
- `timeoutMs?: number`（单个 check 的超时；建议默认 `120000`）

返回（最小）：

- `results: Array<{ check: string; ok: boolean; exitCode: number; durationMs: number; preview?: string; diagnostics: Diagnostic[] }>`

约束（v1）：

- `preview` 必须截断（例如 `<= 4KB`），禁止回传全文日志。
- 若请求被取消，原请求返回 `ok:false` 且 `error.code === "ERR_CANCELLED"`；`error.data` 可选携带 `{ results }`（partial results）。

事件（建议）：

- `dev.event.check.started`：`{ check }`
- `dev.event.check.finished`：`{ check, ok, exitCode, durationMs }`
- `dev.event.request.cancelled`：`{}`（可选；用于 UI/Agent 及时更新状态）

### 2.5 `dev.cancel`

目的：取消一个 in-flight 的请求（按 requestId）。

入参（建议）：

- `targetRequestId: string`

返回（最小）：

- `{ cancelled: true, targetRequestId }`

失败（最小）：

- 目标不存在：`ERR_NOT_FOUND`

### 2.6 `dev.stop`

目的：请求 devserver 自行退出（用于 `stop`/CI 清理）。

返回（最小）：

- `{ stopping: true }`

## 2.7 可选鉴权（token）

当 devserver 以 `--token <token>` 启动时，请求必须携带：

- `auth: { token: string }`

否则返回：

- `ERR_UNAUTHORIZED`

## 2.8 错误码（v1 最小集合）

约定：错误码必须稳定（machine-first）；实现可扩展，但不得复用既有码表达不同语义。

- `ERR_INVALID_REQUEST`：信封/协议不合法（protocol/type/requestId/auth 等形状错误）
- `ERR_METHOD_NOT_FOUND`：未知 method
- `ERR_INVALID_PARAMS`：params 形状/值不合法
- `ERR_DUPLICATE_REQUEST_ID`：同一连接内重复 requestId
- `ERR_UNAUTHORIZED`：token 模式鉴权失败
- `ERR_FORBIDDEN`：被 server policy 拒绝（例如只读模式下试图执行 `--mode write`）
- `ERR_NOT_FOUND`：cancel 目标不存在等
- `ERR_CANCELLED`：请求被取消
- `ERR_INTERNAL`：实现内部错误（可包含 `error.data.cause`）

## 3) 统一数据结构（最小）

### 3.1 `Diagnostic`

- `severity`: `"error" | "warning" | "info"`
- `code`: string
- `message`: string
- `pointer?: { file: string; line?: number; column?: number }`（1-based；仅用于定位，不保证存在）
- `action?: { kind: "run.command"; command: string }`（可选；用于“下一步怎么做”）
- `data?: unknown`（JsonValue）

### 3.2 `Anchor`

- `file`: string
- `range?: { start: { line: number; column: number }; end: { line: number; column: number } }`（1-based）
- `contentHash?: string`

### 3.3 `FilePatch` / `TextEdit`（可选，用于 UI 预览）

`TextEdit`（1-based）：

- `range`: `{ start: { line: number; column: number }; end: { line: number; column: number } }`
- `newText`: string

`FilePatch`：

- `file`: string
- `kind`: `"create" | "update" | "delete"`
- `baseContentHash?`: string（并发检测）
- `edits?`: `TextEdit[]`
- `content?`: string

## 4) 与 CLI（085）/锚点系统（081/082/079）的关系

- Dev Server 不取代 CLI：CLI 用于一次性门禁与工件导出；Dev Server 用于 Studio/Agent 的常驻“运行/诊断/回写”交互。
- `dev.run` 的结果口径与 085 一致（`CommandResult@v1` + exit code 语义），避免双真相源与重复协议。
- 任何“写回源码”的能力必须能降解到 082 的 `PatchPlan@v1`/`WriteBackResult@v1`（可审阅、可门禁、可幂等），并遵守 079 的“只补缺失字段”与 Platform‑Grade 子集边界。

## vNext（Planned：增量扩展，不改变 v1 基线）

- Trace 结构化 items（当前 v1 为 JSON 文本 chunks；如需结构化需另立增量 spec）
- 更细粒度 allowlist/capabilities（在 101 的基础上扩展，但保持简单可审计）
