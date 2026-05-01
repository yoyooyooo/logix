# Inventory: Promotion And Naming Boundary

## Goal

把 promotion lane、structure facts、naming deferral 三件事拆开管理，避免正文里混写“结构已定”和“名字待定”。

## Promotion Lane Audit

| Lane | Current Role | Current State | Owner | Next Step |
| --- | --- | --- | --- | --- |
| `docs/proposals/**` | 承接分歧、方向与迁移建议 | 路由已经定义，runtime docs 收尾会继续导向 `docs/next/**` | `113` | 后续只清理真正仍有分歧的材料 |
| `docs/next/**` | 承接已收口但未升格的专题 | README 已在位，runtime followup bucket 已恢复 | `113` | 条目完成后逐项回写并删除 |
| `docs/ssot/**` | 新事实源 | runtime/platform 主干已经建立 | `113` | 继续压缩重复定义 |
| `docs/standards/logix-api-next-postponed-naming-items.md` | 命名后置桶 | 已列出 5 个当前命名项，并回链 owner 页面 | `113` | 保证只承接命名，避免结构争论回流 |

## Naming Deferral Ledger

| Item | Current Bucket | Structure Owner | Notes |
| --- | --- | --- | --- |
| `field-kernel` 对外命名 | `postponed naming` | `runtime/06` | 结构边界已经由 `runtime/06` 固定，名字继续后置 |
| `ModuleDef` 是否继续保留 | `postponed naming` | `runtime/01`, `platform/02` | 结构与实例化边界已定，名字后置 |
| strict static profile 命名 | `postponed naming` | `platform/02` | 静态化范围与命名分开 |
| `rootProviders` 命名 | `postponed naming` | `runtime/03`, `runtime/04` | 装配位置已定，名字后置 |
| `controller` 命名 | `postponed naming` | `runtime/08` | controller 是否保留只在 naming bucket 讨论 |

## Boundary Rules

- 结构已经定的内容只改 SSoT 或 standards
- 命名待定项只回写 `docs/standards/logix-api-next-postponed-naming-items.md`
- `docs/next` 只承接待升格专题，不承接命名清单

## Current Audit Notes

- `docs/next/2026-04-05-runtime-docs-followups.md` 已成为统一 promotion sink
- `runtime/06`、`runtime/08`、`platform/02` 当前都把命名未决项收回 naming bucket，没有继续开放结构争论
- boundary 示例锚点当前可用，当前重点是继续清空 followup 条目，不是修示例断链
