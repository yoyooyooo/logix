---
title: Docs Archive Cutover
status: accepted
date: 2026-04-04
---

# Docs Archive Cutover

## 决策

从 2026-04-04 起，`docs/` 采用新旧分层：

- `docs/archive/` 保存冻结历史文档库
- 新文档从新的根骨架重新生长

新根骨架为：

- `docs/proposals/`
- `docs/ssot/`
- `docs/adr/`
- `docs/standards/`
- `docs/next/`
- `docs/archive/`
- `docs/assets/`

## 原因

- 旧文档体量过大，逐篇清洗成本过高
- 新 proposal 主线已经形成，继续在旧树上修补会加剧口径缠绕
- 需要明确一条“冻结历史 + 重新生长”的路径

## 后果

- 历史文档默认去 `docs/archive/` 查
- 新文档默认写进新根骨架
- proposal 被采纳后，优先回写新的 `docs/ssot/`、`docs/adr/`、`docs/standards/` 或 `docs/next/`

## 不做的事

- 不逐篇兼容旧路径
- 不继续在 archive 树上做增量重写
