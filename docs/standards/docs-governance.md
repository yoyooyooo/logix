---
title: Docs Governance
status: living
version: 1
---

# Docs Governance

## 目的

统一新 docs 根骨架下的文档路由，减少“该写哪、该查哪”的歧义。

## 路由规则

### `docs/proposals/`

放活跃收敛中的提案。

适用内容：

- 方案分歧
- API 重构
- 架构调整
- 文档迁移

### `docs/ssot/`

放新的事实源。

适用内容：

- 已收口
- 需要长期维护
- 后续会成为默认权威入口

### `docs/adr/`

放重大裁决日志。

适用内容：

- 顶层结构变化
- 架构路线选择
- 高影响破坏式改动

### `docs/standards/`

放跨主题规范。

适用内容：

- 命名规范
- 文档治理规范
- agent 路由规范

### `docs/next/`

放待升格的新文档。

适用内容：

- proposal 已形成方向
- 但还没升格到 `ssot / adr / standards`

### `docs/legacy/`

放冻结历史文档库。

规则：

- 可查阅
- 可引用
- 默认不再继续增量维护

## 默认写入顺序

1. 先写 `docs/proposals/` 或 `docs/next/`
2. 收口后升格到 `docs/ssot/`、`docs/adr/` 或 `docs/standards/`
3. 旧树只进 `docs/legacy/`
