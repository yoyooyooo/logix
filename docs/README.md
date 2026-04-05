---
title: Docs Root
status: living
version: 2
---

# Docs Root

本目录已经完成一次文档 cutover。

当前主旋律：

- AI Native first
- runtime-first
- Effect V4 first

当前 docs 分成两层：

- 新骨架：承接后续继续生长的新文档
- `legacy/`：冻结历史文档库

## 根骨架

当前根目录只保留这些一级入口：

- `proposals/`
- `ssot/`
- `adr/`
- `standards/`
- `next/`
- `legacy/`
- `assets/`

## 路由规则

### 1. 看未来方向

先看：

- `docs/ssot/`
- `docs/adr/`
- `docs/standards/`

适用场景：

- 已经收口的新方向
- 正在执行的当前主线
- 跨主题约束与高层裁决

补充：

- `docs/proposals/` 现在主要只承接新的未决分歧
- 已消费提案不再停留在 proposal 目录里

### 2. 看当前新真相

先看：

- `docs/ssot/`

适用场景：

- 已收口并准备持续维护的新事实源

注意：

- 当前历史 SSoT 基线仍在 `docs/legacy/ssot/`
- 新 SSoT 从 `docs/ssot/` 重新生长，不再默认回旧树修补

### 3. 看重大裁决

先看：

- `docs/adr/`

### 4. 看跨主题规范

先看：

- `docs/standards/`

### 5. 看待升格新文档

先看：

- `docs/next/`

当前第一批生长点：

- 当前无固定子目录

### 6. 查历史材料

先看：

- `docs/legacy/`

这里放的是冻结历史文档库：

- 可查阅
- 可引用
- 默认不再继续增量维护

## 当前一句话结论

旧文档去 `legacy` 查，当前主线优先看 `ssot / adr / standards`，新文档按 AI Native + Effect V4 主旋律继续生长。
