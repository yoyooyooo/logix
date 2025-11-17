---
title: 示例 · 订单管理 CRUD 场景（Intent → Pattern → Plan → CLI 执行）
status: draft
version: v1
---

> 本文可以**独立阅读**：即使不了解仓库其它文档，也能看到一个完整的「意图 → 模式 → 出码计划 → CLI 执行 → 产物」链路。  
> 示例场景：订单管理列表（筛选 + 列表 + 快速编辑 + 导出）。

## 1. 场景简介与目标

- **业务目标**
  - 在单页内完成订单的筛选、列表浏览、快速编辑和导出；
  - 向 LLM/平台提供一个结构化意图，便于自动生成骨架代码。
- **示例文件**
  - Intent：`docs/specs/intent-driven-ai-coding/v1/intents/order-management.intent.yaml`
  - CLI：`docs/specs/intent-driven-ai-coding/v1/poc/cli.ts`
  - Planning/Execution：`poc/planning.ts` / `poc/execution.ts`

接下来按“阶段 → 产物 → 关键字段/代码 → 输出”顺序展开。

---

## 2. 意图（Intent）

**文件**：`docs/specs/intent-driven-ai-coding/v1/intents/order-management.intent.yaml`

关键字段：

- `scene.type: list-page` → 驱动模式匹配；
- `patterns` → 声明选择的模式及其参数；
- `domain.entities/apis` → 供后续模板使用；
- `runtimeFlows` → 描述导出行为（参见 `04-export-orders-flow-example.md`）。

节选：

```yaml
patterns:
  - id: table-with-server-filter
    target: table
    config:
      entity: Order
      pagination: true
      batchActions:
        - export
  - id: filter-bar
    target: filters
    config:
      inlineSearch: true
      showResetButton: true
      fields:
        - status
        - createdAt
  - id: toolbar-with-quick-edit
    target: toolbar
    config:
      supportQuickEdit: true
      supportExport: true
      editableFields:
        - remark
```

**作用**：  
这一份 YAML 就是「意图」本体。后一切花哨的东西（模式匹配、Plan、模板、CLI）都只是在消费它。

---

## 3. 模式（Pattern Repo）

在真实平台里，Pattern 定义位于 `docs/specs/intent-driven-ai-coding/v1/patterns/*.pattern.yaml`。  
为了让 PoC CLI 自给自足，我们在 `poc/cli.ts` 里内置了最小模式集 `basePatternMetas`：

```ts
const basePatternMetas: PatternMeta[] = [
  { id: 'table-with-server-filter', requiredSceneType: ['list-page', 'workbench'] },
  { id: 'filter-bar', requiredSceneType: ['list-page', 'workbench'] },
  { id: 'toolbar-with-quick-edit', requiredSceneType: ['list-page'] },
  { id: 'crud-feature-skeleton', requiredSceneType: ['list-page'] },
]
```

**作用**：  
`matchPatternsByIntent(scene.type)` 会用这些 meta 判断意图声明的模式是否合法、是否适配当前场景（list-page）。

---

## 4. 生成计划（Plan）如何构建

入口：`poc/planning.ts` 中的 `buildPlan()`。

步骤概览：

1. 加载 Intent；
2. 调用 `matchPatternsByIntent` 获取匹配的模式 meta；
3. 遍历 Intent 中显式声明的 `patterns`，为每个模式推导目标文件路径、参数；
4. 生成 `PlanAction[]`。

关键代码片段（已省略日志）：

```ts
const intent = await intentRepo.loadIntent(intentId)(env.fs)
const matches = await matchPatternsByIntent(intent, patternRepo)
const selected = matches.filter((m) => explicitPatternIds.has(m.pattern.id))

for (const match of selected) {
  const params = intentPattern?.config ?? {}
  const targets = inferTargetPaths(intent, match.pattern.id)
  for (const path of targets) {
    actions.push({
      type: 'create-file',
      path,
      templateId: match.pattern.id,
      patternId: match.pattern.id,
      params,
    })
  }
}
```

结果示例（内存对象）：

```ts
[
  {
    type: 'create-file',
    path: 'src/features/order-management/components/order-management-table.tsx',
    templateId: 'table-with-server-filter',
    params: { entity: 'Order', pagination: true, batchActions: ['export'] },
  },
  {
    type: 'create-file',
    path: 'src/features/order-management/stores/order-management-table.store.ts',
    templateId: 'table-with-server-filter',
    params: { ... },
  },
  ...共 6 条
]
```

**作用**：  
Plan 是「出码计划」，告诉执行器要创建哪些文件、各自属于哪个模板/模式、要传哪些参数。

---

## 5. CLI 执行（把 Plan 落到磁盘）

命令：

```bash
cd /Users/yoyo/projj/git.imile.com/ux/imd
pnpm tsx docs/specs/intent-driven-ai-coding/v1/poc/cli.ts order-management
```

执行行为：

1. 调 `buildPlan()`，获得 `GenerationPlan`；
2. 调 `executePlan(plan)`：
   - 遍历 `plan.actions`；
   - 调 `CodeGen.generate(templateId, params)`（当前 dummy 生成占位文本）；
   - 将内容写入 `.generated/<templateId>.txt`；
   - 打印日志。

实际日志（节选）：

```
[planning] building plan for intent order-management
[execution] executing plan for intent order-management, actions=6
[execution] create-file src/features/order-management/components/order-management-table.tsx using template table-with-server-filter
[execution] wrote ./.generated/table-with-server-filter.txt
...
[execution] create-file src/features/order-management/components/order-management-quick-edit.tsx using template toolbar-with-quick-edit
[execution] wrote ./.generated/toolbar-with-quick-edit.txt
```

**作用**：  
CLI 是一个最薄的 orchestrator：把“意图 → 计划”串起来，并产生可观察的输出。后续换成 `imd intent plan/apply` 时，这一层机制不变，只需升级 CodeGen。

---

## 6. 当前产物与未来扩展

| 阶段 | 现状 | 下一步 |
| --- | --- | --- |
| Intent | YAML - 可读、可被 LLM/工具解析 | 继续沉淀更多场景，保持结构清晰 |
| Pattern Repo | PoC 内置 meta | 接入 `patterns/*.pattern.yaml`，支持 roles/paramsSchema |
| Plan | 真实路径 + 参数 | 将 `.generated` 输出替换为真实模板渲染文件 |
| CLI/执行器 | 写 `.generated/<templateId>.txt` 占位文件 | 对接 best-practice 的 snippets/templates，生成 React/Zustand/Service 代码；将 Plan/Log 写入 `.plans/` |

---

## 7. 小结

- 这一条链路证明：只要有结构化 Intent，就可以透过 `buildPlan` 把「模式 + 参数」转换成结构化行动列表，并由 CLI 自动写入产物；
- 目前产物还是占位文本，但 Plan 已经包含真实的目标路径和参数，下一步只需将 `CodeGen` 替换为模板渲染即可；
- 如果需要把 Flow/Effect 也纳入自动化，只需在 Plan 中增加生成 `.flow.ts` 的 action（参见 `04-export-orders-flow-example.md`），即能让行为层也进入“意图 → 出码”闭环。


命令：

```bash
cd /Users/yoyo/projj/git.imile.com/ux/imd
pnpm tsx docs/specs/intent-driven-ai-coding/v1/poc/cli.ts order-management
```

执行顺序：

1. **规划阶段**（`buildPlan`）
   - 读取 `order-management.intent.yaml`；
   - 通过 `matchPatternsByIntent()` 找出 `scene.type = list-page` 对应的模式；
   - 为每个匹配的模式生成若干 `PlanAction`，并推导目标路径。例如：
     ```ts
     [
       {
         type: 'create-file',
         path: 'src/features/order-management/components/order-management-table.tsx',
         templateId: 'table-with-server-filter',
         patternId: 'table-with-server-filter',
         params: { entity: 'Order', pagination: true, batchActions: ['export'] },
       },
       {
         type: 'create-file',
         path: 'src/features/order-management/stores/order-management-table.store.ts',
         templateId: 'table-with-server-filter',
         patternId: 'table-with-server-filter',
         params: { ...同上... },
       },
       {
         type: 'create-file',
         path: 'src/features/order-management/queries/use-order-management-list.hook.ts',
         templateId: 'table-with-server-filter',
         patternId: 'table-with-server-filter',
         params: { ...同上... },
       },
       {
         type: 'create-file',
         path: 'src/features/order-management/components/order-management-filters.tsx',
         templateId: 'filter-bar',
         patternId: 'filter-bar',
         params: { inlineSearch: true, showResetButton: true, fields: ['status', 'createdAt'] },
       },
       {
         type: 'create-file',
         path: 'src/features/order-management/components/order-management-toolbar.tsx',
         templateId: 'toolbar-with-quick-edit',
         patternId: 'toolbar-with-quick-edit',
         params: { supportQuickEdit: true, supportExport: true, editableFields: ['remark'] },
       },
       {
         type: 'create-file',
         path: 'src/features/order-management/components/order-management-quick-edit.tsx',
         templateId: 'toolbar-with-quick-edit',
         patternId: 'toolbar-with-quick-edit',
         params: { ...同上... },
       },
     ]
     ```

2. **执行阶段**（`executePlan`）
   - 调用 `CodeGen.generate(templateId, params)` 生成占位内容；
   - 将生成结果写入 `.generated/<templateId>.txt`，并打印日志。

实际输出（节选）：

```
[planning] building plan for intent order-management
[execution] executing plan for intent order-management, actions=6
[execution] create-file src/features/order-management/components/order-management-table.tsx using template table-with-server-filter
[execution] wrote ./.generated/table-with-server-filter.txt
[execution] create-file src/features/order-management/stores/order-management-table.store.ts using template table-with-server-filter
[execution] wrote ./.generated/table-with-server-filter.txt
[execution] create-file src/features/order-management/queries/use-order-management-list.hook.ts using template table-with-server-filter
[execution] wrote ./.generated/table-with-server-filter.txt
[execution] create-file src/features/order-management/components/order-management-filters.tsx using template filter-bar
[execution] wrote ./.generated/filter-bar.txt
[execution] create-file src/features/order-management/components/order-management-toolbar.tsx using template toolbar-with-quick-edit
[execution] wrote ./.generated/toolbar-with-quick-edit.txt
[execution] create-file src/features/order-management/components/order-management-quick-edit.tsx using template toolbar-with-quick-edit
[execution] wrote ./.generated/toolbar-with-quick-edit.txt
```

> 当前 PoC 仍然把真实内容写在 `.generated/*.txt` 文件中，主要用于证明“Intent.patterns → Plan → 执行” 的链路。接下来可以把 `CodeGen.generate` 替换为真正的模板渲染器（对接 best-practice snippets），即可把这些路径生成为 React/Zustand/Service 骨架。

## 4. 中间产物的承载能力

- **Intent**：已经能精确描述场景（scene/layout/actors/flows）、模式选择和领域实体；
- **Pattern**：PoC 中用内置 `basePatternMetas` 替代真实仓库，只关注 `id/name/applicability`；
- **Plan**：是结构化的行动列表 `PlanAction[]`；即便目前只生成 `.generated.txt`，也能看出真实目标路径和参数；
- **CLI / 执行器**：起到“把 Intent 映射到文件系统改动”这一核心作用。后续 CLI 可以换成更正式的 `imd intent plan/apply` 命令，但这套骨架已经证明了流程可行。

## 5. 后续进阶方向

1. **接入真实 Pattern/Template 仓库**：从 `patterns/*.pattern.yaml` / `templates/*.template.yaml` 中读取 `composition.roles` 与路径模板。
2. **完善 CodeGen**：用 best-practice snippets / tpl-* 模板渲染 TS/TSX 文件，替换 `.generated.txt`。
3. **记录 Plan/Log**：将 `GenerationPlan`、执行日志和 diff 写入 `.plans/` 目录，形成可追溯资产。
4. **结合 Flow/Effect**：将 Intent.runtimeFlows 编译为 `.flow.ts` 行为文件，与组件 Hook 打通（参见 `04-export-orders-flow-example.md`）。

这一示例表明：只要有结构化 Intent，借助 PoC CLI 就可以看到“意图 → 模式 → 计划 → 执行”的完整闭环，后续只需要逐步增强模板和代码生成能力，即能把生成物替换为真实的 React/Zustand/Service 骨架。
