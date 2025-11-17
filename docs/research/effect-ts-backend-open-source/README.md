# 开源 Effect（effect-ts）后端项目调研

目标：回答“市面上开源是否有基于 effect-ts 实现的后端项目？它们是怎么写代码的？”

> 结论聚焦“可运行的服务端工程/示例”，并补充少量“相关库”（非完整后端，但影响服务端写法）。

## TL;DR（最短结论）

- 有，且主要分成四种服务端写法：
  1. **Spec-first**：用 `@effect/platform` 的 `HttpApi / HttpApiBuilder` 先定义 API 契约，再实现 handlers，并可顺滑接入 OpenAPI / Swagger。
  2. **Router-first**：用 `HttpRouter` 直接手写路由与请求解析，配合 `Schema` 校验与 `Layer` 组装依赖。
  3. **Hybrid（Contract + Router）**：用 `HttpLayerRouter.addHttpApi(HttpApi)` 把契约挂到 Router 上，同时用 Router 方式追加 health/webhook 等“非契约路由”，最后 `HttpLayerRouter.serve(...)` 一次性对外提供。
  4. **Fetch-first（Serverless/Worker）**：用 `HttpApiBuilder.toWebHandler(layer)` 把 router layer 转成可直接对接 `fetch(Request)` 的 handler（典型：Cloudflare Workers）。
- 工程组织上高度一致：**入口只负责组装 Layer**；业务逻辑用 `Context.Tag` 暴露服务；DB / 外部 HTTP 调用分别封装在 Repo / Infrastructure；错误用 `Effect.catchTags` 映射到 HTTP 响应；可观测性用 `Effect.withSpan` 打点。

> 继续调研的准入标准/关键词与线索池：见 `docs/research/effect-ts-backend-open-source/handoff.md`。

## 已验证的开源后端/示例工程

### 1) typeonce-dev/effect-backend-example（Spec-first + Postgres）

- 仓库：https://github.com/typeonce-dev/effect-backend-example
- 类型：教程型可运行示例（monorepo：`packages/api` + `apps/server` + `apps/client`）
- 栈：`effect` + `@effect/platform` + `@effect/platform-node` + `@effect/sql` + `@effect/sql-pg`
- 关键入口：
  - `apps/server/src/main.ts`：dotenv 配置层 + `HttpApiBuilder.api(ServerApi)` + `HttpApiBuilder.serve(...)` + `NodeHttpServer.layer(...)` + `NodeRuntime.runMain(Layer.launch(...))`
  - `packages/api/src/main.ts`：`HttpApi`/`HttpApiGroup`/`HttpApiEndpoint` 定义服务端 API 契约（并可用于共享给前端/客户端）
- 数据库：
  - `apps/server/src/database.ts`：`PgClient.layerConfig(...)`，用 `Config.redacted("POSTGRES_PW")` 等从 ConfigProvider 读配置
  - `apps/server/src/user.ts`：在 handler 内 `yield* SqlClient.SqlClient`，用 `SqlResolver.ordered/findById` 封装 SQL，并把 Request/Result 用 Schema 绑定
- 迁移：
  - `apps/server/src/migrator.ts`：`PgMigrator.layer(...)` + `PgMigrator.fromFileSystem(...)`，用 `NodeContext.layer` 提供文件系统/路径能力
- 读代码建议路径：
  1. 先看 `packages/api/src/main.ts`（API 契约长什么样）
  2. 再看 `apps/server/src/main.ts`（Layer 怎么组装、怎么 serve）
  3. 最后看 `apps/server/src/user.ts`（如何把 handler + SQL resolver + 错误映射拼起来）

### 2) Mumma6/effect-node-server（Router-first + Postgres + 外部 API）

- 仓库：https://github.com/Mumma6/effect-node-server
- 类型：完整 CRUD API 示例（Users/Movies），带 DB 初始化、外部 API（OMDb）、Tracing
- 栈：`@effect/platform` + `@effect/platform-node` + `@effect/sql` + `@effect/sql-pg` + `HttpClient`
- 关键入口：
  - `index.ts`：自定义 `HttpMiddleware`（示例 logger）+ `HttpServer.serve(...)` + `NodeHttpServer.layer(createServer, { port, host })` + 一组 `Layer.provide(...)`
- 路由：
  - `routes/routes.ts`：`HttpRouter.Default.use(...)` + `router.mount("/users", ...)` / `router.mount("/movies", ...)`
  - `routes/users/users.routes.ts` / `routes/movies/movies.routes.ts`：
    - 请求解析：`HttpServerRequest.schemaBodyJson(...)`、`HttpRouter.schemaPathParams(...)`
    - 错误到 HTTP：`Effect.catchTags({ ParseError, SqlError, RequestError, HttpBodyError })` + `HttpServerResponse.json({ ... }, { status })`
    - 观测：`Effect.withSpan("...Route")`
- Domain 分层（很适合作为“后端分层模板”阅读）：
  - Model：`domain/**/models/*.model.ts`（Schema.Class + 派生 Insert/Update schema）
  - Repository：`domain/**/repository/*.repository.ts`（`SqlResolver.*` + SQL + `Effect.withSpan`）
  - Service：`domain/**/service/*.service.ts`（编排 repo/infrastructure；业务分支常用 `Option.match`）
  - Infrastructure：`domain/movies/infrastructure/movie.infrastructure.ts`（`HttpClientRequest.get` + `HttpClient.fetch` + Schema 解码 + `Effect.retry({ times })`）
- 注意点（与本仓约定可能不同）：
  - 该仓库 `Schema` 从 `@effect/schema` 导入；而本仓通常约定从 `effect` 导入 `Schema`（需要统一时注意依赖与类型差异）

### 3) Effect-TS/examples · http-server（官方示例：Spec-first + OpenAPI/Swagger）

- 仓库：https://github.com/Effect-TS/examples
- 目录：`examples/http-server`
- 类型：官方可运行示例（强调：契约、鉴权、安全、OpenAPI/Swagger、中间件注入）
- 关键入口：
  - `examples/http-server/src/main.ts`：`HttpLive.pipe(Layer.provide(TracingLive), Layer.launch, NodeRuntime.runMain)`
  - `examples/http-server/src/Http.ts`：
    - `HttpApiBuilder.api(Api)` 绑定契约
    - `HttpApiSwagger.layer()` + `HttpApiBuilder.middlewareOpenApi()` 直接出 OpenAPI/Swagger
    - `HttpApiBuilder.middlewareCors()` / `HttpMiddleware.logger`
    - `NodeHttpServer.layer(createServer, { port })`
- API 契约 + 鉴权（值得精读）：
  - `examples/http-server/src/Api.ts`：`class Api extends HttpApi.make("api").add(...)`
  - `examples/http-server/src/Accounts/Api.ts`：
    - 用 `HttpApiMiddleware.Tag` 定义鉴权中间件（cookie apiKey），并声明 `provides`（例如 `CurrentUser`）
    - endpoint 级别 `.middlewareEndpoints(Authentication)`，把“鉴权”作为契约的一部分
  - `examples/http-server/src/Accounts/Http.ts`：
    - `Layer.effect(Authentication, ...)` 给鉴权中间件提供实现（从 repo 查 token → CurrentUser）
    - handlers 内用 `policyUse(...)`、`withSystemActor` 等把“授权/审计”编排进 Effect pipeline
- 数据库（示例用 sqlite）：
  - `examples/http-server/src/Sql.ts`：`SqliteClient.layer` + `SqliteMigrator.layer`，并提供测试用 Layer（`makeTestLayer`）

### 4) lucaf1990/effect-mongodb-app（Spec-first + MongoDB + Swagger/OpenAPI + DevTools）

- 仓库：https://github.com/lucaf1990/effect-mongodb-app
- 类型：可运行后端示例（账号体系/鉴权/授权/邮件/REST API），数据源是 MongoDB
- 栈：`effect` + `@effect/platform` + `@effect/platform-node` + `HttpApiSwagger`/OpenAPI + `effect-mongodb`（MongoClient）+ `@effect/experimental`（DevTools）
- 关键入口：
  - `src/index.ts`：`HttpApiBuilder.serve(...)` + `HttpApiSwagger.layer()` + `middlewareOpenApi/cors` + `Etag.layerWeak` + `NodeHttpServer.layer(createServer, { port })` + `DevTools.layerWebSocket()` + `NodeRuntime.runMain(...)`
- API 契约 / 组合：
  - `src/Api/mainApi.ts`：`class MainServiceApi extends HttpApi.make(...).add(AccountApi).add(InvitationApi)...`
  - `src/Api/mainApiLive.ts`：`HttpApiBuilder.api(MainServiceApi)` + `Layer.provide([AccountApiLive, InvitationApiLive])`
- 配置与依赖注入：
  - `src/Configuration/configurationService.ts`：读取端口等配置（在入口处用于组装 `NodeHttpServer.layer(...)`）
  - `src/Config/layer.ts`：`Layer.mergeAll(...)` 汇总 App 级依赖（Repository/Service/Database 等）
- MongoDB：
  - `src/Config/db.ts`：`MongoClient.connectScoped(...)` + `MongoClient.db(...)`，并以 `Effect.Service` 形式暴露 `DatabaseService`

### 5) CapSoftware/Cap（生产级应用的后端子系统：cluster/workflow/rpc + OTel）

- 仓库：https://github.com/CapSoftware/Cap
- 类型：大型 monorepo；其中包含“workflow runner / web backend”等多个服务端子系统（非纯后端模板，但非常适合学习“复杂后端如何用 Effect 组装与观测”）
- 栈特征：
  - HTTP：`@effect/platform`（`HttpRouter`/`HttpServer`）
  - 分布式/编排：`@effect/cluster` + `@effect/workflow` + `@effect/rpc`
  - 观测：`@effect/opentelemetry`（NodeSdk）+ OTLP exporter
- Workflow runner 入口：
  - `apps/web-cluster/src/runner/index.ts`：
    - `HttpRouter.Default.serve()` + `NodeHttpServer.layer(createServer, { port })` + `HttpServer.withLogAddress`
    - 用 `RpcServer.layer(...)`/`WorkflowProxyServer.layerRpcHandlers(...)` 暴露 RPC，并用自定义 `SecretAuthMiddleware` 做鉴权
    - `NodeSdk.layer(...)` + `BatchSpanProcessor` + `OTLPTraceExporter` 做 tracing
    - 最终 `Layer.launch` 后 `NodeRuntime.runMain`
- Web backend（契约/实现拆分明显）：
  - `packages/web-backend/src/Http/Live.ts`：`HttpApiBuilder.api(Http.ApiContract)`（契约在 `@cap/web-domain`），再 `Layer.provide(...)` 注入具体模块实现（如 Loom）
  - `packages/web-backend/src/Auth.ts`：把“获取当前用户/鉴权 header/错误映射”等收敛成 `HttpAuthMiddlewareLive` 与可复用的 `provideOptionalAuth(...)`

### 6) pawelblaszczyk5/naamio · hermes（最小 HttpApi 骨架 + Postgres migrator）

- 仓库：https://github.com/pawelblaszczyk5/naamio
- 目录：`apps/hermes`
- 类型：最小可运行服务端骨架（HttpApi + DB layer + 配置）
- 关键入口：
  - `apps/hermes/src/mod.ts`：`HttpApi.make(...)` + `HttpApiBuilder.serve(...)` + `Config.number("PORT")` + `NodeHttpServer.layer(createServer, { port })` + `Layer.mergeAll(ApiLive, DatabaseLive)` + `NodeRuntime.runMain`
- 数据库与迁移：
  - `apps/hermes/src/modules/database/mod.ts`：`PgClient.layerConfig(...)` + `PgMigrator.layer({ loader: Effect.succeed(allMigrations) })` + `NodeContext.layer`

### 7) tim-smart/stremio-effect（教育项目：以 HTTP 服务形式运行的 addon）

- 仓库：https://github.com/tim-smart/stremio-effect
- 类型：教育项目；把 Stremio addon 作为 HTTP 服务跑起来（`NodeHttpServer.layerConfig(createServer, { port })` + `NodeRuntime.runMain`）
- 关键入口：
  - `src/main.ts`：`AddonLive.pipe(Layer.provide(NodeHttpServer.layerConfig(...)), Layer.provide(NodeHttpClient.layerUndici), ...)`
- 路由与中间件：
  - `src/Addon.ts`：在 addon 定义后 `.pipe(..., HttpRouter.serve, Layer.provide(HttpMiddleware.layerTracerDisabledForUrls([...])) )`（使用 `effect/unstable/http`）
- Tracing：
  - `src/Tracing.ts`：基于 `effect/unstable/observability` 的 `OtlpTracer.layer(...)`，并用 `Config.schema(...)` 支持 Honeycomb / 自定义 OTLP endpoint

### 8) PREreview/prereview.org（生产级 Node 服务：DB fallback + Cluster + AI）

- 仓库：https://github.com/PREreview/prereview.org
- 类型：真实线上业务服务（Fly.io 部署）；工程里大量使用 Effect（DB、HTTP、Redis、Cluster、外部集成等）
- 栈特征：
  - 入口：`NodeHttpServer.layerConfig(() => createServer(), { port: ... })` + `Layer.launch` + `Effect.scoped` + `NodeRuntime.runMain(...)`
  - DB：`@effect/sql-pg` 与 `@effect/sql-libsql` 二选一 fallback（`Layer.orElse`）
  - Cluster/Workflow：`@effect/cluster`（`ClusterWorkflowEngine` 等）
  - AI：`@effect/ai-openai`（LanguageModel + OpenAiClient）
  - 外部依赖：Redis/Slack/Orcid/Zenodo/Cloudinary/Nodemailer 等统一以 Layer 注入
- 关键入口：
  - `src/index.ts`：一个文件里把 “Program + 大量基础设施 Layer + Logger 策略” 一次性 wiring 完
- 值得学习的写法：
  - `Layer.orElse` 做“运行时 DB 实现切换”
  - `Layer.scopedDiscard(Effect.addFinalizer(...))` 绑定连接生命周期日志/清理
  - `Logger.replaceEffect(...)` 让日志格式（json/pretty）也变成可配置的运行时依赖

### 9) SmarakNayak/Vermilion（Bun + HttpApiBuilder + Swagger/OpenAPI + Postgres）

- 仓库：https://github.com/SmarakNayak/Vermilion
- 类型：Ordinal Explorer；服务端部分同时包含“传统 Bun 路由”与 “Effect HttpApi 服务”
- Effect 服务端（Spec-first）：
  - `app/server/src/effectServer/effectServer.ts`：`HttpApiBuilder.group(...)` 实现 `EffectServerApi` 的多个 group，并组装：
    - `HttpApiSwagger.layer()` + `HttpApiBuilder.middlewareOpenApi()`
    - `BunHttpServer.layer({ port: ... })`
    - DB/Auth/JWT/Config 等多层 `Layer.provide(...)`
  - 错误处理：大量使用 `Effect.catchTags({ ... })` 把 DB/校验错误映射到领域错误（如 `Conflict/NotFound`）
- 启动方式（Bun）：
  - `app/server/server.ts`：`BunRuntime.runMain(Layer.launch(ServerLive), { teardown })`，并在 teardown 里统一关闭 server/浏览器池等资源

### 10) TCotton/algoraveshare（Node + HttpApiBuilder：典型“共享 API 契约 + 分组实现”）

- 仓库：https://github.com/TCotton/algoraveshare
- 类型：monorepo；后端用 `HttpApiBuilder` 按 group 实现 API（并注入数据库层）
- 关键入口：
  - `apps/backend/src/effect-server.ts`：
    - `HttpApiBuilder.group(ServerApi, "Greetings"/"Projects", ...)` 实现
    - `HttpApiBuilder.api(ServerApi)` 组装实现层
    - `HttpApiBuilder.serve(HttpMiddleware.logger)` + cors + `HttpServer.withLogAddress` + `NodeHttpServer.layer(createServer, { port })`
    - `ServerLive.pipe(Layer.launch, NodeRuntime.runMain)`
- 备注：该仓库还展示了“从 EnvVars 构造 Database.layer(...)”的模式（`Layer.unwrapEffect(EnvVars.pipe(Effect.map(...)))`）

### 11) imMohika/cause（Bun 模板：HttpApiBuilder + Swagger/OpenAPI + cors）

- 仓库：https://github.com/imMohika/cause
- 类型：更接近模板/脚手架，但完整覆盖了 Bun 下 `HttpApiBuilder` 的最小可运行路径
- 关键入口：
  - `src/http/http.ts`：`HttpApiBuilder.serve(HttpMiddleware.logger)` + `HttpApiSwagger.layer({ path: "/swagger" })` + `middlewareOpenApi/cors` + `BunHttpServer.layer({ port })`
  - `src/main.ts`：`BunRuntime.runMain(Layer.launch(HttpLive))`

### 12) harrysolovay/liminal · lmnl.im/worker（Bun + HttpApiBuilder：服务端骨架在 monorepo 子目录）

- 仓库：https://github.com/harrysolovay/liminal
- 类型：仓库主线是 Effect 库；但包含 `lmnl.im/worker` 子项目（Bun + HttpApi 服务端）
- 关键入口：
  - `lmnl.im/worker/main.ts`：`HttpApiBuilder.serve()` + `HttpApiSwagger.layer()` + `HttpApiBuilder.api(Api)` + `BunHttpServer.layer({ port })` + `Layer.launch` + `Effect.runFork`
- 值得学习的写法：
  - cors 配置通过 `Layer.unwrapEffect(config.pipe(Effect.map(...)))` 延迟到运行时读取 `appUrl`

### 13) tim-smart/effect-bun-monorepo（Bun 最小模板：platform-bun 的 HttpServer/Runtime）

- 仓库：https://github.com/tim-smart/effect-bun-monorepo
- 类型：极简 monorepo 模板（Bun 运行）
- 关键入口：
  - `packages/http/src/main.ts`：
    - `Http.server.layerConfig({ port: Config.withDefault(Config.integer("PORT"), 3000) })`
    - `Layer.launch(MainLive).pipe(..., runMain)`（`runMain` 来自 `@effect/platform-bun/Runtime`）

### 14) typeonce-dev/sync-engine-web（Spec-first + Drizzle ORM + dotenv ConfigProvider）

- 仓库：https://github.com/typeonce-dev/sync-engine-web
- 类型：可运行服务端工程（monorepo，server 在 `apps/server`）
- 栈：`effect` + `@effect/platform` + `@effect/platform-node` + `drizzle-orm`
- 关键入口：
  - `apps/server/src/main.ts`：`PlatformConfigProvider.fromDotEnv(".env")` → `Layer.setConfigProvider` → `HttpApiBuilder.api(SyncApi)` → `HttpApiBuilder.serve(HttpMiddleware.logger)` → `NodeHttpServer.layer(createServer, { port: 3000 })` → `NodeRuntime.runMain(Layer.launch(...))`
- 业务实现（group-first 的 Spec 实现形态）：
  - `apps/server/src/group/sync-auth.ts`：`HttpApiBuilder.group(SyncApi, "syncAuth", ...)`，在 group 内用 `Effect.gen` 拉取 `Jwt` / `Drizzle` 服务再批量 `.handle(...)`
  - `apps/server/src/group/sync-data.ts`：push/pull/join 的 handler 结构（Schema 解码 + DB query + 领域错误映射）
- 数据库封装（值得抄的写法点）：
  - `apps/server/src/services/drizzle.ts`：用 `Effect.Service` 暴露 `{ db, query }`；其中 `query(...)` 先 `Schema.decode(Request)` 再 `Effect.tryPromise` 执行真实 SQL，并把异常收敛为 `Data.TaggedError`

### 15) FaithBase-AI/openfaith（Bun + Cluster/Workflow Runner + Swagger + OpenTelemetry）

- 仓库：https://github.com/FaithBase-AI/openfaith
- 类型：更偏生产级的“持久化工作流 runner”（分片、协调、HTTP Proxy API）
- 栈：`effect` + `@effect/cluster` + `@effect/workflow` + `@effect/platform` + `@effect/platform-bun` + `@effect/opentelemetry`
- 关键入口（Runner）：
  - `backend/workers/runner.ts`：
    - `ClusterWorkflowEngine.layer` + `BunClusterRunnerSocket.layer({ shardingConfig, storage: "sql" })` + `WorkflowPgLive`
    - `HttpApiBuilder.api(WorkflowApi)` + `WorkflowProxyServer.layerHttpApi(...)` 暴露 workflows 为 HTTP endpoint
    - `HttpApiSwagger.layer({ path: "/api/docs" })` + `HttpApiBuilder.serve(HttpMiddleware.logger)`
    - `BunRuntime.runMain(Layer.launch(ServerLayer))`
- 配套入口（Shard Manager）：
  - `backend/shard-manager/index.ts`：`BunClusterShardManagerSocket.layer(...)` + `WorkflowPgLive` + `BunRuntime.runMain`
- 文档与目录导航：
  - `backend/workers/README.md`：把 runner 的目录结构、触发方式（HTTP / Client service）和排障写得很清楚

### 16) MichaelVessia/obsidian-api（Bun + HttpApiBuilder + Swagger + OTLP Tracing Layer）

- 仓库：https://github.com/MichaelVessia/obsidian-api
- 类型：面向 Obsidian vault 的 HTTP API 服务（Spec-first）
- 栈：`effect` + `@effect/platform` + `@effect/platform-bun` + `@effect/opentelemetry/Otlp`
- 关键入口：
  - `src/server.ts`：`HttpApi.make(...).add(...)` 定义 API + `HttpApiBuilder.api(api)` + `HttpApiBuilder.serve(HttpMiddleware.logger)` + `HttpApiSwagger.layer({ path: "/docs" })` + `BunHttpServer.layer({ port: 3000 })`，最后 `Layer.provide(TracerLayer)`
  - `src/main.ts`：`BunRuntime.runMain(Layer.launch(ApiServer))`
- 可观测性（对齐“Tracing 也是 Layer”）：
  - `src/tracing/tracer.ts`：`Otlp.layer({ baseUrl, resource })` 的 Layer 通过 `Config.withDefault` 读取配置，并 `Layer.provide(FetchHttpClient.layer)`

### 17) nickbreaton/bluelinked（Bun + Spec-first：Group/Endpoint/Middleware 结构很清晰）

- 仓库：https://github.com/nickbreaton/bluelinked
- 类型：小而清晰的 Bun 服务端（适合学习“HttpApi/Group/Endpoint 的最佳写法”）
- 栈：`effect` + `@effect/platform` + `@effect/platform-bun`
- API 契约（强烈建议精读）：
  - `src/router.ts`：
    - `HttpApiGroup.make("base")` / `HttpApiGroup.make("authorized")`
    - `HttpApiEndpoint.get/post(...)` + `.addSuccess(...)`
    - group 级 `.middleware(AuthorizationMiddleware)` 与全局 `.addError(UnauthorizedError, { status: 401 })`
- 实现组织：
  - `src/router.ts`：`HttpApiBuilder.group(AppApi, "authorized", ...)` 与 `HttpApiBuilder.group(AppApi, "base", ...)` 分组实现；handler 内 `Effect.gen` 通过 Tag 拿服务并编排
- 关键入口：
  - `src/platforms/bun.ts`：`HttpApiBuilder.serve(HttpMiddleware.logger).pipe(HttpServer.withLogAddress, Layer.provide(AppApiLive), Layer.provide(BunHttpServer.layer({ port })), Layer.launch, BunRuntime.runMain)`

### 18) pawelblaszczyk5/effect-workflow-cluster-playground（Node + Cluster/Entity + Workflow + Swagger）

- 仓库：https://github.com/pawelblaszczyk5/effect-workflow-cluster-playground
- 类型：Cluster/Workflow/Entity 的“可跑 playground”（带 docker/fly 配置）
- 栈：`effect` + `@effect/platform` + `@effect/platform-node` + `@effect/cluster` + `@effect/workflow` + `@effect/sql-pg`
- 关键入口：
  - `runner.ts`：
    - `NodeClusterSocket.layer({ storage: "sql", shardingConfig })` + `ClusterWorkflowEngine.layer`
    - `HttpApi.make(...).add(EntityProxy...).add(WorkflowProxy...)`，用 `EntityProxyServer.layerHttpApi` / `WorkflowProxyServer.layerHttpApi` 暴露为 HTTP
    - `HttpApiSwagger.layer()` + `HttpApiBuilder.serve(HttpMiddleware.logger)` + `NodeHttpServer.layer(createServer, { port })`
    - 最终 `EnvironmentLive.pipe(Layer.launch, NodeRuntime.runMain)`
- “契约即 Schema”（Entity/Workflow 的 schema 抽象）：
  - `schema.ts`：`Entity.make` + `Rpc.make` 定义 entity；`Workflow.make({ idempotencyKey })` 定义 workflow（非常利于理解“可恢复工作流”的约束面）

### 19) ghardin1314/effect-mcp（非典型 HTTP 后端：服务端 transport + Layer 组装示例）

- 仓库：https://github.com/ghardin1314/effect-mcp
- 类型：MCP server（提供 SSE / stdio 两种 transport），但“如何用 Effect 组织服务端”非常有参考价值
- 栈：`effect` + `@effect/platform` + `@effect/platform-node` + `@effect-mcp/server` + `@effect/ai`
- SSE（HTTP Router-first）入口：
  - `examples/server/src/sse.ts`：`HttpRouter.empty` + `SSEServerTransport.*Route(...)` → `HttpServer.serve()` → `NodeHttpServer.layer(createServer, { port })` → `NodeRuntime.runMain(Layer.launch(...))`
- stdio 入口：
  - `examples/server/src/stdio.ts`：`StdioServerTransport.make.pipe(Effect.provide(AppLive), NodeRuntime.runMain)`，并用 `NodeContext.layer`/`Layer.scope` 组装运行环境
- Server/Tool/Prompt 的组织方式：
  - `examples/server/src/shared.ts`：`McpServer.layer(...).pipe(Layer.provide(ToolkitLive), Layer.provide(PromptkitLive))`（Tag/Schema 驱动的工具与 Prompt 定义）

### 20) harrysolovay/1b12（Bun + Spec-first + Swagger：用外部 OpenAPI Client 编排业务）

- 仓库：https://github.com/harrysolovay/1b12
- 类型：小型完整服务端（Bun + HttpApiBuilder + 外部系统集成 + Auth）
- 栈：`effect` + `@effect/platform` + `@effect/platform-bun` + `@effect/opentelemetry` + 外部 OpenAPI client（`MeshClient`）
- 关键入口：
  - `server/main.ts`：`HttpApiBuilder.serve().pipe(...)`（cors + swagger + `HttpApiBuilder.api(Api)` + `BunHttpServer.layer({ port: 3000 })`），最后 `Layer.launch` + `Effect.runPromise`
- API 实现（group-first + 强编排）：
  - `server/ApiLive.ts`：`HttpApiBuilder.group(Api, "v1", ...)` 里一次性拉取 `ConfigService` / `MeshClient` / `Db`，并在 handlers 中：
    - 调外部 OpenAPI client（`mesh["GET/..."]` / `mesh["POST/..."]`）取数据后再组装领域返回
    - `Effect.catchTag("NoSuchElementException", () => Effect.fail(new HttpApiError.Unauthorized()))` 显式把“缺少 token”映射为 401
- Auth（典型“从 request cookies → 校验 → 产出用户上下文”）：
  - `server/auth.ts`：从 `HttpServerRequest.HttpServerRequest.cookies` 解码 `__session`，用 `verifyToken` 校验，失败统一落到 `HttpApiError.Unauthorized`

### 21) rashedInt32/fullstack-effect-hive（Node + Spec-first + WebSocket：全栈实时聊天）

- 仓库：https://github.com/rashedInt32/fullstack-effect-hive
- 类型：全栈聊天应用（后端 REST + WebSocket 实时总线）
- 栈：`effect` + `@effect/platform` + `@effect/platform-node` + Postgres（README 声称用 Effect SQL）
- 关键入口（HTTP + WS 双 server）：
  - `apps/server/src/index.ts`：
    - HTTP：`HttpApiBuilder.serve()` + `HttpApiBuilder.middlewareCors(...)` + `RootApiLive` + `NodeHttpServer.layer(createServer, { port: 3002 })` + `NodeRuntime.runMain(Layer.launch(...))`
    - WS：用 `Layer.scopedDiscard(Effect.gen(...))` 组装 WebSocket server，并通过 `Effect.addFinalizer` 管理资源生命周期
- API 组织（group-first，handlers 与 group 解耦）：
  - `apps/server/src/api/index.ts`：先 `HttpApi.make("RootApi").add(...).prefix("/api")`，再用多个 `HttpApiBuilder.group(...)` 把各 group 的 handlers 挂上，最后 `HttpApiBuilder.api(RootApi)` 聚合

### 22) lucas-barake/building-an-app-with-effect（Node + HttpLayerRouter：另一种“路由与契约”组织方式）

- 仓库：https://github.com/lucas-barake/building-an-app-with-effect
- 类型：monorepo（`packages/domain` 定义契约；`packages/server` 提供实现与 HTTP server）
- 栈：`effect` + `@effect/platform` + `@effect/platform-node`
- 关键入口（HttpLayerRouter 风格）：
  - `packages/server/src/server.ts`：
    - `HttpLayerRouter.addHttpApi(DomainApi)` 把 `HttpApi` 契约挂到 router 上（而非 `HttpApiBuilder.api(...)`）
    - `HttpLayerRouter.use(...)` 追加 `/health`
    - `HttpLayerRouter.cors(...)` / `HttpLayerRouter.serve(...)` + `NodeHttpServer.layer(createServer, { port: 3000 })` + `NodeRuntime.runMain(Layer.launch(...))`
- 契约与校验（Schema + HttpApiSchema 注解）：
  - `packages/domain/src/styles-rpc.ts`：`Schema.Class` + 细粒度校验（`nonEmptyString/maxLength` 自定义 message）+ `HttpApiSchema.annotations({ status: 404 })` 把错误映射进 OpenAPI/HTTP 语义
- 实现（group-first 但更贴近“RPC handler”）：
  - `packages/server/src/domain/styles/styles-rpc-live.ts`：`HttpApiBuilder.group(DomainApi, "styles", ...)`，repo 通过 Tag 注入（`StylesRepo.Default`）

### 23) HazelChat/hazel（Bun + HttpLayerRouter + RPC/WebSocket + Cluster/Workflow：偏生产级全栈）

- 仓库：https://github.com/HazelChat/hazel
- 类型：全栈实时聊天（API server + cluster/workflow service），工程分层清晰（Repo/Policy/Service）
- 栈（后端）：`effect` + `@effect/platform` + `@effect/platform-bun` + `@effect/rpc` + `@effect/cluster` + `@effect/workflow` + Postgres/Drizzle
- API server 入口（Bun）：
  - `apps/backend/src/index.ts`：
    - `HttpLayerRouter.addHttpApi(HazelApi)` + `HttpLayerRouter.use(.../health...)`
    - 文档：`HttpApiScalar.layerHttpLayerRouter({ api: HazelApi, path: "/docs" })`
    - RPC：`RpcServer.layerHttpRouter({ group: AllRpcs, path: "/rpc", protocol: "websocket" })`（并提供 `RpcSerialization.layerNdjson`）
    - `HttpLayerRouter.serve(AllRoutes)` + `BunHttpServer.layerConfig(Config.all({ port: ... }))` + `Layer.launch` + `BunRuntime.runMain`
    - 中间件：`HttpMiddleware.withTracerDisabledWhen(...)`（对 health / OPTIONS 等禁用 tracer）
  - `apps/backend/src/http.ts`：把 `HazelApi` 的各个 http route layer（`*.http`）统一 `Layer.provide(...)` 挂到 router 上
- Cluster/Workflow service 入口（Bun）：
  - `apps/cluster/src/index.ts`：
    - `ClusterWorkflowEngine.layer` + `BunClusterSocket.layer()` + `PgClient.layerConfig({ url: Config.redacted("EFFECT_DATABASE_URL") })`
    - `WorkflowProxyServer.layerHttpApi(Cluster.WorkflowApi, "workflows", Cluster.workflows)` 对外暴露 workflows
    - cron/job：把 cron layers 与 workflow layers merge 后统一注入 EngineLayer
    - 最终 `Layer.launch(...).pipe(BunRuntime.runMain)`

### 24) kriegcloud/beep-effect（Bun + Spec-first + Scalar/OpenAPI：更“模板/脚手架”的写法合集）

- 仓库：https://github.com/kriegcloud/beep-effect
- 类型：面向长期演进的 Effect “starter kit”（monorepo：Next.js web + Effect server + MCP tooling + 多 slice）
- 栈：`effect` + `@effect/platform` + `@effect/platform-bun` + Drizzle/Postgres + Cluster/Workflow（README 提到）+ Scalar/OpenAPI
- 关键入口（Bun server）：
  - `apps/server/src/server.ts`：
    - `HttpApiBuilder.api(IamApi).pipe(Layer.provide(IamApiLive))` 组装 domain API 层
    - 同时用 `HttpLayerRouter.addHttpApi(IamApi)` + 手写 health route 把 router 合并（`Layer.mergeAll`）
    - API consumer 层：`Layer.mergeAll(HttpApiBuilder.serve(...), HttpApiScalar.layer({ path: "/v1/docs" }), HttpApiBuilder.middlewareOpenApi({ path: "/v1/docs/openapi.json" }))`
    - CORS + `AuthContextHttpMiddlewareLive` + `BunHttpServer.layer({ port: 8080 })` + `HttpServer.withLogAddress`，最后 `Layer.launch(...).pipe(BunRuntime.runMain)`
- 文档（写得非常“可抄”）：
  - `apps/server/README.md`：把 server 的目的、Layer 组装、可用 endpoints、以及“新增 endpoint 的步骤”写成了操作手册

### 25) samueleguino97/effect-playground（Bun + HttpLayerRouter + RPC/http + OTLP Tracer + BetterAuth）

- 仓库：https://github.com/samueleguino97/effect-playground
- 类型：Bun 服务端示例（以 `HttpLayerRouter` 为主线，混入 RPC 与第三方 handler）
- 栈：`effect` + `@effect/platform` + `@effect/platform-bun` + `@effect/rpc` + `@effect/sql-sqlite-bun` + `@effect/opentelemetry`
- 关键入口：
  - `server/src/index.ts`：
    - `HttpLayerRouter.serve(AllRoutes)` + `BunHttpServer.layer({ port: 3000 })` + `BunRuntime.runMain(Layer.launch(...))`
    - RPC：`RpcServer.layerHttpRouter({ group: RpcDef, path: "/rpc", protocol: "http" })`（`RpcSerialization.layerNdjson`）
    - Tracing：`OtlpTracer.layer({ url: "http://localhost:4318/v1/traces" })` + `HttpMiddleware.withTracerDisabledWhen(...)`
    - DB：`DbLive` + `MigratorLive`（sqlite + migrator）
- Auth handler 的“Web Request ↔ Effect Request”桥接：
  - `server/src/http.ts`：把第三方 `auth.handler(Request)` 的 `Response` 转回 `HttpServerResponse`（raw body + status + headers）

### 26) unknown/modo（Bun + HttpLayerRouter + Spec-first：按环境切换依赖层）

- 仓库：https://github.com/unknown/modo
- 类型：真实业务型小后端（Robinhood Gold Card 交易展示），后端在 `packages/backend`
- 栈：`effect` + `@effect/platform` + `@effect/platform-bun`
- 关键入口：
  - `packages/backend/src/index.ts`：`HttpLayerRouter.serve(AllRoutes)` + `BunHttpServer.layer({ port: 3000 })`，并用 `NODE_ENV` 在 `Dependencies.layer` / `Dependencies.developmentLayer` 之间切换
- 契约与实现：
  - `packages/backend/src/api/index.ts`：`HttpLayerRouter.addHttpApi(Api.ApiSchema)` + `Layer.provide(TransactionsApiLayer)` + `HttpLayerRouter.cors()`
  - `packages/backend/src/api/transactions.ts`：`HttpApiBuilder.group(Api.ApiSchema, "transactions", ...)`，用 `Effect.catchAll(() => new Api.InternalServerError(...))` 统一兜底错误

### 27) ethanniser/effect-rpc-multi-protocol（Bun + RpcServer：同一 RPC 合约多协议暴露）

- 仓库：https://github.com/ethanniser/effect-rpc-multi-protocol
- 类型：聚焦 `@effect/rpc` 的服务端最小示例（对比 http / websocket 的 transport wiring）
- 栈：`effect` + `@effect/platform` + `@effect/platform-bun` + `@effect/rpc`
- 关键入口：
  - `src/server.ts`：`RpcServer.layerHttpRouter` 以不同 path 暴露多套 endpoint，并 `HttpLayerRouter.serve` 后挂到 `BunHttpServer.layer({ port: 3000 })`
- 合约与 handler：
  - `src/request.ts`：`class FooGroup extends RpcGroup.make(Rpc.make("Foo", ...)) {}`
  - `src/handlers.ts`：`FooGroup.toLayer(...)` 返回 handlers

### 28) lloydrichards/base_bevr-stack（Bun + HttpApi + RPC：HTTP + WebSocket + Stream RPC）

- 仓库：https://github.com/lloydrichards/base_bevr-stack
- 类型：全栈 monorepo 的后端 app（server + domain），展示“API 契约 + streaming RPC + websocket presence”的组合方式
- 栈：`effect` + `@effect/platform` + `@effect/platform-bun` + `@effect/rpc`（并引入 `@effect/experimental/DevTools`）
- 关键入口：
  - `apps/server/src/index.ts`：三条路由链路并存：
    - `HttpLayerRouter.addHttpApi(Api)`（HTTP API）
    - `RpcServer.layerHttpRouter({ group: EventRpc, protocol: "http" })`（streaming over HTTP，NDJSON）
    - `RpcServer.layerHttpRouter({ group: WebSocketRpc, protocol: "websocket" })`（presence）
    - 最终 `HttpLayerRouter.serve(...)` + `BunHttpServer.layerConfig(...)` + `BunRuntime.runMain(...)`
- 合约文件（值得读）：
  - `packages/domain/src/Api.ts`（HttpApi/Group/Endpoint）
  - `packages/domain/src/Rpc.ts`（`stream: true` 的 Event RPC）
  - `packages/domain/src/WebSocket.ts`（presence 的 websocket streaming RPC）

### 29) mpellegrini/fullstack-typescript-monorepo-starter（Node + HttpLayerRouter：教学型“契约/路由/RPC”合集）

- 仓库：https://github.com/mpellegrini/fullstack-typescript-monorepo-starter
- 类型：monorepo 示例；其中 `apps/effect-platform-fundamentals` 是一套可运行教学后端
- 栈：`effect` + `@effect/platform` + `@effect/platform-node` + `@effect/rpc`
- 关键入口：
  - `apps/effect-platform-fundamentals/src/index.ts`：`HttpLayerRouter.serve(allRoutes)` + `NodeHttpServer.layer(createServer, { port: 3000 })` + `NodeRuntime.runMain`
  - `apps/effect-platform-fundamentals/src/main.ts`：演示把 `HttpLayerRouter.addHttpApi(...)`、`RpcServer.layer(...)+websocket protocol`、以及手写 health/goodbye 路由合并后 `serve`
- API 路由层的“命名与分工”：
  - `apps/effect-platform-fundamentals/src/api.ts`：`HttpApi.make("api").add(...)`（契约）
  - `apps/effect-platform-fundamentals/src/api-live.ts`：`HttpLayerRouter.addHttpApi(api, { openapiPath })`（把契约转为路由，并注入实现 layer）

### 30) smhmayboudi/effect-app-monorepo（Node + HttpApiBuilder.serve：中间件链 + OpenAPI/Swagger + OTel）

- 仓库：https://github.com/smhmayboudi/effect-app-monorepo
- 类型：monorepo 模板 + 可运行 Node 后端（覆盖了“中间件链 + 文档 + 可观测性 + 依赖注入”的完整闭环）
- 栈：`effect` + `@effect/platform` + `@effect/platform-node` + `@effect/opentelemetry`（并集成 `HttpApiScalar` / `HttpApiSwagger`）
- 关键入口：
  - `packages/server/src/Server.ts`：典型的“serve 作为 composition root”的写法：
    - `HttpApiBuilder.serve(effect.flow(...middlewares...))`（cors + idempotency + logger + metric + authentication）
    - 提供文档层：`HttpApiBuilder.middlewareOpenApi({ path: "/openapi.json" })`、`HttpApiScalar.layer({ path: "/reference" })`、`HttpApiSwagger.layer({ path: "/doc" })`
    - 可观测性：`NodeSdk.layer(...)`（logs/metrics/traces exporters）
    - HTTP server：`NodeHttpServer.layer(http.createServer, { port: 3001 })`
    - 启动：`Layer.launch` + `NodeRuntime.runMain`

### 31) SemStassen/mason-app（Bun + HttpApiBuilder.serve：全栈项目里的后端入口）

- 仓库：https://github.com/SemStassen/mason-app
- 类型：monorepo；`apps/server` 是可运行 Bun 后端（以契约驱动 + swagger 文档为主）
- 栈：`effect` + `@effect/platform` + `@effect/platform-bun`（`HttpApiSwagger` + cors + logger）
- 关键入口：
  - `apps/server/src/index.ts`：`HttpApiBuilder.serve(HttpMiddleware.logger)` + `HttpApiSwagger.layer({ path: "/docs" })` + cors + `BunHttpServer.layer({ port: 8001 })`，最后 `Layer.launch(HttpLive).pipe(BunRuntime.runMain)`
- 契约与实现组装：
  - `apps/server/src/api/index.ts`：`HttpApiBuilder.api(MasonApi)` 后按 group `Layer.provide(...)` 汇总成 `MasonApiLive`
- 鉴权中间件（契约侧 Tag 的 Live 实现）：
  - `apps/server/src/middleware/auth.middleware.ts`：`Layer.effect(AuthMiddleware, ...)` + `HttpServerRequest` 读取 headers 并桥接调用 auth service

### 32) iapacte/iapacte（Node + HttpApiBuilder.serve：OpenAPI/Swagger + BetterAuth 代理路由）

- 仓库：https://github.com/iapacte/iapacte
- 类型：生产项目；`apps/server` 是可运行 Node 后端（大量依赖通过 Layer 注入）
- 栈：`effect` + `@effect/platform` + `@effect/platform-node`（OpenAPI/Swagger + 动态 CORS）
- 关键入口：
  - `apps/server/src/index.ts`：组合 `middlewareOpenApi({ path: "/api/openapi.json" })` + `HttpApiSwagger.layer({ path: "/api/docs" })`，用 `EnvVars` 动态构造 cors middleware；最后 `Layer.launch(HttpLive).pipe(Effect.scoped)` 并交给 `NodeRuntime.runMain(program)`
- API 组装：
  - `apps/server/src/api/live/api.ts`：`HttpApiBuilder.api(GroupApiSpec)` + 分组 `Layer.provide(...)`
- BetterAuth 反向代理（把 BetterAuth handler 变成 Effect route）：
  - `apps/server/src/api/live/better_auth.ts`：把 `HttpServerRequest` 转换成 Node `IncomingMessage` 再喂给 `auth.instance.handler(...)`，并统一转成 `HttpServerResponse`

### 33) Makisuo/electric-proxy（Cloudflare Workers + HttpApiBuilder.toWebHandler：Serverless/Worker 入口）

- 仓库：https://github.com/Makisuo/electric-proxy
- 类型：Cloudflare Workers 上的后端（以 “HTTP API + 鉴权 + D1/DB” 为主）
- 栈：`effect` + `@effect/platform` + `@effect/sql-d1`（并使用 `HttpApiScalar` / OpenAPI middleware）
- 关键入口：
  - `backend/src/index.ts`：用 `HttpApiBuilder.toWebHandler(HttpLive, { middleware })` 生成 handler，在 worker `fetch(request, env, ctx)` 中执行 `handler.handler(request)`，并用 `ctx.waitUntil(handler.dispose())` 做资源释放
- 契约与鉴权：
  - `backend/src/api.ts`：定义 `class Api extends HttpApi.make("api") ...` 并提供 `AuthorizationLive`
- HTTP composition root：
  - `backend/src/http.ts`：`HttpApiBuilder.Router.Live` + `HttpApiScalar.layer()` + `middlewareOpenApi()` + cors 等集中组装成 `HttpAppLive`

### 34) jensdev/effect-cats（Node + HttpApiBuilder：最小后端骨架 + 分层示例）

- 仓库：https://github.com/jensdev/effect-cats
- 类型：可运行 Node 后端示例；展示“契约 + group handlers + service/repo”最小分层
- 栈：`effect` + `@effect/platform` + `@effect/platform-node`
- 关键入口：
  - `main.ts`：用 `Config.number("PORT").pipe(Config.withDefault(...))` 读取端口；`HttpApiBuilder.serve(HttpMiddleware.logger)` + `HttpApiSwagger.layer()` + `NodeHttpServer.layer(...)`，最后 `Layer.launch(HttpLive).pipe(NodeRuntime.runMain)`
- 契约与 handlers：
  - `infrastructure/primary/contract.ts`：`HttpApi.make(...).add(catsApiGroup).add(healthApiGroup)`
  - `infrastructure/primary/cats.ts`：`HttpApiBuilder.group(contract, "cats", ...)`，在 handler 内通过 Tag 读取 service port

## 相关库（不一定是完整后端，但会影响服务端写法）

### effect-http（旧路线，偏库/工具集）

- sukovanej/effect-http：https://github.com/sukovanej/effect-http  
  说明：项目文档提到 `@effect/platform` 的 `HttpApi` 系列模块是其官方延续方向（该库偏“声明式 API + 派生客户端/OpenAPI”等）。
- tim-smart/effect-http：https://github.com/tim-smart/effect-http  
  说明：偏 HTTP toolkit（Node/Bun 运行），更接近“框架/工具”，不等同于一个完整业务后端仓库。

## “它们怎么写代码”的可复用心智模型

### A. Composition Root：入口只做 Layer wiring

典型结构是把所有能力拼成 `HttpLive`，最后 `Layer.launch`：

- HTTP Server：`NodeHttpServer.layer(createServer, { port, host? })`
- API/Router：`HttpApiBuilder.api(...)` 或 `HttpRouter.Default.use(...)`
- 中间件：`HttpMiddleware.logger` / cors / openapi / swagger / 自定义 middleware
- 基础设施：DB Layer / Migrator Layer / Tracing Layer / ConfigProvider Layer

### B. Contract-first：API 契约是单一事实源（推荐）

在 `Effect-TS/examples` 与 `typeonce-dev/effect-backend-example` 里，常见写法是：

- `HttpApi`/`HttpApiGroup`/`HttpApiEndpoint` 定义 **路径、payload、success、error、security**
- `HttpApiBuilder.group(Api, "groupName", (handlers) => handlers.handle(...))` 填充实现
- 统一在 `Http.ts`/`main.ts` 注入 cors/openapi/swagger 等跨切能力

优势：可自动生成 OpenAPI；更容易“前后端共享契约”；更符合“可回放/可解释”的工程化方向。

### C. Router-first：路由层显式解析与错误映射（更直观）

在 `Mumma6/effect-node-server` 里，典型 handler 结构是：

- 先 `schemaPathParams` / `schemaBodyJson` 解码（失败走 `ParseError`/`HttpBodyError`）
- 调用 service（service 再调用 repo / infrastructure）
- `Effect.catchTags(...)` 把领域错误映射成 HTTP status + JSON body
- `Effect.withSpan(...)` 给每条路由/SQL resolver/外部调用打点

### C2. Hybrid：`HttpLayerRouter` 把“契约路由”和“手写路由”合并

在 `HazelChat/hazel`、`lucas-barake/building-an-app-with-effect`、`kriegcloud/beep-effect` 里常见：

- `HttpLayerRouter.addHttpApi(SomeHttpApi)`：把契约转成 router
- `HttpLayerRouter.use((router) => router.add("GET", "/health", ...))`：追加手写路由
- `HttpLayerRouter.cors(...)` / `HttpMiddleware.*`：集中处理中间件
- `HttpLayerRouter.serve(AllRoutes)`：最后只用一次 serve 对外提供

好处：既保留契约（可生成 OpenAPI / 类型复用），又能把非契约路由（health、webhook、RPC/websocket gateway）收敛到同一条 Layer 启动链路里。

### D. Repo/Service/Infra：把副作用与编排拆开

- Repo：只管数据访问（SQL/查询/返回结构）
- Service：只管业务编排（Option/校验/聚合/事务边界的思考落点）
- Infra：只管外部系统（HTTP client / 重试 / 解码）

这三层都用 `Context.Tag` 暴露接口，用 `Layer.effect` 提供 Live 实现，便于替换测试实现。

### E. Serverless/Worker：把 Http layer 转成 `fetch(Request)` handler

在 “serverless/worker” 运行时里，常见写法是：

- `HttpApiBuilder.toWebHandler(HttpLive, { middleware })` 生成 `{ handler, dispose }`
- 平台入口（如 worker 的 `fetch`）只负责把 `Request` 交给 `handler.handler(request)`，并在请求结束后调用 `dispose()` 做资源释放（通常用 `waitUntil`）

## 对本仓（intent-flow）的直接借鉴点（可选）

- 如果希望“诊断/可解释链路”更强：优先采用 Spec-first（`HttpApi` + middleware + spans），让 API 契约也进入“可解释资产”。
- 如果希望最快落地一个 PoC 后端：可先按 Router-first 起步，但尽量把解析/错误映射固定成可复用 middleware 或 helper，避免散落。

## 附：本次调研用到的关键文件索引（便于复查）

- `typeonce-dev/effect-backend-example`
  - `apps/server/src/main.ts`
  - `apps/server/src/user.ts`
  - `apps/server/src/database.ts`
  - `apps/server/src/migrator.ts`
  - `packages/api/src/main.ts`
- `Mumma6/effect-node-server`
  - `index.ts`
  - `routes/routes.ts`
  - `routes/users/users.routes.ts`
  - `routes/movies/movies.routes.ts`
  - `domain/user/service/user.service.ts`
  - `domain/user/repository/user.repository.ts`
  - `domain/movies/infrastructure/movie.infrastructure.ts`
- `Effect-TS/examples`
  - `examples/http-server/src/main.ts`
  - `examples/http-server/src/Http.ts`
  - `examples/http-server/src/Api.ts`
  - `examples/http-server/src/Accounts/Api.ts`
  - `examples/http-server/src/Accounts/Http.ts`
  - `examples/http-server/src/Sql.ts`
- `lucaf1990/effect-mongodb-app`
  - `src/index.ts`
  - `src/Api/mainApi.ts`
  - `src/Api/mainApiLive.ts`
  - `src/Config/db.ts`
  - `src/Config/layer.ts`
  - `src/Configuration/configurationService.ts`
- `CapSoftware/Cap`
  - `apps/web-cluster/src/runner/index.ts`
  - `packages/web-backend/src/index.ts`
  - `packages/web-backend/src/Http/Live.ts`
  - `packages/web-backend/src/Auth.ts`
- `pawelblaszczyk5/naamio`
  - `apps/hermes/src/mod.ts`
  - `apps/hermes/src/modules/database/mod.ts`
- `tim-smart/stremio-effect`
  - `src/main.ts`
  - `src/Addon.ts`
  - `src/Tracing.ts`
- `PREreview/prereview.org`
  - `src/index.ts`
- `SmarakNayak/Vermilion`
  - `app/server/src/effectServer/effectServer.ts`
  - `app/server/server.ts`
- `TCotton/algoraveshare`
  - `apps/backend/src/effect-server.ts`
- `imMohika/cause`
  - `src/http/http.ts`
  - `src/main.ts`
- `harrysolovay/liminal`
  - `lmnl.im/worker/main.ts`
- `tim-smart/effect-bun-monorepo`
  - `packages/http/src/main.ts`
- `typeonce-dev/sync-engine-web`
  - `apps/server/src/main.ts`
  - `apps/server/src/group/sync-auth.ts`
  - `apps/server/src/group/sync-data.ts`
  - `apps/server/src/services/drizzle.ts`
- `FaithBase-AI/openfaith`
  - `backend/workers/runner.ts`
  - `backend/workers/README.md`
  - `backend/shard-manager/index.ts`
- `MichaelVessia/obsidian-api`
  - `src/server.ts`
  - `src/main.ts`
  - `src/tracing/tracer.ts`
- `nickbreaton/bluelinked`
  - `src/router.ts`
  - `src/platforms/bun.ts`
- `pawelblaszczyk5/effect-workflow-cluster-playground`
  - `runner.ts`
  - `schema.ts`
- `ghardin1314/effect-mcp`
  - `examples/server/src/sse.ts`
  - `examples/server/src/stdio.ts`
  - `examples/server/src/shared.ts`
- `harrysolovay/1b12`
  - `server/main.ts`
  - `server/ApiLive.ts`
  - `server/auth.ts`
- `rashedInt32/fullstack-effect-hive`
  - `apps/server/src/index.ts`
  - `apps/server/src/api/index.ts`
- `lucas-barake/building-an-app-with-effect`
  - `packages/server/src/server.ts`
  - `packages/domain/src/styles-rpc.ts`
  - `packages/server/src/domain/styles/styles-rpc-live.ts`
- `HazelChat/hazel`
  - `apps/backend/src/index.ts`
  - `apps/backend/src/http.ts`
  - `apps/cluster/src/index.ts`
- `kriegcloud/beep-effect`
  - `apps/server/src/server.ts`
  - `apps/server/README.md`
- `samueleguino97/effect-playground`
  - `server/src/index.ts`
  - `server/src/http.ts`
  - `server/src/rpc.ts`
  - `server/src/services/db.ts`
  - `server/src/services/auth.ts`
- `unknown/modo`
  - `packages/backend/src/index.ts`
  - `packages/backend/src/api/index.ts`
  - `packages/backend/src/api/transactions.ts`
- `ethanniser/effect-rpc-multi-protocol`
  - `src/server.ts`
  - `src/request.ts`
  - `src/handlers.ts`
  - `src/client.ts`
- `lloydrichards/base_bevr-stack`
  - `apps/server/src/index.ts`
  - `packages/domain/src/Api.ts`
  - `packages/domain/src/Rpc.ts`
  - `packages/domain/src/WebSocket.ts`
- `mpellegrini/fullstack-typescript-monorepo-starter`
  - `apps/effect-platform-fundamentals/src/index.ts`
  - `apps/effect-platform-fundamentals/src/api-live.ts`
  - `apps/effect-platform-fundamentals/src/api.ts`
  - `apps/effect-platform-fundamentals/src/main.ts`
- `smhmayboudi/effect-app-monorepo`
  - `packages/server/src/Server.ts`
- `SemStassen/mason-app`
  - `apps/server/src/index.ts`
  - `apps/server/src/api/index.ts`
  - `apps/server/src/middleware/auth.middleware.ts`
- `iapacte/iapacte`
  - `apps/server/src/index.ts`
  - `apps/server/src/api/live/api.ts`
  - `apps/server/src/api/live/better_auth.ts`
- `Makisuo/electric-proxy`
  - `backend/src/index.ts`
  - `backend/src/api.ts`
  - `backend/src/http.ts`
- `jensdev/effect-cats`
  - `main.ts`
  - `infrastructure/primary/contract.ts`
  - `infrastructure/primary/cats.ts`
