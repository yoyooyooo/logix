# Quickstart: SchemaAST 分层能力升级（040：schemaId + registry pack）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/040-schemaast-layered-upgrade/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/040-schemaast-layered-upgrade/plan.md`

## 0) 目标一句话

让 Logix 的状态/动作具备“可解释 schema”：运行期导出稳定 `schemaId`，工具侧通过 registry pack 离线解释与校验（解释材料，不作为平台事实源）。

## 1) 你会拿到三类基础能力

1. **schemaId**：同一语义的 schema 在不同运行中稳定一致，可作为 IR/报告的引用锚点。
2. **SchemaRegistryPack@v1**：导出为 TrialRun artifact（`@logixjs/schema.registry@v1`），内容 JSON-safe，可被工具离线索引。
3. **contracts（JSON Schema）**：用于 CI/Workbench/跨语言消费者的契约守卫（`contracts/schemas/*`）。

## 2) 最小消费方式（CLI / Contract Suite）

推荐入口：用 036 的 Contract Suite 生成最小事实包（Context Pack），并默认携带 registry pack 的 `value`（白名单机制，避免全量泄露）。

1. 运行 `logix contract-suite run ... --includeContextPack`，获得 `contract-suite.context-pack.json`。  
2. 在工具侧加载 `ContractSuiteContextPack@v1.facts.trialRunReport.artifacts['@logixjs/schema.registry@v1'].value`。  
3. 建立 `schemaId -> entry` 索引（`SchemaRegistryPack.schemas[]`）。  
4. 当看到某条事实/报告引用 `schemaId`：能命中就解释；不能命中就降级为安全摘要（不阻塞 gate）。

## 3) 本次 v1 不做什么（后续增量）

- 诊断事件/证据链 schemaRef 化（US2）
- Sandbox 协议 schema 校验与结构化错误事件（US3）
- ServiceContract 等边界契约资产化（US4）

## 4) 迁移/演进原则（不做兼容层）

- 任意破坏性演进通过 `@logixjs/schema.*@vN` 与 `protocolVersion=vN` 承载；提供迁移说明替代兼容层。
- schemaId 生成策略若升级（例如更强摘要算法），必须版本化并能在 diff/CI 中被清晰识别。

## References

- 诊断事件 SSoT：`docs/ssot/runtime/logix-core/observability/09-debugging.md`
- JsonValue 硬门：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- artifacts 体系：`specs/031-trialrun-artifacts/spec.md`
