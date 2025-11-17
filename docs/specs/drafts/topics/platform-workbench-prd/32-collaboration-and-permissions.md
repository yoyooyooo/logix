---
title: 32 · 协作、权限与审计（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./10-requirements-and-mvp.md
  - ./31-data-model-and-contracts.md
  - ./40-protocols-and-apis.md
  - ../sdd-platform/00-overview.md
---

# 32 · 协作、权限与审计（Platform Workbench PRD）

> 目标：把“平台可交付”的协作底座拍清楚：谁能做什么、何时需要 Sign‑off、如何留痕、如何处理并发与冲突。

## 1. 基本原则（必须满足）

1. **Append‑Only Revision**：任何修改都产生新 revision；旧 revision 永远可回放与审计。
2. **显式审批（Sign‑off）**：关键资产从 “draft → signed_off” 必须有明确审批记录，AI 不能替代人类签字。
3. **可追溯（Traceability）**：任何产物（RuleSet/Patch/Run/Report）都能回指到其上游 revision 与 anchors。
4. **最小授权**：默认只授予“读取 + 运行”最小权限，写入与发布需要更高权限。
5. **统一审计模型**：所有变更与自动化动作（包括 Agent）都写入统一审计流。

## 2. 权限模型（建议：Project‑Scoped RBAC）

### 2.1 角色（Role）

- `owner`：项目所有者（可做任何事，含权限管理）
- `maintainer`：维护者（可发布、可签核、可配置规则/运行环境）
- `editor`：编辑者（可创建/编辑草案、发起 review，但不可签核）
- `viewer`：只读（可看 Specs/Runs/Reports）
- `runner`：可运行（可触发 run，但不可改 Spec/Rules）
- `agent`：自动化执行者（可生成建议/补丁/报告，但不可签核；其写入必须走“提案”通道）

> 注：角色只是“最小集合”；后续可拆更细（例如 `qa`、`designer`）但不要在 MVP 过度设计。

### 2.2 资源与动作（Resource × Action）

资源（最小）：

- `project`
- `featureRevision`
- `scenarioRevision`
- `ruleSetRevision`
- `run` / `runResult`
- `alignmentReport`
- `patch`（提案/待应用）
- `settings`（DevServer/Mock/Secrets/Integrations）

动作（最小）：

- `read`
- `createRevision`
- `proposeChange`（含 agent 提案）
- `applyPatch`（写入 workspace）
- `runScenario`
- `publish`（将草案标记为可消费）
- `signoff`
- `admin`（权限与关键设置）

## 3. Sign‑off 策略（建议：分层、可配置）

### 3.1 哪些对象需要签核

建议把签核对象限定为“会影响下游生成/运行/发布”的关键 revision：

- `FeatureRevision`：需求与约束（SPECIFY）是否完成
- `ScenarioRevision`：验收用例（Steps/Expectations）是否可执行
- `RuleSetRevision`：规则是否可生成代码/可运行（PLAN）
- `PatchProposal`：将写入代码的补丁（IMPLEMENT 的入口）

### 3.2 签核门禁（最小可行）

- 未签核的 `ScenarioRevision` 仍可 Run，但 RunResult 标记为 `unapproved_input`（避免误把结果当正式证据）。
- 未签核的 `RuleSetRevision` 不允许生成写回代码的 Patch（避免把未确认规划写入仓库）。
- Patch 必须先 Review 再 Apply（至少提供 human readable preview）。

> 允许团队按项目配置更严格门禁（例如：未签核不允许 Run）。

## 4. Review / 评论系统（对齐 anchors）

### 4.1 评论的“锚点化”

所有评论都必须绑定到 Anchor，避免“讨论漂移”：

- Spec：blockId / stepId
- Rule：ruleId（+ 可选 sourceAnchor）
- Code：file/span/contentHash
- Run/Trace：runId + (txnSeq/opSeq/spanId)

### 4.2 Review 流程（最小）

1. 提案产生：人类或 Agent 生成 `PatchProposal`
2. 绑定上下文：记录 `derivedFrom`（scenarioRevision/ruleSetRevision + anchors）
3. 审阅：评论/建议修改
4. 通过：`approved=true`，允许 apply
5. Apply 后自动触发：再解析/再运行（可选）并生成 Run/Report 证据链

## 5. 并发与冲突（Revision‑First）

### 5.1 乐观并发（推荐）

- 所有写入请求必须携带 `baseRevisionId`
- Backend 若检测到 base 不是最新：
  - 返回 `conflict`（带 latestRevisionId 与 diff 摘要）
  - UI 引导用户手动选择：rebase / discard / create new revision

### 5.2 Lock（仅在极少数高价值对象启用）

可以为 `RuleSetRevision` 的“网格高频编辑模式”提供可选锁（soft lock）：

- `lockOwner` + `expiresAt`
- 仅用于减少冲突频率，不作为安全边界

## 6. 审计（Audit Trail）

### 6.1 审计事件（最小字段）

- `eventId`
- `timestamp`
- `actor`: `{ kind: "user" | "agent"; id: string }`
- `action`: string
- `target`: `{ kind: string; artifactId: string; revisionId?: string }`
- `baseRevisionId?`
- `reason?`
- `diff?`（结构化 patch 或摘要）
- `result`: `{ ok: boolean; error? }`

### 6.2 Agent 的审计约束

- Agent 必须显式标注 `actor.kind="agent"` 与 `agentId/model/version`
- Agent 不得直接 `signoff`
- Agent 的写入默认落到“提案”对象（PatchProposal / DraftRevision），由人类决定是否发布/应用

## 7. 与系统设计的关系

- 数据模型：`derivedFrom`/`Anchor` 的最小结构见 `31-data-model-and-contracts.md`
- 协议：DevServer/Worker 的请求与诊断必须是可序列化数据（JsonValue），见 `40-protocols-and-apis.md`

