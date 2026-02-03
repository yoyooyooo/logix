# Feature Specification: DevServer CLI Client（095 · Agent-first / 纯命令行闭环）

**Feature Branch**: `095-devserver-cli-client`  
**Created**: 2026-01-27  
**Status**: Done  
**Input**: 在 `094-devserver-local-bridge` 的基础上，把“Agent/Studio 纯命令行 client”打穿：不写 JS、不封 MCP，仅靠 `logix-devserver` 的子命令即可稳定调用本地 devserver，并保证机器输出（stdout）不被污染。

相关 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 纯命令行调用 devserver（Priority: P0）

作为 Agent，我希望能用一个短命令调用 `dev.info/dev.run/dev.runChecks` 并拿到可机器解析的一行 JSON，而不需要写 Node one-liner 或引入 MCP。

**Acceptance Scenarios**:

1. **Given** 已启动 devserver，**When** 执行 `logix-devserver call --requestId X --method dev.info`，**Then** stdout 输出一行 `DevServerResponse` JSON 且 exit code：`0(ok:true)/1(ok:false)/2(参数错误)`。
2. **Given** 已启动 devserver，**When** 执行 `logix-devserver call --requestId X --method dev.run -- anchor index ...`，**Then** 返回 `CommandResult@v1` 且 `runId` 可由 `requestId` 自动注入。

### User Story 2 - 省略 `--url`（Priority: P1）

作为 Agent，我希望不需要复制粘贴 `ws://...`；只要 devserver 启动过，就能从 state file 自动发现连接信息，显著缩短调用链。

**Acceptance Scenarios**:

1. **Given** `logix-devserver` 已启动并输出 `stateFile`，**When** 不传 `--url` 直接 call，**Then** CLI 从 state file 读取 url 并成功调用 devserver。

### User Story 3 - 事件不干扰 machine 输出（Priority: P2）

作为 Agent，我希望 devserver 可能推送 event，但 `call` 命令默认只输出最终 response；必要时可用开关把 events 累积到最终输出。

**Acceptance Scenarios**:

1. **Given** 服务端推送 event，**When** 执行 `logix-devserver call ...`，**Then** CLI 不因 event 提前退出，最终只输出 response。
2. **Given** `--includeEvents`，**When** 执行 `call`，**Then** 最终输出在 response 顶层包含 `events` 数组（单行 JSON，不污染 stderr）。

### Edge Cases

- devserver 未运行 / url 不可达：`call` 输出 `ok:false` 的错误响应并 exit code=1
- state file 缺失/不可读/不合法：当无法从 state file 推导 `--url` 时，`call` 输出 `ok:false`（例如 `ERR_INVALID_ARGS`）并 exit code=2
- event/response 乱序或同连接多消息：client 只认匹配 `requestId` 的 response

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: CLI MUST 提供 `logix-devserver call` 作为纯命令行 client（不依赖额外脚本）。
- **FR-002**: `call` MUST 能从 state file 自动解析 `url/token`（可用 flags/env 覆盖）。
- **FR-003**: `call` MUST 在存在 event 推送时仍能可靠拿到最终 response（按 `requestId` 关联）。
- **FR-004**: `call` MUST 提供 `--includeEvents` 将 events 累积进最终输出（单行 JSON）。

### Non-Functional Requirements (CLI 合规)

- **NFR-001**: machine 输出（stdout）必须且只能输出一行 JSON（除 `--help` 外）。
- **NFR-002**: exit code 语义必须稳定：`0=成功`、`2=用法/参数错误`、`1=其他失败`。
- **NFR-003**: 不得污染 `logix` 主 CLI 的 cold path（devserver 依赖与主 bin 解耦）。
- **NFR-004**: `call` 的进程 exit code 只反映“调用是否成功”；业务结果（如 `dev.run` 的 `result.outcome.exitCode`、`dev.runChecks` 的 `result.results[*].ok/diagnostics`）必须由消费者解析 stdout JSON 决策。

## Success Criteria _(mandatory)_

- **SC-001**: `packages/logix-cli/test/Integration/cli.devserver.smoke.test.ts` 覆盖 `stateFile` 与无 `--url` 调用通过。
- **SC-002**: `examples/logix-cli-playground` 的 devserver 快速体验脚本可按文档跑通。
