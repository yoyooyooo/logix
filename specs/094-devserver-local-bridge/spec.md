# Feature Specification: Dev Server Local Bridge（094 · Local WS / 最小特权）

**Feature Branch**: `094-devserver-local-bridge`  
**Created**: 2026-01-27  
**Status**: Done  
**Input**: 把 `docs/ssot/platform/contracts/04-devserver-protocol.md` 变成“可交付的工程闭环”：提供一个 Node-only 的本地常驻桥接进程（Dev Server），用于 Studio/Agent 以结构化协议与工作区交互（不再依赖长命令链 + 非结构化日志）。

## Context

`085 logix CLI` 已完成“一次性执行”的工具箱（Oracle/Gate/WriteBack/Transform），适合 CI/门禁与批处理。

但当消费者进入 **交互式** 场景（Studio/画布/Agent 迭代式修复）时，单次 CLI 的模式会产生两个系统性痛点：

1. **链路过长**：Agent 需要反复拼接/重复执行一堆命令才能“看见现状 → 生成补丁 → 写回 → 跑检查”。  
2. **缺少 Project Awareness**：没有常驻进程，就很难提供“当前工作区状态”的可解释快照（并且无法把 IO/检查的结构化结果作为协议返回）。

因此需要一个 **Dev Server（本地桥接进程）**：常驻、JsonValue-only、最小特权、可审计；在协议层复用 081/082/079/085 的输出与写回语义，避免产生第二事实源。

## Goals / Scope

### In Scope

- 交付一个 Node-only 的本地 WS 进程（默认只监听 `127.0.0.1`），协议固定为：
  - `protocol: "intent-flow.devserver.v1"`
  - request/response/event 信封（JsonValue-only）
- 交付一个 CLI 入口用于启动该进程（本 spec 选择新增 bin：`logix-devserver`）。
- v1 方法集合（最小可用）：
  - `dev.info`：返回版本/协议/当前 cwd 等基础信息（不包含非确定性时间戳）。
  - `dev.run`：在进程内调用 `@logixjs/cli`（085）的命令执行链路，返回与 CLI 同形的 `CommandResult@v1`（可选注入 `runId=requestId`，用于缩短调用链）。
  - `dev.runChecks`：按请求运行 `pnpm typecheck/lint/test` 并返回结构化结果（不回传大段日志；只返回摘要/截断预览）。
- 写回约束：任何写入必须降解为 082 的 `PatchPlan@v1` + `WriteBackResult@v1`（或等价），并遵守 079 的“只补缺失字段”与幂等语义。

### Out of Scope

- 不交付 Studio/画布 UI。
- 不开放远程访问（不做公网/跨机器协议、认证、加密）。
- 不实现文件 watch / 热更新（避免常驻副作用扩大；需要时另立 spec）。
- 不允许任何破坏性 git 操作（reset/clean/stash/restore/add/commit/push 等）。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 启动本地桥接进程并得到可机器消费的启动信息 (Priority: P0)

作为 Studio/Agent，我希望能启动一个本地 devserver，并用一次 JSON 输出获得连接信息（host/port/protocol），随后通过 WS 发送请求获取结构化结果。

**Acceptance Scenarios**:

1. **Given** 在仓库根目录执行 `logix-devserver --port 0`，**When** 进程启动成功，**Then** stdout 输出一行 JSON（`DevServerStarted@v1`），包含实际端口与协议标识，且后续不再污染 stdout。

### User Story 2 - 通过 WS 调用 CLI 能力，缩短“看→改→写→验”的命令链 (Priority: P1)

作为 Agent，我希望用 `dev.run` 直接得到 `CommandResult@v1`（同 085），从而在 WS 协议内完成“report-only → write-back → gate”的闭环，而不需要拼接几十次 shell 命令。

**Acceptance Scenarios**:

1. **Given** devserver 已启动，**When** 发送 `dev.run` 调用 `anchor autofill --mode report`（并允许注入 runId），**Then** 返回 `CommandResult@v1` 且包含 `patchPlan/autofillReport` artifacts。
2. **Given** `dev.run` 调用 `transform module --mode write`，**When** 再次以相同 ops 重复执行，**Then** 写回结果幂等（WriteBackResult 稳定且无新增 failed）。

### User Story 3 - 结构化运行质量门禁 (Priority: P2)

作为 Studio，我希望通过 `dev.runChecks` 运行 `typecheck/lint/test`，并拿到结构化结果用于 UI 展示，而不是解析非结构化日志。

**Acceptance Scenarios**:

1. **Given** 请求 `checks=["typecheck"]`，**When** 执行结束，**Then** 返回 `{ ok, exitCode, diagnostics[] }`，且 stdout/stderr 不被协议污染。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Dev Server MUST 只处理 JsonValue（JSON-safe），禁止返回 Error 实例/函数/循环引用。
- **FR-002**: Dev Server MUST 默认只监听 localhost，并提供 `--host/--port` 显式覆盖。
- **FR-003**: Dev Server MUST 实现 `dev.run` 并返回 `CommandResult@v1`（与 085 CLI 输出同形），且可选注入 `runId=requestId` 缩短调用链。
- **FR-004**: Dev Server MUST 实现 `dev.runChecks` 并返回结构化检查结果（摘要/截断预览；避免流式日志污染）。
- **FR-005**: Dev Server MUST 禁止破坏性 git 操作与自动提交链路（与仓库并行开发安全约束一致）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 启动输出 MUST 可机器解析且稳定（单行 JSON；字段可向前演进）。
- **NFR-002**: WS 响应 MUST 可解释：失败必须带稳定错误码与最小上下文（不依赖堆栈）。
- **NFR-003**: 任何潜在阻塞操作 MUST 可取消/可超时（默认保守超时；允许通过参数覆盖）。

## Success Criteria *(mandatory)*

- **SC-001**: `logix-devserver` 启动可用；`dev.info/dev.run/dev.runChecks` 均可在本仓库最小 demo（`examples/logix-cli-playground`）上跑通。
- **SC-002**: 通过 `dev.run` 能复用 085 的至少两条关键能力（例如 `anchor autofill` + `ir validate`），且返回 `CommandResult@v1`。
- **SC-003**: 对同一请求重复调用返回结果可解释且稳定（除非输入/源码变化）；写回类调用保持幂等。
