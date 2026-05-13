# Quickstart: Docs Foundation Governance Convergence

## 1. 先看哪些页面

- `docs/README.md`
- `docs/ssot/README.md`
- `docs/ssot/runtime/README.md`
- `docs/ssot/platform/README.md`
- `docs/adr/README.md`
- `docs/standards/README.md`
- `docs/next/README.md`
- `docs/proposals/README.md`
- `docs/standards/docs-governance.md`

## 2. 先回答哪些问题

1. 一条内容该写到哪个 docs 层
2. active proposal / next topic 是否带 owner、target 和去向
3. 新 docs cluster 需要回写哪些入口

## 3. 推荐只读检查

```bash
rg -n '当前角色|当前入口|导航说明|升格门槛|回写动作|owner|target|last-updated|去向' docs/README.md docs/ssot/README.md docs/ssot/runtime/README.md docs/ssot/platform/README.md docs/adr/README.md docs/standards/README.md docs/next/README.md docs/proposals/README.md docs/standards/docs-governance.md docs/next/2026-04-05-runtime-docs-followups.md
```
