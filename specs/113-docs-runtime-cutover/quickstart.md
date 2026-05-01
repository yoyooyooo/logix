# Quickstart: Docs Runtime Cutover

## 1. 先看执行合同

优先阅读：

- [spec.md](./spec.md)
- [plan.md](./plan.md)
- [research.md](./research.md)
- [docs/superpowers/plans/2026-04-05-docs-alignment-stages.md](../../docs/superpowers/plans/2026-04-05-docs-alignment-stages.md)

## 2. 当前收口顺序

1. 根路由与 governance
2. runtime core pack
3. runtime boundary + platform pack
4. `docs/next/2026-04-05-runtime-docs-followups.md` 统一承接收尾项
5. final route / terminology / scope 审计

## 3. 只读检查

```bash
rg -n 'docs/(proposals|ssot|adr|standards|next|legacy)|\\]\\(' docs/README.md docs/proposals/README.md docs/ssot/README.md docs/adr/README.md docs/standards/README.md docs/next/README.md docs/ssot/runtime/README.md docs/ssot/platform/README.md
```

```bash
rg -n '默认写入顺序|proposal|next|ssot|adr|standards|legacy|升格|回写|交叉引用' docs/standards/docs-governance.md docs/README.md docs/proposals/README.md docs/next/README.md
```

```bash
rg -n '来源裁决|相关规范|待升格回写|field-kernel|service-first|program-first|runtime\\.check|runtime\\.trial|runtime\\.compare' docs/ssot/runtime/*.md docs/ssot/platform/*.md docs/standards/logix-api-next-postponed-naming-items.md
```

## 4. 完成标准

- 根 README 与 governance 的职责边界稳定
- runtime / platform 页面职责可独立解释
- `docs/next` 有唯一 followup 承接桶
- runtime / platform 叶子页统一回指该 bucket
