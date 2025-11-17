# handoff（effect-ts-backend-open-source）

## 当前状态

- 已在 `docs/research/effect-ts-backend-open-source/README.md` 收录并验证了 34 个“可运行服务端/后端工程或强相关示例”，并沉淀了 4 类主流写法：Spec-first / Router-first / Hybrid（`HttpLayerRouter`）/ Fetch-first（`HttpApiBuilder.toWebHandler`）。
- “关键文件索引”已覆盖每个仓库的最短复查路径（入口文件 + 关键实现文件）。

## 准入标准（后续继续加条目时保持一致）

- 优先收录 **有明确 server entry** 的仓库：
  - 传统服务端入口：`NodeRuntime.runMain` / `BunRuntime.runMain` / `Layer.launch + Effect.runPromise` 等
  - Serverless/Worker 入口：`export default { fetch(...) { ... } }` + `HttpApiBuilder.toWebHandler(...)` 等
  - 并能定位到至少一个“对外提供 HTTP/RPC/Workflow transport”的落点文件
- 每个条目至少给出：仓库链接 + 入口文件路径 + 1–3 个关键实现文件路径（便于复查与学习写法）。

## 推荐继续扩展的方向

1. **Effect RPC / WebSocket**：以 “RPC contract + transport + auth/context 注入” 为维度做横向对比（`HazelChat/hazel`、`lloydrichards/base_bevr-stack`、`ethanniser/effect-rpc-multi-protocol` 都是很好的 baseline）。
2. **Cluster / Workflow**：补齐“runner + shard manager + storage”三件套的常见 wiring 形态，特别关注错误语义与可观测性（`openfaith`、`HazelChat/hazel`、`effect-workflow-cluster-playground` 已覆盖一部分）。
3. **Observability（Tracing/Logging）**：对比 `Otlp.layer` / `NodeSdk.layer` 的落点与注入策略、以及对 health/OPTIONS 等降噪策略（`HttpMiddleware.withTracerDisabledWhen`）。
4. **DB 分层**：对比 `@effect/sql*`、`drizzle-orm`、MongoDB 的 repo/service 组织方式，以及迁移/初始化的 Layer 形态。

## 可复用的 GitHub Code Search 关键词（命中率高）

- `HttpApiBuilder.serve` / `HttpApiBuilder.api` / `HttpApiBuilder.group`
- `HttpApiBuilder.toWebHandler`
- `HttpLayerRouter.addHttpApi` / `HttpLayerRouter.serve` / `HttpLayerRouter.cors`
- `NodeRuntime.runMain` / `BunRuntime.runMain` / `Layer.launch`
- `HttpApiSwagger.layer` / `HttpApiScalar.layer` / `middlewareOpenApi`
- `WorkflowProxyServer.layerHttpApi` / `ClusterWorkflowEngine.layer` / `BunClusterSocket.layer` / `NodeClusterSocket.layer`
- `RpcServer.layerHttpRouter` + `protocol: "websocket"` + `RpcSerialization.layerNdjson`

## 线索池（待进一步验证/不一定是“完整后端”）

- `cometkim/nodejs-framework-benchmark`：包含 effect 相关实现但偏 benchmark（可作为性能/启动路径参考）。
- `Effect-TS/effect-days-2025-workshop`、`FizzyElt/effect-ts-examples`、`drekembe/effect-presentation-cx`：偏 workshop/presentation，但可能有可抄的最小服务端骨架。
- `mikearnaldi/effect-trpc`：偏集成库（非后端工程），但可作为“RPC 生态桥接”参考候选。
