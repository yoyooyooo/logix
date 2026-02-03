# Feature Specification: DevServer Trace/Debug Bridge（102）

**Feature Branch**: `102-devserver-trace-bridge`  
**Created**: 2026-01-28  
**Status**: Done  
**Input**: 现有 DevServer 已能返回 `CommandResult@v1` 与 `dev.runChecks` diagnostics，但 Studio/Agent 仍缺少“运行中可解释链路”（trace/debug）能力：需要把 Logix 的 Slim Trace/诊断事件以 **可序列化、可预算、可关联 requestId** 的方式桥接到 WS event 流中，支持 UI 展示与回放定位。

参考跑道：`specs/092-e2e-latency-trace`、`specs/005-unify-observability-protocol`

## Goals / Scope

### In Scope

- 定义一套 DevServer 侧的 Trace/Debug 事件桥接协议：
  - event kind 命名与 payload 子集
  - 预算与截断策略（Slim、可序列化）
  - requestId/session 关联规则
- 为 `dev.run` 提供“可选 trace 流式输出”的能力（v1 先做 post-run stream，可向实时演进）：
  - 不要求默认开启（默认零成本/近零成本）
  - UI/Agent 可显式请求 trace（不请求则不产生额外成本）

### Out of Scope

- Devtools UI 实现细节（只定义协议与最小落点）
- Runtime 热路径大改（若需要更底层 hook，必须有 perf evidence 与单独裁决）

## Success Criteria _(mandatory)_

- Studio/Agent 能在一次 `dev.run` 请求中收到 trace 事件（Slim；允许 post-run stream），并在结束后拿到最终结果（response）。
- 事件 payload 全部 JsonValue-only，且在预算超限时可解释裁剪（不得爆炸）。

## Design Decision（v1）

- **选择**：扩展 `dev.run` 的 `params`（新增 `trace` 选项），不新增独立 method（避免形成“跑命令 vs 跑 trace”两条并行入口）。
- **生成来源**：trace 仍由 CLI（085）生成（通过 `--includeTrace`/`trace.slim.json`），devserver 只负责桥接与预算治理。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 请求内返回 trace（Priority: P0）

作为 Studio/Agent，我希望当我发起 `dev.run` 时可以显式请求 trace，并以 event chunks 的形式接收 `trace.slim.json` 的内容（JsonValue-only），用于 UI 展示与回放。

**Acceptance Scenarios**:

1. **Given** `dev.run` 的 argv 会产出 `trace.slim.json`（例如包含 `--includeTrace`），**When** 请求 `params.trace.enabled=true`，**Then** server 会推送 `dev.event.trace.started` + 0..N 条 `dev.event.trace.chunk` + `dev.event.trace.finished`，随后返回最终 response。

### User Story 2 - 预算超限可解释（Priority: P0）

作为 UI，我希望当 trace 超过预算时，server 不会爆炸或回传全文，而是确定性裁剪并在 `finished` 中给出 `truncated/dropped/bytes` 信息。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `dev.run` 的 `params` 必须支持 `trace` 选项（见 `contracts/public-api.md`），未开启时不发送任何 trace 事件。
- **FR-002**: 事件必须按同一 `requestId` 关联（复用 event 信封字段）。
- **FR-003**: v1 trace payload 以“JSON 文本 chunks”传输（string），避免依赖 trace 的内部结构（保持 Runtime/CLI 可演进）。
- **FR-004**: 若请求开启 trace 但实际没有可用 trace（例如命令未产出 `trace.slim.json`），必须发送 `trace.finished` 且 `available:false`（而不是 silent）。

### Non-Functional Requirements

- **NFR-001**: 预算治理必须可配置（maxBytes/chunkBytes），且默认值必须保守（避免大消息阻塞 WS）。
- **NFR-002**: 不要求实时：v1 允许在 CLI 完成后再读取并发送 chunks（post-run stream），但事件序列必须稳定。
