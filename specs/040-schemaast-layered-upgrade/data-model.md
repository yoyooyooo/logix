# Data Model: SchemaAST 分层能力升级（040：Schema Registry / schemaRef / schemaDiff）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/040-schemaast-layered-upgrade/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/040-schemaast-layered-upgrade/plan.md`

> 本文件固化 040 的“协议/工件层”数据模型：用于 Devtools/Workbench/CI/离线回放解释。  
> 不规定具体 UI 实现与内部代码结构（实现细节在 tasks 阶段落地）。

## Design Principles

- **确定性与可序列化**：所有可导出的工件必须是 JsonValue；稳定排序、稳定字段，禁止时间戳/随机作为语义输入。
- **Slim 事件，胖工件**：运行期事件只携带 `schemaId` 等引用锚点；需要结构解释时，通过 registry pack 按需加载。
- **版本化协议域**：任何协议/工件都必须有 `@logix/*@vN` 概念域命名与 `protocolVersion` 字段；破坏性演进用版本号升级承载。
- **无全局单例**：registry/解码器等必须是可注入契约，可按实例/会话替换与 Mock。
- **预算受控**：registry pack 的体积与导出策略必须可配置；超限需要显式截断与可解释原因。

## Protocols（统一 `@logix/schema.*` 概念域）

### `@logix/schema.registry@v1`（SchemaRegistryPack）

Schema Registry 的可序列化导出工件，用于离线解释与回放。

Canonical schema：`specs/040-schemaast-layered-upgrade/contracts/schemas/schema-registry-pack.schema.json`

### `@logix/schema.ref@v1`（SchemaRef）

事件/IR/协议引用 schema 的最小基元。

Canonical schema：`specs/040-schemaast-layered-upgrade/contracts/schemas/schema-ref.schema.json`

### `@logix/schema.diff@v1`（SchemaDiff）

用于表达 schema 变更影响摘要（破坏性 vs 非破坏性），供 CI/评审/迁移说明使用。

Canonical schema：`specs/040-schemaast-layered-upgrade/contracts/schemas/schema-diff.schema.json`

## Entities

### SchemaRegistryPack

- `protocolVersion`: `"v1"`
- `effectVersion`: effect 运行时版本（用于解释漂移的归因线索）
- `schemas[]`: `SchemaEntry[]`（建议按 `schemaId` 稳定排序，避免 diff 噪音）
- `notes?`: JsonValue（可选：预算/截断/导出策略摘要）

### SchemaEntry

- `schemaId`: 稳定引用锚点（显式注解或结构派生）
- `ast`: JsonValue（SchemaAST 的 JSON 表示）
- `jsonSchema?`: JsonValue（可选：JSON Schema/OpenAPI 载体；供跨语言消费）
- `meta?`：
  - `title?` / `description?` / `docsUrl?`
  - `tags?`: string[]
  - `privacy?`: `{ pii?: boolean; redaction?: "mask" | "drop" | "hash" | string }`（示例；具体策略以 contracts 为准）
- `annotations?`: JsonValue（Schema annotations 的可序列化投影；用于 UI/诊断投影策略等）

### SchemaRef

- `schemaId`: 引用目标
- `kind?`: `"state" | "action" | "protocol" | "event" | "node" | "service" | string`（仅用于解释展示，不参与语义裁决）
- `hint?`: JsonValue（可选：消费者展示提示，例如字段路径/来源摘要；必须保持 slim）

### SchemaDiff

- `fromSchemaId` / `toSchemaId`
- `breaking`: boolean
- `summary`: string（面向人类的摘要）
- `changes[]`: `{ kind: string; path?: string; message: string }[]`（最小可行动信息）

## Cross-Spec References

- JsonValue 硬门：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- artifacts 槽位（registry pack 可作为可选 artifact）：`specs/031-trialrun-artifacts/spec.md`
- 集成验收入口（未来可把 schema diff 纳入 Contract Suite）：`specs/036-workbench-contract-suite/spec.md`
