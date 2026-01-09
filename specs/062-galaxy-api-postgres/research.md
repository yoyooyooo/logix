# Research: 062 logix-galaxy-api（PostgreSQL 开发环境样例）

**Feature**: `specs/062-galaxy-api-postgres/spec.md`  
**Date**: 2025-12-30

## Decision 1：端口与环境口径

- **Decision**：HTTP 服务默认端口为 `7001`（可通过 `PORT` 覆盖）；PostgreSQL 仅作为开发/演示环境可选依赖，是否启用由 `DATABASE_URL` 决定（数据库端口/host 不在代码中固定）。
- **Rationale**：
  - 端口作为开发约定需要稳定，便于 Playground/脚本/文档引用。
  - 数据库只用于演示持久化链路；默认测试与 CI 不能强依赖本机数据库。
- **Alternatives considered**：
  - 强制要求 PostgreSQL：会导致 CI 与新机器上落地成本变高，且不符合“示例可跑 + 可测”的目标。
  - 代码里固定数据库端口：降低灵活性；`DATABASE_URL` 已足够表达连接信息。

## Decision 2：表结构作为 SSoT 资产沉淀

- **Decision**：`todos` 表结构与字段语义沉淀为 SSoT：`docs/ssot/platform/examples/02-logix-galaxy-api-postgres.md`，并在实现中保持一致。
- **Rationale**：
  - 表结构是“契约的一部分”（对 API 形状与回归测试都有影响），应当有可追溯的单一事实源。
  - 便于平台侧/生成器侧对齐“预期数据形状”。
- **Alternatives considered**：
  - 仅在代码中维护 DDL：缺少显式的设计裁决与对齐入口，容易形成“实现即规范”的漂移。

## Decision 3：契约工件采用 OpenAPI 3.1

- **Decision**：HTTP API 契约固化为 `specs/062-galaxy-api-postgres/contracts/openapi.yaml`（OpenAPI 3.1）。
- **Rationale**：
  - OpenAPI 是可被平台/工具链消费的稳定格式，便于 diff 与对齐。
  - 与“示例服务用于验证平台生成/编排的 Effect API”目标一致。
- **Alternatives considered**：
  - 仅靠 README 描述接口：不可机读、难以回归与比对。

## Decision 4：自动化测试默认不依赖 PostgreSQL

- **Decision**：测试以 handler 级别为主，通过可替换 Repo（内存实现/替身）覆盖 `/health` 与 Todo CRUD 的关键语义；数据库连通性仅在可选 smoke（本地）覆盖。
- **Rationale**：
  - 保证测试可在任意环境稳定运行，减少“外部依赖导致的偶发失败”。
  - handler 级测试仍能覆盖：路由、Schema 解码、状态码、错误形状、CRUD 语义。
- **Alternatives considered**：
  - 在 CI 中启动 PostgreSQL 进行端到端集成测试：更接近真实环境，但维护与稳定性成本更高；对“打样”阶段不是必需。

## Open Questions（当前无阻塞项）

- 若未来需要把示例服务升级为“长期在线的开发后端”，再引入迁移/权限/审计等能力，并另起 spec 管理（避免当前 scope 膨胀）。

