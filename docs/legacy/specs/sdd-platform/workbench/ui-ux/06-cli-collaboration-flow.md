---
title: 06 · CLI & Remote Platform Collaboration
status: draft
version: 1.0 (Extracted from Platform Shapes)
---

> **目标**：让“平台管 SDD 产物与协作，CLI 管本地代码与执行”成为一等架构，而不是事后外挂。

## 1. 职责分工：Platform = Source of Specs, CLI = Source of Code

**What**：平台与本地 CLI 明确分工，各自持有不同类型的“真理来源”。

- **平台负责**：
  - SDD 产物：FeatureSpec / ScenarioSpec / Blueprint / JSON Definition / Pattern / AlignmentReport 等；
  - 协作与权限：多用户编辑、Review/Sign-off、Audit Trail；
  - Agent Orchestration：调用 Spec/Architect/Task/Coder Agents 执行管线。
- **CLI/Dev Server 负责**：
  - 本地文件系统：TS/TSX 源码、配置、测试；
  - 本地 Tooling：Typecheck/Lint/Test/Build 等命令执行；
  - 语言服务：AST/IR/Graph 构建，提供给平台或本地编辑器。

## 2. 交互流 (Collaboration Flow)

- **首次接入**：
  - 开发者在项目根运行 `intent-cli init`：
    - 注册 projectId，与远程平台建立绑定；
    - 生成本地配置（包含平台 URL、Auth、项目根路径等）。
  - 平台侧创建 Project 实体，保存 SDD 资产。
- **日常工作**：
  - 平台通过 HTTP/WebSocket 下发 “计划好的变更”（例如 Blueprint 更新、IntentRule 编辑）给 CLI；
  - CLI 将其翻译为本地 AST Patch 或新文件写入，并执行相关检查；
  - CLI 将解析结果（IntentRule/Traits/Graph/Runtime meta）回传平台，用于 Universe/Galaxy/Alignment。

## 3. 在线/离线模式切换

**What**：支持开发者在完全离线或弱网环境下工作，平台在恢复连接后自动与本地状态对账。

- **离线模式**：
  - CLI 仍可解析代码生成本地 Graph/IntentRule/Traits；
  - 提供本地版 Universe/Galaxy/Alignment View（简化版 UI 或 CLI 输出）；
  - 所有对 Spec/Blueprint 的变更以 “Local Draft Changes” 形式缓存在本地（小型事件日志）。
- **重新上线**：
  - CLI 检测到平台可用，发起 Sync：
    - 将本地 Draft Changes 与平台 Spec/Blueprint Diff 对比；
    - 提供冲突解决界面（或自动开一个 Merge 请求，需人工 Review）。

## 4. “平台出主意，CLI 执行”的协作流

**What**：把 Agent/平台当“策划者”，本地 CLI 当“执行者”，中间用结构化任务连接。

- **平台侧**：
  - Architect/Task Agent 在浏览 Spec/Blueprint/Universe 时，生成一组 Task（例如“为 Order 模块补充 discount 逻辑”、“把 cityList 从 local 改为 source Trait”）；
  - Task 被挂到平台的 Task Board，关联到具体项目与分支。
- **本地侧**：
  - 开发者在 CLI 中运行 `intent-cli tasks pull`：
    - 拉取自己负责的任务列表，附带上下文（Spec/Scenario/Blueprint snippet）；
  - 运行 `intent-cli tasks apply <task-id>`：
    - CLI 调用本地 “Coder Agent + AST 工具” 在当前分支生成候选 patch；
    - 显示 diff，允许开发者编辑/确认；
    - 运行 typecheck/lint/test，结果反馈给平台。

## 5. 远程运行 / 本地代理：Sandbox & Alignment 联动

**What**：允许平台在云端运行 Sandbox/Alignment Lab，也允许本地 CLI 代理执行、上传结果，兼容不同数据敏感度场景。

- **云端模式**：
  - 平台接管 Sandbox 运行，使用远程 Runner 拉取代码快照（通过 Git 或 Artifact），在隔离环境中执行 Scenario；
  - 生成 AlignmentReport，直接挂在平台 UI 上。
- **本地代理模式**：
  - 组织不希望代码/数据离开内网时：
    - 平台仅下发 Scenario/Spec/Blueprint 的 ID 和运行配置给 CLI；
    - CLI 在本地执行 Sandbox Run，生成 RunResult + AlignmentReport（RunResult 口径见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）；
    - 只上传脱敏后的结构化指标（通过/失败、差异摘要、Graph 级 diff），不上传完整日志/数据。
