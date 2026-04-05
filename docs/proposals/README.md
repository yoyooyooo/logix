---
title: Proposals
status: living
version: 2
---

# Proposals

本目录用于承接**待裁决的跨模块方案提案**。

定位约束：

- `docs/ssot/**`：新的事实源生长点。
- `docs/legacy/ssot/**`：历史权威基线与已裁决事实源快照。
- `docs/proposals/**`：尚未进入 SSoT 的提案、收口方案、重构方向与迁移建议。
- `docs/legacy/plans/**`：历史实施计划与执行编排。

使用规则：

- 提案文档不作为事实源；一旦被采纳，结论默认回写到新的 `docs/ssot/**`、`docs/adr/**`、`docs/standards/**` 或 `docs/next/**`。
- 提案优先解决“为什么改、改什么边界、哪些能力升降级、影响哪些文件”。
- 若需要查历史上下文，再回看 `docs/legacy/**`。
- 进入实施阶段后，再拆成新的执行计划或具体 `specs/<id>/**`。

命名建议：

- `YYYY-MM-DD-<slug>.md`

当前残余提案：

- 当前无活跃内容提案

已消费的顶层提案，内容已分流到：

- `docs/ssot/**`
- `docs/next/**`
- `docs/adr/**`
- `docs/standards/**`
