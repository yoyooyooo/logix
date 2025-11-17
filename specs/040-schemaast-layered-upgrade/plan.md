# Implementation Plan: SchemaAST 分层能力升级（040：Schema Registry + schemaId 引用）

**Branch**: `040-schemaast-layered-upgrade` | **Date**: 2025-12-26 | **Spec**: `specs/040-schemaast-layered-upgrade/spec.md`  
**Input**: `specs/040-schemaast-layered-upgrade/spec.md`

## Summary

040 的目标是把 `effect/Schema` 的结构信息升级为 Logix 全链路可消费的“统一 schema 工件”，并在运行时/诊断/协议中用 `schemaId` 做稳定引用：

- **统一 Schema Registry（会话级）**：可导出/导入（JSON 可序列化），支持离线解释与回放。
- **稳定 schemaId（去随机化）**：同一语义的 schema 在不同运行/不同环境下产出一致标识；事件/IR/协议只携带引用，避免 payload 膨胀。
- **诊断与协议 schema 化**：诊断事件继续保持 slim（JsonValue 摘要），但能被 schema-aware 地解释；Sandbox 协议对非法消息给出结构化错误而非静默忽略。

本特性不承诺一次性把所有事件/协议完全 schema 化；采取“先 registry + 引用锚点，再逐步覆盖”的分期策略。

## Technical Context

**Language/Version**: TypeScript 5.8.2（workspace）+ Node.js 22.x  
**Primary Dependencies**: `effect` v3（workspace override 固定到 `3.19.13`）、`@logix/core`、`@logix/sandbox`（以及 Devtools/Workbench 消费方）  
**Storage**: N/A（以可序列化 JSON 工件导出/导入，不引入持久化存储）  
**Testing**: Vitest（Effect-heavy 场景优先用 `@effect/vitest`）  
**Target Platform**: Node.js（CI/脚本/试跑）+ 现代浏览器（Sandbox Worker / Workbench）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:
- 默认近零开销：diagnostics=off 时，热路径不新增显著分配或 O(n) 扫描；SchemaAST 的归一化/摘要计算必须避开事务窗口与常驻路径。
- diagnostics=on 的额外成本可预算：每条事件只新增 `schemaId` 等 slim 字段；registry 查询必须是 O(1) 映射查找。
- 度量方式：在落地阶段提供可复现基线（脚本/benchmark 或 profile），并写入本特性后续 perf 产物（统一纳入 `logix-perf-evidence`，入口为 `pnpm perf`）。
**Constraints**:
- 统一最小 IR（Static IR + Dynamic Trace）必须可引用 schema，并保持可 JSON 序列化。
- 诊断事件必须 Slim & 可序列化（禁止把大型对象图/闭包塞进事件）；敏感字段必须可投影/脱敏。
- `schemaId` 计算必须发生在 schema 定义/注册期并缓存；严禁在运行期事件发射/Action 调用路径动态计算（避免 diagnostics=on 热点）。
- 协议与对外事件演进拒绝向后兼容：breaking change 必须用迁移说明替代兼容层。
**Scale/Scope**:
- P0 聚焦“schema registry + schemaId 引用 + contracts 固化”；
- P1 才逐步覆盖更多事件/协议/资产节点；
- 不交付完整 Studio/编辑器产品形态（仅提供稳定工件与可解释链路）。

## Key Risks & Mitigations

- **SchemaAST 序列化稳定性**：以 `astJson = JSON.parse(JSON.stringify(schema.ast))` 作为 canonical 输入，并用 Golden Master Tests 锁定常见 schema 的 `astJson/schemaId`；effect 升级导致漂移视为 breaking 信号，必须显式出迁移口径。
- **递归/裁剪（早期决策）**：递归 schema 必须可导出且不崩溃；registry pack 的预算/截断口径在实现早期先定（否则会影响 schemaId/解释链路）。
- **Registry 导出体积（未来规模）**：`SchemaRegistry.export()` 需要预留 `filter`/`chunk` 参数（即使 v1 默认全量），避免模块数量巨大时一次性导出超大 JSON；并要求 chunk 输出具备稳定顺序与可合并语义。
- **Devtools 容错**：消费者必须对未知 `schemaId` 有降级 UI（Unknown Type + 原始 JsonValue），严禁白屏或未捕获异常。
- **性能预算**：schemaId/归一化只在定义/注册期计算并缓存；JSONSchema 生成仅用于导出/离线契约，不进入运行期热路径。

## Constitution Check

*GATE: Phase 0 研究前必须通过；Phase 1 设计后再次复查。*

- **链路映射（Intent → Flow/Logix → Code → Runtime）**：
  - schema 定义来自模块/契约（Code），被注册为可导出工件（Runtime），并作为 IR/Trace/协议的解释锚点（Intent/Flow/Devtools/Workbench 消费）。
- **依赖/修改的 SSoT（docs-first）**：
  - 资产与 schema 的平台约束：`docs/specs/intent-driven-ai-coding/03-assets-and-schemas.md`
  - 运行时/Flow 执行与图码同步背景：`docs/specs/intent-driven-ai-coding/97-effect-runtime-and-flow-execution.md`
  - Devtools/诊断事件口径：`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
  - 统一可序列化 JsonValue 基线（事件/协议）：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- **Effect/Logix 契约变化**：
  - 计划引入显式可注入的 `SchemaRegistry`（Runtime Service）与若干 schema-aware 辅助 API；必须沉淀到 runtime SSoT（新增/更新 `.codex/skills/project-guide/references/runtime-logix/**` 对应章节）。
- **IR & anchors（统一最小 IR）**：
  - Static IR / Evidence / Trace 必须能引用 `schemaId`（而非携带全量结构）；registry pack 作为可选附属工件提供解释能力，避免并行事实源。
- **Deterministic identity**：
  - `schemaId` 必须由稳定字段派生或由显式注解提供（禁止随机/时间戳默认）；并与现有 `instanceId/txnSeq/opSeq` 的稳定性约束一致。
- **Transaction boundary（事务窗口禁止 IO）**：
  - schema 归一化/导出/导入属于事务外路径；事务窗口内不得触发 registry 导出或 JSONSchema 生成。
- **Internal contracts & trial runs（DIP/可 Mock/可隔离）**：
  - registry 与协议解码器必须是可注入契约，支持按实例/会话替换；导出证据不得依赖进程级全局单例才能完成。
- **Performance budget（热点与回归防线）**：
  - 触及路径：Module/Action schema 记录、Devtools 事件发射（仅在 diagnostics=on）、Sandbox 协议解码（仅在消息边界）。
  - 回归防线：落地时补齐可复现基线与预算阈值，并在任务阶段明确如何对比（脚本输出/报告）。
- **Diagnosability & explainability**：
  - 协议/事件解码失败必须产出结构化错误（字段路径 + 期望结构摘要 + 分类），并保持 payload slim、可序列化。
- **Breaking changes**：
  - 若新增/调整事件协议字段或 Sandbox on-wire shape，必须在本特性文档里提供迁移说明（不做兼容层）。
- **Public submodules**：
  - 若改动 `packages/*` 对外 API，必须遵守 030 public submodules 规则（barrel + internal 下沉，exports 不暴露 internal）。
- **质量门槛（Pass 定义）**：
  - 落地时至少通过：`pnpm typecheck`、`pnpm lint`、`pnpm test`；且补齐本特性的性能基线/对比证据。

**Phase 1 复查结论（基于本 plan 产物）**：PASS（当前仅固化数据模型与 contracts；进入实现阶段时必须补齐性能基线、诊断预算与迁移说明）。

## Phases

### Phase 0（Research）：确定 SchemaAST 工件形态与稳定标识策略

- 明确 `effect/Schema` 的 AST/annotations 能力与序列化边界（基于本地 `effect` d.ts 裁决）。
- 明确 `schemaId` 生成策略：显式注解优先 vs 结构派生；派生算法的稳定性与碰撞风险。
- 明确 registry pack 的最小 shape、预算与降级语义（未知 schemaId 的展示/解码如何处理）。
- 明确 Sandbox 协议的校验策略与错误分类（握手/版本不兼容/字段缺失/类型不匹配）。

### Phase 1（Design & Contracts）：固化数据模型与 schema（040 的可验收事实源）

- 在 `specs/040-schemaast-layered-upgrade/contracts/schemas/` 固化：
  - `schema-registry-pack.schema.json`（registry 导出工件；概念域 `@logix/schema.registry@v1`）
  - `schema-ref.schema.json`（事件/IR/协议引用 schema 的最小基元）
  - `schema-diff.schema.json`（schema 变更影响摘要的最小形态）
- 在 `data-model.md` 固化：
  - registry pack、schema entry、schema annotations（UI/PII/投影策略）的字段语义与预算边界
  - 与 031 artifacts / 036 contract suite 的组合方式（registry 作为可选附属工件）
- 在 `quickstart.md` 写清：
  - 开发者如何为模块/协议提供 schema 并导出 registry pack
  - Workbench/Devtools 如何在离线环境解释事件/IR（基于 schemaId + registry）

### Phase 2（准备进入 `$speckit tasks`）

- 将实现拆成可执行任务：core registry service、schemaId 计算与缓存、事件引用字段、sandbox 协议 decode/错误事件、回归与基线脚本、迁移说明与文档回写。

## Project Structure

### Documentation（本特性）

```text
specs/040-schemaast-layered-upgrade/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── schemas/
```

### Source Code（预计相关目录；不在本阶段承诺实现）

```text
packages/logix-core/
├── src/
│  ├── Module.ts                         # 模块定义处：记录 state/actions schema 元数据（引用 schemaId）
│  ├── Debug.ts / Runtime.ts             # 诊断等级与证据导出开关（schema-aware 扩展点）
│  └── [planned] SchemaRegistry.ts       # 对外入口（public submodule；含实际实现）
└── src/internal/
   ├── digest.ts                         # stableStringify/fnv1a32（可复用作 schemaId 派生）
   ├── reflection/                       # 现有：Static IR/TrialRun/Manifest 等导出链路（计划引用 schemaId）
   └── runtime/core/DebugSink.ts         # 现有：Slim 事件/JsonValue 投影（计划增加 schemaRef 语义）

packages/logix-sandbox/
└── src/
   ├── Protocol.ts                       # Host↔Worker 协议类型（计划补充 schema-aware decode/错误事件）
   └── internal/worker/sandbox.worker.ts # Worker 边界：消息解码与错误归因（计划替换静默 ignore）

packages/logix-devtools-react/
└── src/                                 # schema-aware 解释视图（消费方；仅引用工件/协议，不读内部对象图）

docs/specs/intent-driven-ai-coding/
├── 03-assets-and-schemas.md             # 资产/SchemaAST 的平台裁决（计划回写）
└── 99-glossary-and-ssot.md              # 术语（schemaId/registry pack/schemaRef）对齐（按需回写）
```

**Structure Decision**：

- 040 的交付以“可序列化工件 + 版本化 schema + schemaId 锚点”为裁判；具体 UI/Runner 形态属于消费者实现，可替换。
- 对外 API 的新增优先以 `@logix/core` public submodule 暴露；共享实现下沉到 `src/internal/**`，避免内部实现泄露到 exports。

## Complexity Tracking

无。若后续为了“更强 schemaId 抗碰撞/跨版本兼容”不得不引入更重的摘要算法或额外缓存层，必须在此登记其成本、替代方案与退出计划。
