# Feature Specification: CLI Host 抽象与 Browser Mock Runner（099）

**Feature Branch**: `099-cli-host-adapters`  
**Created**: 2026-01-28  
**Status**: Done  
**Input**: `085 logix CLI`（Node-only）在加载/试跑真实前端模块时，常会因 DOM/window 等浏览器 API 而失败；需要一套 Host 抽象，让 CLI/DevServer 在不引入第二事实源的前提下可选择宿主（Node / Browser Mock），并把“宿主不匹配”转成结构化诊断与可执行 action。

> ⚠️ 约束：085 的 `CommandResult@v1.error`（SerializableErrorSummary）目前没有结构化 `action` 字段。
> 本特性裁决：**错误码放在 `error.code`**，而 **可执行 action 以 `CliDiagnostics@v1` artifact 输出**（见 `contracts/cli-diagnostics.md`）。

## Context

- 085 已提供 `logix ir export / trialrun / gate / anchor / transform` 工具箱，但它默认假设 **Node-only**。
- `packages/logix-cli` 的入口加载使用 `tsx`，会执行模块顶层代码：浏览器专属依赖（`window/document` 等）会在“导出 IR 之前”就把流程打断。
- DevServer（094–098）复用 CLI 能力：Host 能力缺口会直接放大成 Studio/Agent 的交互阻塞点。
- `specs/README.md` 已明确该风险：需要 Host 抽象/Mock Layer 或 browser runner。

## Goals / Scope

### In Scope

1. 引入 **CLI Host 抽象**，覆盖至少两类宿主：
   - `node`（默认）：保持现状；
   - `browser-mock`（初版）：在 Node 进程内提供浏览器最小模拟（DOM/window 等），用于“能跑就跑”的受控试跑与 IR 导出。
2. Host 选择必须影响：
   - 程序/模块入口加载（`tsx import` 前后的全局注入/隔离）；
   - `trialrun` / `contract-suite run` 等需要执行入口的命令链路。
3. 当 Host 不匹配导致运行失败时，必须输出 **可行动** 的结构化诊断（而不是只抛异常）：
   - 稳定错误码：写入 `CommandResult@v1.error.code`（见 `contracts/error-codes.md`）；
   - 可执行 action：写入 `CliDiagnostics@v1` artifact（见 `contracts/cli-diagnostics.md`，其中 `action.kind === "run.command"`）。
4. 不能拖慢 CLI 冷启动：`logix --help` 与纯 Gate 命令不应被迫加载 browser-mock 依赖。

### Out of Scope

- 真·浏览器执行（Playwright/真实 Chromium）作为 **后续扩展**（需要单独 perf/稳定性论证与 CI 成本评估）。
- 让任意浏览器 API 都可用：初版只承诺“最小可用 + 可解释降级”，子集外必须可解释失败。
- 变更 Logix Runtime 热路径（本特性聚焦 CLI/DevServer 侧的宿主适配）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 浏览器依赖模块可在 CLI 下完成导出/试跑 (Priority: P0)

作为开发者/Agent，我希望当模块入口在顶层访问了 `window/document` 时，能通过 `--host browser-mock` 在 CLI 中完成 `ir export` 与 `trialrun`（或至少给出明确的降级与诊断），从而不被 Node-only 宿主卡死。

**Acceptance Scenarios**:

1. **Given** 一个入口模块顶层访问 `window`，**When** 运行 `logix ir export --host browser-mock ...`，**Then** 入口加载成功并输出 `CommandResult@v1`（`ok=true`），并落盘/输出既有 085 工件（`control-surface.manifest.json` 等）。
2. **Given** 同一入口，**When** 运行 `logix trialrun --host browser-mock ...`，**Then** 输出 `trialrun.report.json`，且 `CommandResult@v1.ok=true`。
3. **Given** 命令执行结束，**When** 在同一进程内连续运行另一个不带 `--host` 的命令，**Then** `globalThis.window/document/navigator` 不应残留（Host restore 生效）。

### User Story 2 - Host 不匹配时给出可执行下一步 (Priority: P0)

作为 Agent，我希望当我忘记指定 Host 导致失败时，CLI 能返回稳定错误码，并给出可执行 action（重跑命令或修复建议），减少“读堆栈→猜原因→再试”的循环。

**Acceptance Scenarios**:

1. **Given** 入口模块顶层访问 `window`，**When** 在默认 `node` host 下运行 `trialrun`，**Then** 输出 `CommandResult@v1`，且：
   - `result.ok === false`
   - `result.error.code === "CLI_HOST_MISSING_BROWSER_GLOBAL"`（或等价，见 `contracts/error-codes.md`）
   - `artifacts[]` 至少包含一条 `CliDiagnostics@v1`，其中 `diagnostics[].action.kind === "run.command"` 且 `action.command` 提示用 `--host browser-mock` 重跑（见 `contracts/cli-diagnostics.md`）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: CLI 必须新增 Host 选择入口（全局 flag：`--host`），默认值为 `node`（详见 `contracts/public-api.md`）。
- **FR-002**: Host 必须在“入口加载前”生效，并在一次命令执行结束后 **清理/恢复全局状态**（避免污染同进程后续命令）。
  - restore 必须在成功/失败/抛异常三种路径都执行（即使 `tsx import` 失败也必须 restore）。
- **FR-003**: `browser-mock` 必须提供最小全局子集（详见 `contracts/public-api.md` 的 “browser-mock：最小 globals（v1）”）。
- **FR-004**: `browser-mock` 依赖必须 lazy-load：只有当 `--host browser-mock` 且确实需要加载入口模块时才允许触发 dynamic import（`logix --help`、纯 Gate/Anchor/Transform 不得加载）。
- **FR-005**: Host 相关失败必须映射为结构化错误码（写入 `CommandResult@v1.error.code`；见 `contracts/error-codes.md`），不得只依赖堆栈字符串。
- **FR-006**: Host 相关失败必须输出可行动 diagnostics：以 `CliDiagnostics@v1` 作为 artifact 输出（见 `contracts/cli-diagnostics.md`），其中 `action.kind === "run.command"` 的口径与 097/DevServer 口径一致。

### Non-Functional Requirements

- **NFR-001**: 冷启动不退化：`logix --help` 与纯 Gate（`ir validate/diff`）不得强制加载 browser-mock 依赖。
- **NFR-002**: 输出确定性：Host 适配不得引入非确定性字段进入门禁工件口径（与 085 的 gating/non-gating 约束一致）。

## Dependencies

- 需要一个最小 fixture：包含“顶层访问 window”的入口模块，用于集成回归（放置位置与形式见 `plan.md`）。
  - Fixture 必须通过 TypeScript typecheck（建议 `declare const window: any`，避免引入 DOM lib 到整个包）。
