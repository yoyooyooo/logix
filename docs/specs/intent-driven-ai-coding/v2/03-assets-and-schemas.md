---
title: 资产与意图层的映射与 Schema 草图
status: draft
version: 2
---

> 本文从“资产视角”回看意图分层模型：Intent / Pattern / Template / Plan / Flow / best-practice 各自承载哪些意图层，以及期望的 Schema 草图。

## 1. IntentSpec v2 草图

在 IntentSpec 中，scene/domain/runtimeFlows/patterns 不再混在一起，而是按意图层拆分结构：

```ts
interface IntentSpecV2 {
  id: string
  title: string
  description: string

  layout: LayoutIntent
  view?: ViewIntent
  interaction?: InteractionIntent
  behavior?: BehaviorIntent
  data?: DataStateIntent

  // 代码结构意图通常由 Plan/Template 承载，这里只保留引用/意向
  codeStructureRef?: {
    planId?: string
    templateIds?: string[]
  }

  constraints?: ConstraintIntent

  // 事实源引用（Data & State）
  dataSource?: {
    // 推荐：绑定外部 schema（OpenAPI/TS 类型等）作为唯一事实源
    externalSchemaId?: string
    // 临时：允许 local 定义，但需标注来源，后续迁移到 external
    source?: 'external' | 'local'
  }
}
```

### 与 v1 Intent 的映射

- `scene.layout` → `layout`；
- `patterns` 中与 UI 相关的配置 → `view.components`；
- `runtimeFlows` 的 trigger/UI 部分 → `interaction.events`；
- `runtimeFlows` 的 pipeline 服务调用部分 → `behavior.flows`；
- `domain.entities/apis` → `data.entities/apis`；
- `openQuestions/autoFill` → 辅助信息，可放入 data 或 constraints 的补充字段。

## 2. PatternSpec v2 草图

Pattern 在 v2 中被视为“意图层级的模板”，需显式声明自己覆盖哪些层：

```ts
type IntentLayer = 'layout' | 'view' | 'interaction' | 'behavior' | 'data' | 'code-structure'

interface PatternSpecV2 {
  id: string
  name: string
  summary: string
  version: string
  status: 'draft' | 'review' | 'published'

  intentLayers: IntentLayer[] // 该模式主要作用于哪些意图层

  composition?: {
    roles: PatternRole[] // 多数属于 view / behavior / data 层
  }

  dataContract?: {
    entities?: string[]
    requiredFields?: string[]
    apis?: string[]
  }

  paramsSchema?: Record<string, unknown> // 跨层参数化入口
  uiSchema?: Record<string, unknown> // View 层表单配置

  runtimeBindings?: Record<string, { component?: string; service?: string }>

  constraints?: ConstraintIntent
}
```

### 典型模式的 intentLayers

- `workbench-layout`：`['layout', 'view']`
- `table-with-server-filter`：`['view', 'behavior', 'data']`
- `service-adapter-query`：`['data', 'code-structure']`
- `zustand-store-with-slices`：`['data', 'code-structure']`

## 3. TemplateSpec v2 草图

模板是“代码结构意图 + 实现细节”的桥梁：

```ts
interface TemplatePatternImplV2 {
  patternId: string
  role: string
  path: string
}

interface TemplateSpecV2 {
  id: string
  name: string
  description: string
  version: string
  status: 'draft' | 'published'

  // Code Structure 意图的骨架
  files: {
    kind: 'page' | 'component' | 'store' | 'service' | 'hook' | 'flow'
    path: string
    patternBindings?: TemplatePatternImplV2[]
  }[]

  runtimeBindings?: {
    uiCapabilities?: Record<string, unknown>
  }
}
```

Template 主要落在 Code Structure 层，但通过 patternBindings 与 View/Behavior/Data 等层联动。

## 4. PlanSpec v2 草图

Plan 是“Code Structure Intent 的实例化 + 部分 Flow 编排”，v2 下保留形态，但增加可追踪的意图信息：

```ts
interface PlanActionV2 {
  id: string
  type: 'create-file' | 'modify-file' | 'append-snippet'
  path: string
  templateId: string
  patternId?: string
  intentLayers?: IntentLayer[] // 该 action 主要服务哪些意图层
  params: Record<string, unknown>
}

interface PlanSpecV2 {
  id: string
  intentId: string
  version: string
  actions: PlanActionV2[]
  constraints?: ConstraintIntent
}
```

这样平台可以回答：

- “这个 Plan action 是在落实哪个意图层？”
- “改动某个 Pattern 时，会影响哪些 Plan（以及它们实现的意图层）？”

## 5. Flow DSL / `.flow.ts` v2 草图

Flow DSL 本身就是 Behavior & Flow Intent 的主要载体，v2 强调：

- 触发条件：源自 Interaction Intent；
- 流水线：纯 Behavior & Flow；
- 绑定 services：与 Pattern/Template 中的 runtimeBindings 一致。

```ts
interface FlowDslV2 {
  id: string
  trigger: {
    eventId: string // InteractionIntent.events[].id
    // 下列信息来自 InteractionIntent，保持冗余方便展示
    source?: string
    event?: string
  }
  steps: FlowStepIntent[]
  constraints?: ConstraintIntent
}

// `.flow.ts` 中为 FlowDslV2 提供 Effect 实现
```

## 6. best-practice 仓库与 Code Structure Intent

best-practice 仓库中已有：

- 目录约定、状态管理规范、service/adapter 模式等；
- 这些内容天然属于 Code Structure + Data & State 意图层。

v2 的要求：

- 在 best-practice 中为每种“工程结构意图”提供：
  - 结构描述（目录树 + 模块关系图）；
  - 模板/脚手架（TemplateSpec）的映射关系；
  - 与 Pattern 层的关联（比如 service-adapter-query 模式对应哪个模板文件）。
- 平台的 Plan/Template 必须与 best-practice 的这些定义对齐，而不是额外发明一套规则。

## 7. 小结

- 意图层模型定义了“我们想表达什么”；
- 本文中的 v2 Schema 草图定义了“这些意图落在哪些资产上”；
- 后续平台 UI/CLI/LLM 都围绕这套映射工作：
  - UI：为不同意图层提供专门视图；
  - CLI：根据 Code Structure Intent + Template/Pattern 生成代码；
  - LLM：在特定意图层（Layout/View/Flow/Data/CodeStructure）上进行润色与补全。

## 8. 事实源与引用规则（v2 MVP 要求）

1. **Data & State**：
   - 若存在外部 schema（OpenAPI、TS 类型、GraphQL SDL 等），Intent 里的实体/接口需引用 externalSchemaId，并通过 `fieldsUsed`、`paramsUsed` 记录投影；
   - 如暂未有正式 schema，可使用 `source: 'local'` 的临时描述，但必须在 CLI 校验时提示，后续统一迁移到外部事实源。
2. **Interaction → Behavior**：
   - InteractionIntent.events 是唯一的事件注册表，负责生成 `eventId`；
   - FlowIntent/FlowDsl 只接受 `eventId`，禁止手写 `source/event` 字符串；UI 展示层可冗余存一份 `source` 方便人类理解。
3. **Code Structure**：
   - PlanActionV2.path、TemplateSpec.files.path 必须通过 best-practice 目录校验器；
   - 所有文件均需 `fileId`（例如 `feature:order-management/components/order-table`）以便 renaming 与追踪。
4. **ID 规范**：
   - Intent/Pattern/Template/Plan/UseCase/Flow/ModuleFile 等 ID 由 `id-utils` 生成，包含类型前缀和语义 slug；
   - 重命名需借助迁移工具，禁止手动 search/replace。
5. **约束承载**：
   - ConstraintIntent 只有在 Flow/Plan/Template 等层声明“消费方式”后才可合并入主干，否则按警告处理；
   - CLI 应检查存在但未消费的约束，防止 metadata 失真。

6. **LLM 协作注意事项**：
   - 输入可更自由（自然语言/半结构），但输出必须通过 schema 校验 + 幂等 Plan + AST merge；
   - LLM 生成的 Data/State 投影需标注来源（external/local），并与事实源校验差异；
   - 禁止 LLM 直接修改路径/ID：路径需通过目录校验器，ID 由 id-utils 分配；
   - CLI/LSP 应在生成后展示 diff 与潜在破坏点，默认需人工审核才能落盘。

以上规则决定了“引擎”能否保持稳定，Studio/画布等后续工程均需在这些合同建立后再继续扩展。
