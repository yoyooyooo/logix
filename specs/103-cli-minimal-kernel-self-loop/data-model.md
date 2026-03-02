# Data Model: 103-cli-minimal-kernel-self-loop

## 1. ControlCommand

- `schemaVersion`: number
- `kind`: `ControlCommand`
- `runId`: string
- `command`: string
- `input`: JsonObject
- `exec`: `{ mode, host, timeoutMs?, budgetBytes? }`
- `refs`: `{ instanceId }`

约束：`runId` 必填；`instanceId` 必须确定性可重放。

## 2. ControlEvent

- `schemaVersion`: number
- `kind`: `ControlEvent`
- `event`: enum
- `refs`: `{ runId, instanceId, txnSeq, opSeq, attemptSeq }`
- `payload`: JsonValue

约束：事件必须 Slim + 可序列化；字段排序稳定。

## 3. ControlState

- `schemaVersion`: number
- `kind`: `ControlState`
- `status`: `queued|running|pass|violation|error|cancelled`
- `counters`: `{ nextTxnSeq, nextOpSeq, retries }`
- `artifacts`: outputKey + digest

约束：状态迁移必须可追踪并可回放。

## 4. CommandResultV2

- `schemaVersion`: 2
- `kind`: `CommandResult`
- `runId`, `instanceId`, `txnSeq`, `opSeq`, `attemptSeq`
- `command`, `ok`, `exitCode`
- `reasonCode`, `reasonLevel`
- `reasons[]`
- `nextActions[]`
- `trajectory`
- `ext?`
- `artifacts[]`

约束：这是外部 Agent 的主消费对象；stdout 与落盘语义一致。

## 5. ExtensionManifestV1

- `manifestVersion`: `ext.v1`
- `extensionId`, `revision`
- `runtime`: `entry/apiVersion/sandbox`
- `hooks`: setup/onEvent/snapshot/restore/teardown/healthcheck
- `capabilities`: hostApis allowlist + net/fs policy
- `limits`: timeout/memory/queue

约束：manifest 不合法或不兼容必须拒载。

## 6. ExtensionStateV1

- `schemaVersion`: `ext-state.v1`
- `extensionId`, `revision`, `instanceId`
- `status`, `txnSeq`, `opSeq`, `failureStreak`
- `hookCursor`
- `persistedState`

约束：状态迁移失败要可回滚；不允许写入不可序列化数据。

## 7. VerifyLoopInputV1 / VerifyLoopReportV1

- `VerifyLoopInputV1`: `mode(run|resume)`、`instanceId`、`runId`、`previousRunId(resume 必填)`、`target`、`maxAttempts`。
- `VerifyLoopReportV1`: 在稳定标识链上增加 `mode/previousRunId`，并记录 `gateResults[]`、`verdict`、`exitCode`、`nextActions[]`。

约束：`verdict <-> exitCode` 必须一一对应，非法组合由 schema fail-fast 阻断。
