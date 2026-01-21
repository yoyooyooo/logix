# Contracts: 016 可序列化诊断与稳定身份

本目录存放本特性的“契约层”产物（跨 005/011/013 的横切硬约束）：

- 导出/跨宿主负载必须可 JSON 序列化（以 `specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json` 为硬门）
- 实例锚点必须为 `moduleId + instanceId`（单一事实源）
- 错误原因必须降级为 `SerializableErrorSummary`（禁止透传不可序列化 `cause`）

schemas：

- `schemas/module-runtime-identity.schema.json`：实例锚点（复用 011 schema）
- `schemas/serializable-error-summary.schema.json`：错误摘要（复用 011 schema）
- `schemas/exportable-runtime-debug-event-ref.schema.json`：可导出的 Debug 事件引用形态（以 005 schema 为裁决源；016 仅作为收敛入口与引用点）

补充合同（增量）：

- 可导出 `meta` 必须为 Slim `JsonValue`（纯 JSON 值）；裁剪/降级口径以 `packages/logix-core/src/internal/observability/jsonValue.ts` 为权威。
- Trait 侧 `TraitMeta` 白名单与 sanitize 以 `packages/logix-core/src/internal/state-trait/meta.ts` 为权威；任何被裁剪/降级都必须可解释且可被 Devtools 观察到（对齐 `docs/ssot/platform/contracts/03-control-surface-manifest.md`）。
