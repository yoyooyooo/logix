# Inventory: Root Routing Audit

## Snapshot

- Date: 2026-04-05
- Scope: `docs/README.md`, `docs/proposals/README.md`, `docs/next/README.md`, `docs/ssot/README.md`, `docs/adr/README.md`, `docs/standards/README.md`, `docs/ssot/runtime/README.md`, `docs/ssot/platform/README.md`, `docs/standards/docs-governance.md`
- Goal: 确认根路由、治理协议、promotion lane 是否已经形成单一路由

## Current Map

| Path | Role | Current Evidence | Audit Result | Next Action |
| --- | --- | --- | --- | --- |
| `docs/README.md` | 根导航 | 只承接入口、裁决、规范与一句话结论 | pass | 保持只导航，不回填执行细则 |
| `docs/standards/docs-governance.md` | 唯一路由协议 | 已定义写入顺序、升格门槛、回写动作、叶子页模板、禁止事项 | pass | 后续正文改动继续只回这里收口协议 |
| `docs/ssot/README.md` | 新事实源根入口 | 已给出 runtime/platform 入口与相关 ADR、standards | pass | 继续补相邻页索引时只扩这里 |
| `docs/adr/README.md` | 重大裁决入口 | 已列关键 ADR 与回跳方向 | pass | 若新增 ADR，回刷索引 |
| `docs/standards/README.md` | 跨主题规范入口 | 已列 governance、guardrails、effect baseline、postponed naming | pass | 继续承接跨主题规范，不承接事实正文 |
| `docs/proposals/README.md` | 提案缓冲区 | 已说明 proposal 不充当事实源，并把 runtime 文档收尾路由到 `docs/next/**` | pass | 后续只做低优先级文案压缩 |
| `docs/next/README.md` | 待升格缓冲区 | 已定义进入门槛、回写动作、元数据要求，并列出当前活跃专题 | pass | 后续按专题完成度删条目或关闭专题 |
| `docs/ssot/runtime/README.md` | runtime 子树入口 | 已列 01 到 09 页面与当前优先入口 | pass | 后续跟随页面职责变化回刷 |
| `docs/ssot/platform/README.md` | platform 子树入口 | 已列 01/02 页面和 platform 边界说明 | pass | 后续只承接跨层结构事实 |

## Findings

### F1. runtime followup bucket 已恢复为单一承接入口

- `docs/next/2026-04-05-runtime-docs-followups.md` 已存在
- `docs/next/README.md` 已显式列出当前活跃专题
- 叶子页后续只需统一回指这一个 bucket

### F2. 根路由与治理协议已经分层完成

- `docs/README.md` 没有重新长出执行细则
- `docs/standards/docs-governance.md` 已经吸收写入顺序、升格与回写动作
- 这一层可以直接作为后续正文收口的执行协议

### F3. proposal lane 当前已基本稳定，剩余是低优先级文案压缩

- `docs/proposals/README.md` 已能把 runtime 文档收尾稳定导向 `docs/next/**`
- 后续继续检查是否出现“已收口但仍停在 proposal” 的叶子文档

### F4. 根路由层当前没有发现新的目录缺失

- `docs/README.md`、`docs/ssot/README.md`、`docs/adr/README.md`、`docs/standards/README.md`、`docs/ssot/runtime/README.md`、`docs/ssot/platform/README.md` 的互链均能落到现有路径
- 当前路由层未发现新的目录级缺口，后续重点转到正文职责与 wording 收口

## Execution Notes

- 当前推荐继续精修 proposal/next 的边界用词，再把注意力转回叶子页职责
- runtime/platform README 当前更像稳定入口，正文职责冲突主要在叶子页，不在 README 层
- 当前 root-route audit 的结论已足够支撑 Worker A 直接修改 README mesh 与 governance，无需再回头补目录级盘点

## Audit Commands

```bash
rg -n 'docs/(proposals|ssot|adr|standards|next|legacy)|\\]\\(' docs/README.md docs/proposals/README.md docs/ssot/README.md docs/adr/README.md docs/standards/README.md docs/next/README.md docs/ssot/runtime/README.md docs/ssot/platform/README.md
```

```bash
rg -n '默认写入顺序|proposal|next|ssot|adr|standards|legacy|升格|回写|交叉引用' docs/standards/docs-governance.md docs/README.md docs/proposals/README.md docs/next/README.md
```

## Audit Summary

- route audit 已确认根入口、子树入口、active next topic 与 governance 互链都能落到真实路径
- governance audit 已确认 `docs/standards/docs-governance.md` 继续承担默认写入顺序、升格、回写规则的唯一协议
- 当前 root route 的重点已从“补 bucket”切换为“继续压缩 wording，防止 proposal/next 漂移”
