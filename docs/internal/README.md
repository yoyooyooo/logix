---
title: Internal Docs Root
status: living
version: 7
---

# Internal Docs Root

本目录承接维护者视角的内部教程与临时方向稿。

## 当前角色

- `docs/internal/**` 只服务仓库维护者与核心设计者
- 本目录允许教学性与维护者视角内容
- 本目录不是 SSoT，不构成公开 API 的单点权威
- 稳定后的结论应升格到 `docs/proposals/**`、`docs/next/**`、`docs/ssot/**`、`docs/adr/**` 或 `docs/standards/**`

## 读法

- 要看当前权威事实，先回 `docs/ssot/**`
- 要看维护者视角下的用户 API 速览，先看本目录
- 若内部教程与 SSoT 冲突，以 SSoT 为准，并回头修本目录

## 当前入口

| 页面 | 主题 | 说明 |
| --- | --- | --- |
| [form-api-tutorial.md](./form-api-tutorial.md) | form 未来规划态用户视角教程 | 面向“先过一遍长什么样”的 walkthrough；当前只保留 canonical route 与 residue 回链，不代持 authority |
| [form-api-quicklook.md](./form-api-quicklook.md) | form 当前 API 速览 | 维护者快速跳转页，只保留一句话心智与回链入口 |
| [toolkit-candidate-ledger.md](./toolkit-candidate-ledger.md) | toolkit 候选台账 | 维护者持续追加的候选 ledger，不构成 authority |
| [verification-notes/](./verification-notes/README.md) | 验证排障笔记 | 维护者记录 runner、浏览器验收和本地/CI 差异；不替代 SSoT 或 spec verification notes |

## 升格说明

- 若一页开始承接稳定事实，应迁出到 `docs/ssot/**`
- 若一页开始承接待裁决方案，应迁出到 `docs/proposals/**`
- 若一页主方向已定且只剩收尾，应迁出到 `docs/next/**`

## 当前一句话结论

`docs/internal/**` 用来放维护者看的内部教程与速览页；它帮助快速过一遍未来用户视角，但不替代 SSoT。
