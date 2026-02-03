# Feature Specification: DevServer Project Awareness（100）

**Feature Branch**: `100-devserver-project-awareness`  
**Created**: 2026-01-28  
**Status**: Done  
**Input**: 现有 DevServer（094–098）主要是“运行命令并返回结构化结果”，但 Studio/Agent 仍缺少稳定的 **Project Awareness**：例如工作区根目录、`logix.cli.json` 配置发现与 profiles 列表、默认 entry 等，导致交互层仍需要拼接大量隐式约定与路径推导逻辑。

协议 SSoT（现状基线）：`docs/ssot/platform/contracts/04-devserver-protocol.md`

## Goals / Scope

### In Scope

1. 扩展 devserver 协议，新增 **只读** 的 Project Awareness 方法（不等价于 `dev.run`）：
   - 工作区/仓库根信息（repoRoot/cwd/包管理器等）
   - `logix.cli.json` 配置发现（路径 + 解析结果）与 profiles 列表
   - 默认 entry（来自 `logix.cli.json.defaults.entry`）的解析与回传（用于 Studio/Agent 默认选择）
2. 所有返回必须 JsonValue-only，且不回传源码全文。
3. 必须定义稳定的“可解释失败”口径：配置缺失/解析失败/entry 无效等属于 **业务结果**，应尽量落在 `result` 内（而不是 `ok:false`），避免把“可预期缺失”当作协议异常。

### Out of Scope

- 文件 watch、增量索引、依赖图/Module 图谱缓存（需要另立 spec；避免把常驻副作用一次做大）。
- 任意文件读取 API（`readFile` 等）：本特性只解决“配置/入口/工作区元信息”的最小问题。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Studio 获取工作区快照 (Priority: P0)

作为 Studio，我希望能用一次 `dev.workspace.snapshot`（或等价方法）拿到工作区根信息与 CLI 配置，从而 UI 可以“零猜测”地展示默认 entry 与可选 profiles。

**Acceptance Scenarios**:

1. **Given** devserver 已启动且 cwd 位于 repo 内，**When** 调用 `dev.workspace.snapshot`，**Then** 返回 `{ repoRoot, cwd, packageManager, cliConfig? }`（JsonValue-only）。
2. **Given** repo 内存在 `logix.cli.json`，**When** 调用 snapshot，**Then** 返回 `cliConfig.path` 与 `cliConfig.config`，且 `profiles` 列表可枚举。

### User Story 2 - 配置错误可解释 (Priority: P0)

作为 Agent，我希望当 `logix.cli.json` 不存在/解析失败/entry 不合法时，devserver 返回稳定错误码与 message（可行动），而不是把错误延迟到 `dev.run` 的一长串日志里。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 新增至少一个只读方法，用于返回 workspace snapshot（方法名以 `contracts/public-api.md` 为准）。
- **FR-002**: 必须提供 `logix.cli.json` 的发现与解析结果（不存在则明确 `found:false`）。
- **FR-003**: 必须提供 profiles 的枚举能力（即使为空数组）。
- **FR-004**: config/entry 相关失败必须使用稳定错误码（写入 `result.cliConfig.error.code` 或等价位置），避免要求客户端解析非结构化 message。

### Non-Functional Requirements

- **NFR-001**: 不回传源码全文；返回内容必须预算可控（必要时裁剪并标记 dropped）。
- **NFR-002**: 不引入第二事实源：配置解析与 defaults 合并规则必须与 085 的 `logix.cli.json` 口径一致（优先复用实现）。
