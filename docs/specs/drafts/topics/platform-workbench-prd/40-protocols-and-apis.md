---
title: 40 · API / 协议草案（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./31-data-model-and-contracts.md
  - ./32-collaboration-and-permissions.md
  - ./33-alignment-and-diagnostics.md
  - ../../../sdd-platform/workbench/02-full-duplex-architecture.md
  - ../sandbox-runtime/15-protocol-and-schema.md
  - ../../../sdd-platform/impl/code-runner-and-sandbox.md
---

# 40 · API / 协议草案（Platform Workbench PRD）

> 目标：把“平台/Dev Server/Sandbox/Agent”之间的通道收敛成少数几类协议面，先把契约立住，再进入实现细节。

## 1. 协议面一览

1. **Studio ↔ Platform Backend（Remote API）**
   - 用途：资产 CRUD、版本化、审计、协作、任务编排
2. **Studio ↔ Dev Server（Local WS）**
   - 用途：解析/出码/本地检查/数字孪生（Full‑Duplex 的核心通道）
3. **Studio ↔ Sandbox Worker（postMessage）**
   - 用途：编译/运行/停止、日志/Trace/State 回传（Executable Spec Lab）
4. **Backend ↔ Agent Orchestrator（Job API）**
   - 用途：异步任务、进度事件、产物回写（可选先占位）

## 1.1 通用约束：版本化 + 可序列化 + 最小特权

- **版本化**：所有跨进程/跨端协议必须带 `protocolVersion`，并可协商降级。
- **可序列化**：消息体必须是 JsonValue；禁止传递函数、Error 实例、循环引用。
- **最小特权**：Dev Server/Agent 返回的内容必须“刚刚好”，默认不回传整文件内容，只回传 anchors/diagnostics/必要片段摘要。

### WS 消息信封（建议）

```json
{
  "protocol": "intent-flow.devserver.v1",
  "requestId": "uuid",
  "type": "request",
  "method": "dev.parseIntentRules",
  "params": {}
}
```

```json
{
  "protocol": "intent-flow.devserver.v1",
  "requestId": "uuid",
  "type": "response",
  "ok": true,
  "result": {}
}
```

```json
{
  "protocol": "intent-flow.devserver.v1",
  "type": "event",
  "event": { "kind": "dev.event.diagnostics", "payload": {} }
}
```

### Error（建议）

```json
{
  "ok": false,
  "error": {
    "code": "ERR_PARSE_FAILED",
    "message": "failed to parse file",
    "data": { "file": "src/..." }
  }
}
```

## 2. Studio ↔ Backend：最小 REST（占位）

> MVP‑1/2 最小集合：Feature/Scenario/RuleSet/Run/Report。

- `GET /projects/:projectId/features`
- `POST /projects/:projectId/features`（创建 FeatureRevision）
- `GET /scenarios/:scenarioId/revisions/:revisionId`
- `POST /scenarios/:scenarioId/revisions`（创建 ScenarioRevision）
- `POST /rulesets/:ruleSetId/revisions`（创建 RuleSetRevision）
- `POST /runs`（创建 run，返回 runId；RunResult 可后置上传）
- `POST /runs/:runId/result`（上传 RunResult）
- `POST /runs/:runId/report`（上传/生成 AlignmentReport）

协作与审计（MVP 占位）：

- `POST /revisions/:revisionId/signoff`
- `GET /audit?artifactId=...`

## 3. Studio ↔ Dev Server：本地 WS（Full‑Duplex 核心）

> 该通道负责把 “Repo/TS/类型/解析器” 暴露为平台可消费能力；协议应以“请求/响应 + 事件流”组织。

### 3.1 基础能力

- `dev.listModules`：列出可解析的 Module/Logic 清单（含 ids、文件路径、exports）
- `dev.parseIntentRules`：解析某个逻辑文件/符号 → IntentRule[] + anchors + diagnostics
- `dev.generatePatchFromRules`：输入 RuleSetPatch → 输出 AST Patch（文件级 diff）+ diagnostics
- `dev.applyPatch`：将补丁写入工作区（返回写入结果与文件摘要）
- `dev.runChecks`：按请求运行 typecheck/lint/test（返回结构化诊断，避免流式 log 污染 UI）

#### 3.1.1 `dev.parseIntentRules`（建议形状）

请求：

- `entry`: `{ file: string; exportName?: string }`
- `options`: `{ includeGraybox?: boolean; includeRaw?: boolean; includeAnchors?: boolean }`

响应（最小）：

- `rules`: `IntentRule[]`
- `anchors`: `Array<{ ruleId: string; anchor: { file: string; span?; contentHash? } }>`
- `diagnostics`: `Diagnostic[]`

> 解析边界与“白盒子集”以 `../../../sdd-platform/impl/README.md` 为准；协议只要求能回传：规则投影 + 锚点 + 诊断。

#### 3.1.2 `dev.generatePatchFromRules`（建议形状）

请求：

- `base`: `{ ruleSetRevisionId: string; workspaceRevision?: string }`
- `patch`: `{ ops: Array<...> }`（对 RuleSet 的结构化增删改）

响应：

- `patch`: `FilePatch[]`（文件级 diff / edits）
- `preview`: `{ summary: string; affectedFiles: string[] }`
- `diagnostics`: `Diagnostic[]`

#### 3.1.3 `dev.applyPatch`（建议形状）

请求：

- `patch`: `FilePatch[]`

响应：

- `applied`: boolean
- `fileSummaries`: `Array<{ file: string; bytesWritten: number; contentHash: string }>`
- `diagnostics`: `Diagnostic[]`

#### 3.1.4 `Diagnostic`（最小）

- `severity`: `"error" | "warning" | "info"`
- `code`: string
- `message`: string
- `anchors?`: `Anchor[]`（推荐复用 `31-data-model-and-contracts.md` 的统一锚点结构；至少包含 `code` 锚点）
- `data?`: JsonValue（可选：结构化附加信息，用于 UI 提示或 debug）

#### 3.1.5 `FilePatch` / `TextEdit`（建议形状）

> 目标：让补丁既可机器应用，也可在人类界面中预览；MVP 阶段优先“结构化文本编辑”，不强行引入 AST Patch 作为协议层唯一形态。

`TextEdit`（行列为 1‑based）：

- `range`: `{ start: { line: number; column: number }; end: { line: number; column: number } }`
- `newText`: string

`FilePatch`：

- `file`: string
- `kind`: `"create" | "update" | "delete"`
- `baseContentHash?`: string（用于并发检测；不匹配则拒绝 apply，返回 diagnostics）
- `edits?`: `TextEdit[]`（`kind="update"` 时必填）
- `content?`: string（`kind="create"` 时可用；与 `edits` 二选一）

> 说明：
> - `kind="delete"` 默认不在 MVP 支持（除非用户显式确认）；平台侧只作为协议占位。
> - `contentHash` 建议使用 stable hash（例如 sha256），避免把文件全文回传给平台。

### 3.2 事件流（建议）

- `dev.event.diagnostics`：解析/检查诊断增量
- `dev.event.workspaceChanged`：文件变更（用于数字孪生刷新）
- `dev.event.moduleGraphUpdated`：模块拓扑更新（Universe 信号）

> 具体“可解析子集/符号表/白盒链条”约束以 `../../../sdd-platform/impl/README.md` 为准，协议层只保证可传递 anchors 与 diagnostics。

## 4. Studio ↔ Sandbox Worker：消息协议（引用上游）

Worker 通道建议直接复用 `@logix/sandbox` 的协议定义（见 `../sandbox-runtime/15-protocol-and-schema.md`），本 Topic 只追加“与 Spec/Rule 的锚点对齐”要求：

- `RunConfig` 必须包含：
  - `scenarioRevisionId`
  - `ruleSetRevisionId?`
  - `intentId/stepId` 映射（若支持 UI_INTENT）
- `RunResult` 必须包含：
  - `runId`（由 host 分配或由 worker 回传，但必须稳定）
  - `txnSeq/opSeq`（稳定递增，便于 diff）
  - traces/logs 中可携带 `ruleId/intentId/stepId`（至少占位）

> 额外建议：Worker 的事件流应允许“部分结果”落地（例如 compile failed 也要有结构化错误与 partial logs），以支持 UI 恢复与诊断。

## 5. Backend ↔ Agent Orchestrator：任务协议（占位）

最小诉求：

- `POST /jobs`：创建任务（输入 Context Pack + 目标产物类型）
- `GET /jobs/:jobId/events`：拉取/订阅进度事件（plan/tasks/patch/testResult）
- `POST /jobs/:jobId/artifacts`：回写产物（如新 revision 或 patch）

> Agent 的“最小特权上下文”与行为边界以 `../../../sdd-platform/agents/agent-orchestration.md` 与 `../sdd-platform/00-overview.md` 为上游约束。
