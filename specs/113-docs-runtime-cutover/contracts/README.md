# Contracts: Docs Runtime Cutover

本特性没有外部 API 合同，只有 docs 治理与页面职责合同。

## 1. Root Routing Contract

- `docs/README.md` 只做总导航
- `docs/ssot/README.md`、`docs/adr/README.md`、`docs/standards/README.md` 做子树导航
- `docs/proposals/README.md`、`docs/next/README.md` 只描述承接车道，不充当事实源

## 2. Governance Contract

- 路由、升格、回写的唯一执行协议是 `docs/standards/docs-governance.md`
- accepted ADR 只允许补导航或勘误元信息
- `legacy` 只查阅，不增量维护

## 3. Runtime Responsibility Contract

- runtime 01-05 各自只承接一个 core 主题
- runtime 06-09 与 platform 01/02 各自只承接一个 boundary / platform 主题
- 页面之间可交叉引用，不能重复定义同一规则

## 4. Naming Deferral Contract

- 结构结论留在 SSoT / standards
- 命名待定只留在 `docs/standards/logix-api-next-postponed-naming-items.md`

## 5. Promotion Contract

- 方向已定但未升格的事项进入 `docs/next`
- 被采纳并稳定的事实必须回写到 `docs/ssot`、`docs/adr` 或 `docs/standards`
