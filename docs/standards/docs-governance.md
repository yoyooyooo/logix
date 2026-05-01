---
title: Docs Governance
status: living
version: 6
---

# Docs Governance

## 目的

统一 docs foundation 的路由、升格和回写协议，保证写入路径、owner 路由和去向记录可审计。

## 单一权威

- `docs/standards/docs-governance.md` 负责路由、升格与回写规则
- `docs/README.md` 只负责目录分流和活跃专题入口
- `docs/internal/**` 只承接维护者视角的非权威材料
- `docs/proposals/**` 与 `docs/next/**` 只承接过渡材料

## Foundation 角色矩阵

| Page | Role | 最短跳转 |
| --- | --- | --- |
| `docs/README.md` | 根路由与活跃专题入口 | `proposals / next / internal / ssot / adr / standards / archive` |
| `docs/internal/README.md` | 维护者视角的内部教程与未来 API 预演入口 | 当前内部教程页 |
| `docs/ssot/README.md` | 稳定事实总入口 | `runtime / form / platform` |
| `docs/ssot/runtime/README.md` | runtime 子树导航与 owner 路由 | `01` 到 `10` |
| `docs/ssot/form/README.md` | form 子树导航与 owner 路由 | `00` 到 `04` |
| `docs/ssot/platform/README.md` | platform 子树导航与 owner 路由 | `01` 到 `02` |
| `docs/adr/README.md` | accepted ADR 根入口 | 关键 ADR 页面 |
| `docs/standards/README.md` | 跨主题规范入口 | governance / baseline / guardrails / naming bucket |
| `docs/proposals/README.md` | proposal lane 入口 | 活跃 proposal 与升格去向 |
| `docs/next/README.md` | active next topic 入口 | 活跃专题与下一批 writeback |

## 路由规则

| 目录 | 写什么 | 不写什么 |
| --- | --- | --- |
| `docs/proposals/**` | 主方向仍有分歧的提案、迁移建议、结构比较 | 稳定事实正文 |
| `docs/next/**` | 主方向已定、待升格的专题收尾 | 长期事实源 |
| `docs/internal/**` | 维护者视角的内部教程、未来 API 预演、临时方向稿 | 稳定事实正文、accepted 决策、长期权威入口 |
| `docs/ssot/**` | 已稳定、需要长期维护的事实 | 临时讨论或未收口方案 |
| `docs/adr/**` | 需要长期保存背景的重大裁决 | 叶子页事实正文 |
| `docs/standards/**` | 跨主题规范、护栏、命名桶 | 单个叶子页的专属事实 |
| `docs/archive/**` | 冻结历史材料 | 增量维护中的当前事实 |

## 默认写入顺序

1. 若目标是维护者视角的内部教程、未来 API 预演或临时方向稿，先写 `docs/internal/**`
2. 主方向仍有分歧时，先写 `docs/proposals/**`
3. 主方向已定、目标目录明确且只剩收尾时，进入 `docs/next/**`
4. 内容稳定后升格到 `docs/ssot/**`、`docs/adr/**` 或 `docs/standards/**`
5. 冻结历史材料只进 `docs/archive/**`

## 元数据契约

### Active Proposal

- 必填：`status / owner / target-candidates / last-updated`
- 被消费后，在原文补 `## 去向`，写明目标页和日期

### Active Next Topic

- 必填：`status / target / owner / last-updated`
- 被升格后，在原文补 `## 去向`，写明目标页和日期

## 升格门槛

| Source | Target | Gate |
| --- | --- | --- |
| `docs/proposals/**` | `docs/next/**` | 主方向收口，目标目录明确，只剩收尾 |
| `docs/proposals/**` / `docs/next/**` | `docs/ssot/**` | 事实稳定，owner 与相邻事实页明确 |
| `docs/proposals/**` / `docs/next/**` | `docs/adr/**` | 内容属于重大裁决日志，需要长期保留背景 |
| `docs/proposals/**` / `docs/next/**` | `docs/standards/**` | 内容属于跨主题规范，需要被反复引用 |
| `docs/internal/**` | `docs/proposals/**` / `docs/next/**` / `docs/ssot/**` / `docs/adr/**` / `docs/standards/**` | 内部材料已明确其真实角色，不再适合留在维护者预演区 |

## 回写动作

- 修改目标事实源正文
- 回刷目标目录 README 索引
- 若顶层导航变化，回刷 `docs/README.md`
- 若新增或调整 `docs/internal/**`，回刷 `docs/internal/README.md`
- 若子树入口变化，回刷 `docs/ssot/README.md` 与对应子树 README
- 在 proposal 或 next 文档中补去向，说明已升格到哪里
- 若 `docs/next/**` 仍有活跃专题，回刷 `docs/next/README.md`
- 为目标页补齐相邻 ADR、standards、SSoT 的最短跳转

## 新增 Docs Cluster 的最小回写面

| 变更类型 | 必回写文件 |
| --- | --- |
| 新增或删除 root lane | `docs/README.md`、本页、受影响的根 README |
| 新增 internal 页面 | `docs/internal/README.md`；若根入口变化，再回写 `docs/README.md` |
| 新增 runtime leaf page | `docs/ssot/runtime/README.md`、`docs/ssot/README.md`、相关 active next topic |
| 新增 form leaf page | `docs/ssot/form/README.md`、`docs/ssot/README.md`、相关 active next topic、受影响的 runtime boundary page |
| 新增 platform leaf page | `docs/ssot/platform/README.md`、`docs/ssot/README.md`、相关 active next topic |
| 新增 active next topic | `docs/next/README.md`、专题页元数据；若根入口变化，再回写 `docs/README.md` |
| 新增 active proposal | `docs/proposals/README.md` 与 proposal 页元数据 |

## 禁止事项

- 不在 `docs/archive/` 做增量维护
- 不让 `docs/internal/**` 伪装成 SSoT、ADR 或 standards
- 不让 `docs/proposals/` 或 `docs/next/` 长期充当事实源
- 不让 proposal 或 next 页面长期缺 `owner / target / 去向`
- 不把执行细则重新铺回 `docs/README.md`
- 不直接改 accepted ADR 的决策结论；若结论变化，新增 ADR
