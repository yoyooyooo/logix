# Quickstart: SchemaAST 分层能力升级（040：schemaId + registry pack）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/040-schemaast-layered-upgrade/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/040-schemaast-layered-upgrade/plan.md`

## 0) 目标一句话

让 Logix 的状态/动作/协议/诊断具备“可解释 schema”：运行期只携带 `schemaId`（Slim），离线通过 registry pack 解释与校验（Fat）。

## 1) 你会拿到三类基础能力

1. **schemaId**：同一语义的 schema 在不同运行中稳定一致，可作为事件/IR/协议的引用锚点。
2. **Schema Registry（会话级）**：可查询、可导出/导入（JSON 可序列化），支持离线解释。
3. **contracts（JSON Schema）**：用于 CI/Workbench/跨语言消费者的契约守卫（`contracts/schemas/*`）。

## 2) 最小消费方式（离线解释 / Workbench）

1. 从一次 trial-run / evidence / 导出工件中获取 registry pack（建议作为可选 artifact：`@logixjs/schema.registry@v1`）。  
2. 在工具侧加载 registry pack，并建立 `schemaId -> SchemaEntry` 的索引。  
3. 当看到某条事件/IR/协议消息携带 `schemaRef.schemaId` 时：  
   - 能找到 → 用对应 schema 解释字段含义/约束/注解；  
   - 找不到 → 降级为“安全摘要 + 缺失原因提示”，但仍可展示原始 JsonValue。

## 3) Sandbox 协议的最小收益（可解释失败）

- 对 Host↔Worker 的消息，在边界解码时做 schema 校验：  
  - 合法 → 继续处理；  
  - 非法 → 产出结构化错误事件（字段路径 + 分类 + 最小上下文），并保持会话继续可用。  
- 版本不兼容必须在握手阶段明确拒绝（携带双方版本与兼容性结论）。

## 4) 迁移/演进原则（不做兼容层）

- 任意破坏性演进通过 `@logixjs/schema.*@vN` 与 `protocolVersion=vN` 承载；提供迁移说明替代兼容层。
- schemaId 生成策略若升级（例如更强摘要算法），必须版本化并能在 diff/CI 中被清晰识别。

## References

- 诊断事件 SSoT：`docs/ssot/runtime/logix-core/observability/09-debugging.md`
- JsonValue 硬门：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- artifacts 体系：`specs/031-trialrun-artifacts/spec.md`
