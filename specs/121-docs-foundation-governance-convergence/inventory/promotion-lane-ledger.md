# Promotion Lane Ledger

## Lane Rules

| Source | Target | Gate | Required Metadata | Exit Note | Required Writeback |
| --- | --- | --- | --- | --- | --- |
| `docs/proposals/**` | `docs/next/**` | 主方向收口，目标目录明确，只剩收尾 | `status / owner / target-candidates / last-updated` | 原 proposal 补 `去向` 和日期 | `docs/proposals/README.md`、`docs/next/README.md` |
| `docs/proposals/**` | `docs/ssot/**` / `docs/adr/**` / `docs/standards/**` | 事实或规则已经稳定，可进入默认权威入口 | `status / owner / target-candidates / last-updated` | 原 proposal 补目标页和日期 | 目标目录 README、必要时 `docs/README.md` |
| `docs/next/**` | `docs/ssot/**` / `docs/adr/**` / `docs/standards/**` | owner 与相邻事实页明确，只剩最终回写 | `status / target / owner / last-updated` | 原 next 页面补目标页和日期 | 目标目录 README、必要时子树 README、`docs/next/README.md` |

## Active Topic Ledger

| Path | Status | Owner | Target | Next Batch | Notes |
| --- | --- | --- | --- | --- | --- |
| `docs/next/2026-04-05-runtime-docs-followups.md` | active | `specs/120-docs-full-coverage-roadmap` | foundation readmes、runtime/platform owner pages、leaf facts | `122 / 123 / 124` | `121` 已完成，当前继续分发后续批次 |

## Audit Summary

- active next topic 已固定为 group-level dispatch bucket
- 当前无活跃顶层 proposal
- promotion lane 的 review 重点变成 owner、target、去向三项是否齐全
