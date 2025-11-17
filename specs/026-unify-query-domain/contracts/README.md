# Contracts: 026 Query 收口到 `@logix/query`

本目录用于固化“对外入口、注入边界与迁移口径”，以避免在代码重构后出现并行真相源或文档漂移。

- `public-api.md`：对外入口与导出形状（含移除 `@logix/core/Middleware/Query`）
- `query-engine-injection.md`：外部查询引擎注入（`Query.Engine`）与接管点（`Query.Engine.middleware`）行为边界
- `migration.md`：从历史入口迁移到 `@logix/query` 的操作指南与风险点
