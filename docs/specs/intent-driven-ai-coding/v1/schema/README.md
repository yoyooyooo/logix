---
title: Intent/Pattern/Template/Plan Schema 与校验
status: draft
version: v1
---

> 本目录下的 JSON Schema 描述了 v1 版本中 Intent / Pattern / Template / Plan 的“硬骨架”。  
> 目标是：让 YAML/JSON 资产可以被工具和 LLM 严格解析、校验和演进，而不是依赖隐含约定。

## 1. Schema 文件一览

- `pattern.schema.json`
  - 约束 Pattern 定义的结构（id/name/summary/applicability/composition.roles/paramsSchema/uiSchema 等）；
  - 预留了 version/status/changelog/capabilities/servicesProvided/servicesRequired 等字段；
  - 示例对应文件：`../patterns/table-with-server-filter.pattern.yaml` 等。
- `intent.schema.json`
  - 约束 Intent 资产的结构（id/title/scene/patterns/domain/runtimeFlows 等）；
  - 支持 scene.layout/actors/flows/domain.entities/apis；
  - 示例对应文件：`../intents/order-management.intent.yaml`、`../intents/ops-workbench.intent.yaml` 等。
- `template.schema.json`
  - 约束 Template Meta 的结构（id/name/description/runtimeBindings/patterns/params 等）；
  - 示例对应文件：`../templates/order-list-feature-skeleton.template.yaml`、`../templates/workbench-feature-skeleton.template.yaml`。
- `plan.schema.json`
  - 约束 Generation Plan 的结构（intentId/version/status/actions[] 等）；
  - 示例对应文件：`../plans/order-management.plan.json` 以及 PoC 执行时生成的 Plan 对象。

## 2. 约定与演进策略

- Schema 以 draft-07 为基础，约束“必须有的字段”和关键结构形状；
- 为未来演进预留了大量可选字段（如 status/changelog/capabilities/securityRequirements 等）：
  - 初期标记为可选（不破坏现有 YAML）；
  - 后续可在平台成熟后按需提升为必填。
- 所有 Schema 均允许 `additionalProperties: true`，以适应 PoC 阶段的动态试验字段；
  - 对于真正要长期保留的字段，应同步补充到 Schema 中，避免“幽灵字段”。

## 3. 校验策略（规划）

短期（PoC 阶段）：

- PoC CLI / 脚本可以只在开发者主动执行时调用 Schema 校验（例如通过 Ajv 等库）；
- 将校验脚本封装为一个简单命令，例如：
  - `node scripts/validate-intent-schemas.mjs`
  - `node scripts/validate-pattern-schemas.mjs`

中期（平台 UI 出现后）：

- Intent Studio / Pattern Studio / Template 编辑器在保存前必须通过 Schema 校验；
- YAML 预览仅作为“权威视图”，但不允许绕过 Schema 往里写不合法字段；
- CLI 的 `imd intent plan` / `imd intent apply` 在执行前也应校验相关文件。

长期：

- 当 Pattern/Template/Plan 引入 version/status/changelog 等字段后，
  可基于 Schema 进一步检查兼容性（例如 Plan 引用的 patternId@version 是否存在）。

## 4. 与其它文档的关系

- `01-overview.md` / `02-patterns-and-intents.md`：
  - 解释 Intent/Pattern 的语义与分层；
  - 本目录的 Schema 则是它们在文件中的物理形态约束。
- `04-platform-design.md` / `06-platform-ui-and-interactions.md`：
  - 描述平台 UI 工作流（Intent Studio / Pattern Studio / Plans）；
  - Schema 是这些 UI 表单的后端契约。
- `08-flow-dsl-and-ast.md` / `services.md`：
  - 描述 Flow DSL / AST 与 Service ID；
  - Intent Schema 中的 `runtimeFlows` 与 Pattern Schema 中的 `servicesProvided/servicesRequired` 将与之对齐。

在 v1 中，Schema 的主要目标是“把骨架定下来”，  
后续可以围绕这些 Schema 渐进实现 CLI 校验、UI 表单约束和版本兼容检查。 

