# Research: SchemaAST 分层能力升级（040：Schema Registry + schemaId 引用）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/040-schemaast-layered-upgrade/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/040-schemaast-layered-upgrade/plan.md`

> 本文件只固化“关键裁决/权衡”，避免实现细节漂移为某个宿主/工具的特殊规则。  
> 诊断事件口径以 runtime SSoT 为准：`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`

## Decisions

### D001：SchemaAST 作为“结构事实源”，JSONSchema 作为“对外契约/校验载体”

**Decision**：

- 运行时内部以 `effect/Schema` 的 `schema.ast: SchemaAST.AST` 作为结构事实源（可读、可反射、可做注解与寻址）。
- 对外 contracts（`contracts/schemas/*.schema.json`）优先以 JSON Schema（2020-12）固化最小可验收形态；必要时可从 SchemaAST 生成 JSONSchema（`effect/JSONSchema.make` / `fromAST`）。

**Rationale**：

- SchemaAST 更适合“可解释链路/反射/生成 UI”；JSONSchema 更适合“跨语言/跨宿主契约守卫”。
- 两者并存但分工明确，可避免把某一侧的工具限制强行带入另一侧。

### D002：SchemaAST 的序列化以 `toJSON()` + stableStringify 为准

**Decision**：

- SchemaAST 节点在类型层具备 `toJSON(): object`；导出/摘要使用“JSON 表示”而不是直接遍历 AST 实例对象。
- Canonical 形式定义为：`astJson = JSON.parse(JSON.stringify(schema.ast))`（利用 `toJSON()`，并规避函数/闭包字段）。
- 统一使用 `packages/logix-core/src/internal/digest.ts` 的 `stableStringify(astJson)` 做确定性归一化（对象 key 字典序）。

**Rationale**：

- 输出必须可 diff、可回放；不能依赖对象插入序或宿主差异。
- 避免直接遍历 AST 实例对象导致把 `Suspend.f`、Refinement/Transformation 等闭包字段降级为 null，从而产生“同形不同义也同 id”的碰撞风险。
- stableStringify 的降级策略（不可表达值→null）与“跨宿主 JsonValue 硬门”一致。

### D003：schemaId 策略：显式注解优先，否则结构派生（v1）

**Decision**：

- 若 schema 上存在 `SchemaIdAnnotation`（`effect/SchemaAST.getSchemaIdAnnotation(schema.ast)`），则以其为 `schemaId`（作为显式稳定锚点）。
- 否则以结构派生：`schemaId = fnv1a32(stableStringify(astJson))`（v1），并通过协议版本化保留未来升级空间。
- 对包含运行时闭包语义的 schema（例如 Refinement/Transformation），若希望 `schemaId` 随语义变更而变化，应强制要求显式注解（否则结构派生只反映“形状”，不反映闭包实现差异）。

**Rationale**：

- 显式注解适合“跨项目复用/手工命名的稳定契约”；结构派生适合“默认零配置”与批量生成。
- `schemaId` 作为引用锚点必须去随机化；派生算法需要可解释且可复现。

### D006：锁定 schemaId/AST JSON 的 Golden Master Tests（防漂移）

**Decision**：

- 在实现 `SchemaRegistry` 时引入 Golden Master Tests（快照/固定样例），覆盖一组代表性 schema，并锁定：
  - `astJson`（canonical JSON 表示）
  - `schemaId`（显式注解与结构派生两条路径）
- 当 effect 升级导致 AST JSON 形态变化、或 schemaId 漂移：
  - 将其视为破坏性变化信号；必须同步更新迁移说明/消费者降级策略，而不是静默放过。

**Rationale**：

- schemaId 与 AST JSON 是工具链解释链路的“事实源”；漂移会直接导致 CI/回放/Devtools 解释不一致。
- Golden tests 不是为了阻止升级，而是为了让升级“必须显式审阅并给出迁移口径”。

### D007：消费者必须容错未知 schemaId（Devtools/Workbench）

**Decision**：

- 当消费者收到引用了未知 `schemaId` 的事件/IR：必须降级展示为“Unknown Type (${schemaId}) + 原始 JsonValue”，并提供可行动提示（例如缺少 registry pack/版本不匹配/顺序未到）。
- 严禁因为未知 schemaId 导致白屏或抛出未捕获异常。

**Rationale**：

- 分布式/异步/分段加载场景下，事件与 registry 的到达顺序无法假设；容错是稳定性底线。

### D008：schemaId 必须在定义/注册期计算并缓存（禁止热路径动态计算）

**Decision**：

- `schemaId` 计算与 `astJson` 归一化只允许发生在 schema 定义/注册期（例如 Module.make / SchemaRegistry.register），并进行缓存（避免重复 `JSON.stringify`/`stableStringify`）。
- 运行期事件发射/Action 调用路径只读取已缓存的 `schemaId`/schemaRef，不得动态计算。

**Rationale**：

- 即使 registry 查找是 O(1)，`JSON.stringify + stableStringify` 仍可能成为 diagnostics=on 的隐藏热点；必须把成本前移并可预算。

### D004：Schema Registry 是会话级 Runtime Service（禁止全局单例）

**Decision**：

- Schema Registry 以“显式可注入契约（Tag/Layer）”存在，支持按实例/会话替换与 Mock。
- 导出/导入产物是可序列化 pack（registry pack），可作为 TrialRun/Evidence 的附属工件供离线消费。

**Rationale**：

- 与“strict by default / no global fallback”的运行时原则一致，避免隐式全局状态破坏确定性与可测试性。

### D0041：Registry 导出需预留 filter/chunk（Lazy Export）

**Decision**：

- `SchemaRegistry.export()` 必须支持可选参数以限制导出规模（例如 `filter` 或 `chunk`），默认行为仍可为“全量导出”。
- `chunk` 输出必须可合并且顺序稳定（消费者可按 `schemaId` 去重合并），避免 chunk 化引入 diff 噪音。

**Rationale**：

- 模块数量巨大时，一次性导出全量 schema 可能产生超大 JSON；Lazy Export 是“规模上限”的保险栓。

### D005：协议边界必须可解释失败（Sandbox 优先）

**Decision**：

- Host↔Worker 消息的解码失败必须产出结构化错误（字段路径 + 分类 + 最小上下文），禁止静默 ignore malformed。
- 版本不兼容必须在握手阶段明确拒绝（携带双方版本与兼容性结论）。

**Rationale**：

- Sandbox 是对齐实验室基础设施；协议错误必须可复现、可解释，否则会把问题推向不可诊断的黑盒。

### D0051：递归/循环保护必须是“可控失败”而非崩溃

**Decision**：

- 在 schemaId 派生与任何 stable stringify/归一化路径中，必须加入循环引用检测（`WeakSet`/`WeakMap`），将“潜在崩溃”升级为可控失败：
  - 要么产出可解释的错误（提示需要显式 `SchemaIdAnnotation` 或调整 schema 写法）；
  - 要么降级为确定性的占位输出（但必须记录 downgrade 原因）。

**Rationale**：

- 递归 schema 属于合法输入；构建期/导出期不应因为循环引用导致堆栈溢出或进程崩溃。

## Open Questions（后续 tasks 阶段收敛）

1. `schemaId` 派生算法的抗碰撞要求：v1 是否足够，何时升级到更高位数/更强摘要（同时保持跨宿主一致）？
2. `schemaId` 是否需要显式纳入 `effect` 版本/协议版本作为前缀（用于处理 effect AST 形态变化带来的解释漂移）？
3. registry pack 是否同时携带 `JSONSchema`（便于跨语言消费者）还是仅携带 SchemaAST（由消费者按需生成）？
4. SchemaAST 的递归/循环引用在导出与 JSONSchema 生成中如何表达与裁剪（预算/截断口径）？

## References

- effect d.ts（本地裁决源）：`node_modules/effect/dist/dts/Schema.d.ts`、`node_modules/effect/dist/dts/SchemaAST.d.ts`、`node_modules/effect/dist/dts/JSONSchema.d.ts`
- 稳定摘要工具：`packages/logix-core/src/internal/digest.ts`
- 诊断事件 SSoT：`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`
- 031 artifacts 槽位（可选承载 registry pack）：`specs/031-trialrun-artifacts/spec.md`
