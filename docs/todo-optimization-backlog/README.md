---
title: Logix Core 待办优化机会池
status: living
updatedAt: 2026-02-27
owner: pr/o021-module-api-unification
---

# Logix Core 待办优化机会池

> 本目录用于把优化想法以统一格式推进到可交付事实源。  
> 固定流程：`机会池 -> spec -> 实现 -> 证据 -> 回写`（forward-only，无兼容层）。

## 1. 目标与边界

- 本目录是 backlog 机会池，不替代 `specs/<id>/` 与 SSoT。
- 任何条目进入 `implement` 前，必须先完成 `spec` 阶段链接补齐。
- 触及 runtime 核心路径的条目，必须提供可复现 perf baseline 与诊断成本说明。

## 2. 固定推进机制（不可跳步）

| 阶段 | `status` | 必填链接 | 必填产物 |
| --- | --- | --- | --- |
| 机会池 | `pool` | `item` | `problem`、初始 `evidence` |
| spec | `spec` | `spec.spec`、`spec.plan`、`spec.tasks` | 可执行规范与实施计划 |
| 实现 | `implement` | `implementation[]` | 代码/文档改动入口（PR/commit/路径） |
| 证据 | `evidence` | `evidence.perf[]`、`evidence.diagnostics[]` | perf 对照、诊断成本或 N/A 说明 |
| 回写 | `writeback` | `writeback.ssot[]`、`writeback.userDocs[]` | SSoT/用户文档回写落点 |
| 完成 | `done` | 全部非空（允许显式 N/A） | `check` 全勾选 |

补充状态：

- `blocked`：被依赖或门禁阻塞，必须写阻塞原因与解除条件。
- `frozen`：主动冻结，不再推进，必须写冻结裁决。

## 3. backlog item 最小模板（硬要求）

- 新条目必须从 `items/_template.md` 复制。
- 五个章节必须保留且不可改名：`problem` / `evidence` / `design` / `budget` / `check`。
- 若条目不触及核心路径，`budget` 里必须显式写 `N/A` 原因，禁止留空。

## 4. 链接契约（Link Contract）

- `spec.spec`：`specs/<id>/spec.md` 或同等规范入口。
- `spec.plan`：`specs/<id>/plan.md` 或同等实施计划入口。
- `spec.tasks`：`specs/<id>/tasks.md` 或同等任务拆分入口。
- `implementation[]`：本次改动的 PR、commit、目录或文件路径。
- `evidence.perf[]`：perf 证据（核心路径必填；非核心路径可填 `N/A: <reason>`）。
- `evidence.diagnostics[]`：诊断成本或事件链证据（同上规则）。
- `writeback.ssot[]`：回写到 `docs/ssot/**`、`docs/specs/**` 的落点。
- `writeback.userDocs[]`：回写到 `apps/docs/**` 的落点（可显式 `N/A`）。

## 5. 状态回写规范

每次状态变更必须同步三处，避免并行真相源：

1. 更新条目文件 frontmatter：`status`、`updatedAt`、`links.*`。
2. 更新 `items/README.md` 对应行（状态 + 链接）。
3. 更新 `status-registry.json` 对应 entry（机器可读）。

推荐流转顺序：`pool -> spec -> implement -> evidence -> writeback -> done`。

## 6. 目录

- 条目索引：[`items/README.md`](./items/README.md)
- 状态注册表：[`status-registry.json`](./status-registry.json)

## 7. O 系列状态追踪（最小同步）

| ID | Priority | Status | Spec | Owner |
| --- | --- | --- | --- | --- |
| O-021 | P1 | writeback | [102-o021-module-api-unification](../../specs/102-o021-module-api-unification/spec.md) | pr/o021-module-api-unification |
