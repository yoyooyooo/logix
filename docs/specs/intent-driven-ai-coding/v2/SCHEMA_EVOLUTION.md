---
title: Schema 演进与兼容性合同
status: draft
version: 1
---

> v2 的所有 Spec（Intent/Pattern/Template/Plan/Flow/UseCase 等）在演进时必须遵守本合同，确保“Never break userspace”。

## 1. 变更级别

- **新增字段**：必须可选且有合理默认，不得改变既有语义。
- **修改字段语义/结构**：先标记为 `deprecated`，提供迁移说明与脚本，至少经历两个小版本后才可移除。
- **删除字段**：仅在 deprecated 期满后执行，并提供自动迁移。
- **破坏性变更**（必然导致旧资产失效）：必须提供双向迁移器或长期开启读时兼容层，且需在版本发布说明中明确标注。

## 2. ID 与引用

- 六类意图、Use Case、Flow、PlanAction、TemplateBinding 等均使用统一 ID 规范（前缀+语义）。
- 禁止裸字符串引用外部实体：Flow.trigger 必须引用 Interaction.eventId，PlanAction 必须引用 patternId/templateId/fileId 等注册 ID。
- 重命名原则：提供批量迁移工具保证引用同步；无法自动迁移时需阻断发布并给出人工修复指引。

## 3. 事实源与投影

- Data & State：优先将实体/API 绑定到外部 schema（OpenAPI/TS 类型）；Intent 中的结构视为投影而非事实源。
- Interaction：事件 `source/event` 只在 Interaction 中定义，Flow/Behavior 必须引用事件 ID。
- Code Structure：Plan/Template 路径受 best-practice 目录规范约束；路径变更需提供兼容映射或迁移。

## 4. Plan/Template 的幂等与冲突

- `create-file`：文件存在时不得覆盖用户代码，需 no-op 或显式报冲突。
- `modify-file`/`append-snippet`：应基于锚点/AST 的精确 patch；多次执行结果应一致。
- 执行前必须支持 dry-run diff，执行后可重复运行，不得出现重复片段。

## 5. 兼容性验证与发布流程

- 每次 schema 变更需更新本文件对应条目，并在 changelog 标注兼容性级别。
- 破坏性变更发布前，需在真实仓库跑通一次“旧资产 → 迁移 → 新资产”的端到端验证。
- CLI/LSP 应内置版本检查：检测到不兼容资产时给出明确错误与迁移建议。

## 6. 迁移工具原则

- 优先提供自动迁移脚本；无法自动化的部分需给出最小可执行的手动步骤。
- 保持迁移幂等：重复运行不得损坏已迁移资产。
- 迁移脚本自身版本化，并在发布中记录适用范围与回退策略。
