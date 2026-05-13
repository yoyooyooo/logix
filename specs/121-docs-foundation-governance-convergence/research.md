# Research: Docs Foundation Governance Convergence

## Decision 1: `docs-governance.md` 继续做唯一执行协议

- **Decision**: 所有路由、升格和回写规则继续只认 `docs/standards/docs-governance.md`。
- **Rationale**: 避免执行细则重新回流到根 README。

## Decision 2: 根入口与子树入口只做导航

**Decision**: `docs/README.md`、`docs/ssot/README.md`、`docs/adr/README.md`、`docs/standards/README.md`、`docs/next/README.md`、`docs/proposals/README.md` 只做导航与角色说明；`docs/ssot/runtime/README.md` 与 `docs/ssot/platform/README.md` 额外承担子树 owner 路由。
**Rationale**: foundation 层负责最短跳转，子树 README 负责 leaf owner 路由，职责边界更清楚。

## Decision 3: active proposal / next doc 必须带元数据和去向

**Decision**: active proposal 和 active next topic 都必须带 `owner`、状态与目标元数据；被消费后必须在原文补 `去向`。
**Rationale**: reviewer 需要直接判断一个临时专题当前归谁、将写到哪、是否已经完成回写。

## Decision 4: runtime docs followups bucket 由 `120` 统一分发

**Decision**: `docs/next/2026-04-05-runtime-docs-followups.md` 的 owner 固定为 `120-docs-full-coverage-roadmap`，用来分发 `121` 到 `129` 的批次顺序。
**Rationale**: 该 bucket 已升级为 group-level dispatch bucket，不再只属于 `113` 的历史收尾。
