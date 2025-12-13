# 004 · References

本目录用于沉淀 `specs/004-trait-bridge-form` 的辅助材料（非主规范正文），包括：

- 背景对齐与“放置决策”（哪些领域应归属 Form、哪些应抽成独立领域包、哪些仅需 Module+Logic 最佳实践）
- Query 领域的平行规划（与 Form 同粒度，用于压测链路是否对齐）

## Index

- `00-trait-stack-narrative.md`：Trait/StateTrait → Domain（Form/Query）→ UI（React）链路叙事（自底向上）
- `01-domain-placement.md`：领域放置决策（Form vs 独立领域包 vs 最佳实践）
- `02-query-domain-plan.md`：Query 领域规划（定位/US/FR-Qxx）
- `03-query-data-model.md`：Query 数据模型（QuerySnapshot/keyHash/invalidate/ui）
- `04-query-quickstart.md`：Query Quickstart（搜索 + 联动示例）
- `05-query-tanstack-integration.md`：`@logix/query` × TanStack Query 集成契约（各司其职）
- `06-form-business-api.md`：`@logix/form` 完整业务 API（方案 B：Blueprint + Controller）
- `07-query-business-api.md`：`@logix/query` 业务 API（方案 B：Blueprint + Controller）
