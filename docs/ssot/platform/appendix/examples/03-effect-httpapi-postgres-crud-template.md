# Effect HttpApi + PostgreSQL CRUD 模板（SSoT）

> 目标：沉淀一套可复用的 CRUD“写法模板”（目录结构、测试用例、表设计、契约工件），用于在本仓快速创建/扩展后端 API 示例服务，并保持可测、可解释、可对齐（避免实现漂移）。

## 1) 适用范围

适用于：

- Node.js 后端服务；
- 使用 Effect + `@effect/platform`（HttpApi）组织 HTTP API；
- PostgreSQL 作为开发环境可选依赖（由 `DATABASE_URL` 注入）；
- 需要一个最小 CRUD 作为“打样”与回归基线（例如 Todo CRUD）。

非目标：

- 生产化迁移体系（建议另起 spec 管理）
- 鉴权/多租户/审计/软删/复杂查询优化
- 默认测试依赖外部数据库

## 2) 参考实现（单一事实源）

本模板以 `apps/logix-galaxy-api` 为参考实现（可运行、可测）：

- 代码落点：`apps/logix-galaxy-api/src/*`
- 示例 spec：`specs/062-galaxy-api-postgres/*`
- 表结构 SSoT（示例）：`docs/ssot/platform/examples/02-logix-galaxy-api-postgres.md`

## 3) 目录结构模板（推荐）

> 原则：Contract（Schema + endpoint 定义）与实现（handlers/repo/db）分离；每个资源（如 Todo）自成目录，便于复制与演进。

```text
apps/<service>/
├── package.json
├── README.md
├── scripts/
│   └── pg-smoke.ts                  # 可选：需要 DATABASE_URL 的烟测脚本
└── src/
    ├── main.ts                      # Node server 启动与 Layer 组装
    ├── app/
    │   └── effect-api.ts            # HttpApi 根入口（聚合各 group）
    ├── db/
    │   ├── db.ts                    # Db Tag + DbError（抽象）
    │   └── db.live.ts               # DbLive（DATABASE_URL 可选注入）
    ├── health/
    │   ├── health.contract.ts       # /health endpoint schemas
    │   ├── health.http.live.ts      # handlers（读取 Db 状态）
    │   └── health.http.test.ts      # handler 级测试（无 DB）
    └── <resource>/                  # 例如 todo/
        ├── <resource>.contract.ts   # HttpApiGroup/Endpoint + Schema（含 error shape）
        ├── <resource>.model.ts      # 领域实体/输入类型（不含实现细节）
        ├── <resource>.repo.ts       # Repo Tag（抽象）
        ├── <resource>.repo.live.ts  # RepoLive（SQL + Db.query）
        ├── <resource>.http.live.ts  # handlers（把 Repo 映射到 HTTP）
        └── <resource>.http.test.ts  # handler 级 CRUD 测试（内存 Repo）
```

对应 spec 文档结构（用于可交付与回放）：

```text
specs/<id>-<feature>/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── openapi.yaml                 # OpenAPI 3.1：对外契约工件（平台可机读消费）
```

## 4) 契约工件（contracts）

### 4.1 为什么要有 OpenAPI 工件

示例服务的价值在于“可对齐”：接口形状应该可以被 diff/审阅/工具链消费，而不是只存在于实现里。

### 4.2 推荐落点

- `specs/<id>/contracts/openapi.yaml`

最低要求：

- 覆盖所有对外路径、方法、状态码、请求/响应 JSON 形状；
- 错误形状固定为结构化对象（至少 `_tag` + `message`），且不得泄露敏感信息；
- `servers` 中可以给出“默认端口示例”（例如 7001），但实现必须允许 `PORT` 覆盖。

## 5) 表设计模板（PostgreSQL，开发环境）

### 5.1 原则

- 表结构是“可对齐资产”：必须有 SSoT（文档）与实现落点，不允许只有代码里隐式存在。
- 示例阶段优先简单：单表、少字段、显式默认值与必填约束。
- DB 字段采用 `snake_case`，对外 JSON 采用 `camelCase`（通过映射显式转换）。

### 5.2 示例：`todos` 表 DDL

```sql
create table if not exists todos (
  id serial primary key,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 5.3 SSoT 要求

当你新增/修改任何表结构或字段语义，必须同步更新：

1. 表结构 SSoT 文档（建议放在 `docs/ssot/platform/examples/<nn>-*.md`）
2. `specs/<id>/data-model.md`（业务实体与对外映射）
3. `specs/<id>/contracts/openapi.yaml`（对外形状）
4. 代码实现（Repo/SQL）

## 6) Repository（Repo）写法模板

> 目标：把 SQL 与错误处理收敛在 Repo 层，使 HTTP handler 只关心业务语义与错误映射。

推荐约定：

- Repo 以 Tag 暴露，方法返回 `Effect`：
  - `get(id)` 返回 `Option<T>`（不存在用 `Option.none()` 表达）
  - `create(input)` 返回 `T`
  - `list` 返回数组
  - `update(id, patch)` 返回 `Option<T>`
  - `remove(id)` 返回 `boolean`
- RepoLive 只依赖 `Db` 抽象；不在 handler 内直接写 SQL。
- 示例阶段允许在 RepoLive 内使用“幂等建表”（`create table if not exists`），但必须在 SSoT 明确标注：生产化需迁移体系替代。

## 7) HTTP handler 写法模板

> 目标：把“HTTP 语义（状态码/错误形状）”固定在 contract 与 handler 层；把“数据访问/SQL”固定在 Repo 层。

推荐约定：

- contract 中定义：
  - endpoint path + method
  - request/response schemas
  - error schemas（例如 `NotFoundError`、`ServiceUnavailableError`）与 status 映射
- handler 中：
  - 从 Repo 取数据
  - `Option.none()` → `NotFoundError`
  - DB disabled/down → `ServiceUnavailableError`

## 8) 测试用例模板（默认无 PostgreSQL）

### 8.1 测试策略

- 默认测试（CI/一键）：handler 级测试，不启动真实端口、不依赖 PostgreSQL。
- 可选数据库集成测试（Vitest，本地/CI 按需）：需要 `DATABASE_URL`，用于验证“真实数据库连通 + DDL + SQL”，但要求 schema 隔离避免污染开发库。
- 可选 smoke（脚本，本地）：需要 `DATABASE_URL`，用于快速验证“真实数据库连通 + DDL + SQL”。

### 8.2 典型用例清单（建议最小集）

健康检查：

- `GET /health`：未配置 `DATABASE_URL` → `db="disabled"` 且 `ok=true`
- `GET /health/:probe`：路径参数可解码为 `number` 并回显

CRUD（以 Todo 为例）：

- `POST /todos` → `201` 返回 Todo
- `GET /todos` → `200` 返回数组
- `GET /todos/:id` → `200` 返回 Todo；不存在 → `404 NotFoundError`
- `PATCH /todos/:id` → `200` 返回更新后 Todo；不存在 → `404 NotFoundError`
- `DELETE /todos/:id` → `204`；不存在 → `404 NotFoundError`

数据库不可用：

- 未配置 `DATABASE_URL` 时，CRUD 相关接口 → `503 ServiceUnavailableError`

### 8.3 隔离与确定性

- 测试不得依赖真实时间/随机数导致的脆弱断言（示例可以把 `createdAt` 固定为常量字符串）。
- 测试中若需要修改环境变量，必须在 `afterEach` 恢复（避免用例间污染）。

### 8.4 可选：`DATABASE_URL` 数据库集成测试（Vitest）

> 目标：把“真实 PostgreSQL 链路”的验证从手工 smoke 进一步固化到 Vitest，用于回归；同时通过 schema 隔离避免污染开发库。

推荐约定：

- 用例仅在 `DATABASE_URL` 已设置时运行；否则 `describe.skip`。
- 每次测试创建独立 schema，并通过连接参数 `options: "-csearch_path=<schema>"` 设置 `search_path`（避免触碰 `public`）。
- 仍使用 `HttpApiBuilder.toWebHandler`（不需要真实端口），但使用真实 `RepoLive` + 真数据库 `Db`。

参考实现：

- 集成测试：`apps/logix-galaxy-api/src/todo/todo.pg.integration.test.ts`
- RepoLive：`apps/logix-galaxy-api/src/todo/todo.repo.live.ts`

## 9) 质量门（建议）

实现完成后至少通过：

- `pnpm -C apps/<service> typecheck`
- `pnpm -C apps/<service> test`

## 10) 复制新 CRUD 资源的最小步骤

1. 在 `src/<resource>/` 创建 `*.contract.ts` 与 `*.model.ts`，先把 Schema 与错误形状定下来。
2. 创建 `*.repo.ts`（Tag）与 `*.repo.live.ts`（SQL），并在 `data-model.md` 固化字段映射与 DDL。
3. 创建 `*.http.live.ts`（handlers）与 `*.http.test.ts`（内存 Repo 测试）。
4. 更新 `specs/<id>/contracts/openapi.yaml` 覆盖新接口。
5. 如涉及新表结构：新增/更新对应 SSoT 文档并在 `examples/README.md` 建索引（防漂移）。
