# Public API: DevServer Trace/Debug Bridge（102）

> 本文件裁决 devserver 的 trace/debug 事件桥接子集；实现后需要回写到协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`。

## 事件（event）命名（建议）

- `dev.event.trace.started`
- `dev.event.trace.chunk`
- `dev.event.trace.finished`

## `dev.run` 扩展参数（v1）

在 `dev.run` 的 params 中新增：

```ts
type DevRunParamsV1 = {
  argv: string[]
  injectRunId?: boolean
  trace?: {
    enabled: boolean
    maxBytes?: number     // default: 524288 (512KB)
    chunkBytes?: number   // default: 16384 (16KB)
  }
}
```

约束：

- v1 只桥接 `trace.slim.json`（来源：CLI 085 的 `--includeTrace`）。
- server 不强制注入 `--includeTrace`（避免未知命令报错）；客户端若要 trace，必须在 argv 中显式包含 `--includeTrace`（或使用已知会产出 trace 的命令链路）。

## trace 来源判定（v1）

server 以 `CommandResult@v1` 为唯一事实源，按以下规则判定是否存在可桥接的 trace：

1. 在 `result.artifacts[]` 中找到 `outputKey === "traceSlim"`（对应文件名 `trace.slim.json`）。
2. 若该 artifact 提供 `inline` 值：对 `inline` 做 stable stringify 后按 chunks 发送。
3. 若仅提供 `file`：server MAY 尝试解析 argv 的 `--out/--outRoot` 来定位文件并读取；若无法定位则视为 `available:false`。
4. 若 `inline` 为 oversized 占位（`{ _tag:"oversized", ... }`），则 `available:true` 且必须在 `finished.truncated=true` 中可解释。

## payload（v1：JSON 文本 chunks）

约束：

- JsonValue-only
- 必须携带 `requestId`（复用 event 信封字段）用于关联
- 必须遵守预算：`chunk.text` 必须按 `chunkBytes` 截断；总 bytes 超过 `maxBytes` 必须停止并标记 `truncated`

建议字段（可扩展）：

```ts
type TraceStartedV1 = {
  schemaVersion: 1
  kind: 'DevServerTraceStarted'
  fileName: 'trace.slim.json'
}

type TraceChunkV1 = {
  schemaVersion: 1
  kind: 'DevServerTraceChunk'
  seq: number
  text: string       // utf8 chunk
  bytes: number      // bytes for this chunk
}

type TraceFinishedV1 = {
  schemaVersion: 1
  kind: 'DevServerTraceFinished'
  fileName: 'trace.slim.json'
  available: boolean
  truncated?: boolean
  totalBytes?: number
  droppedBytes?: number
}
```
