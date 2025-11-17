---
title: 前端意图六层模型
status: draft
version: 2
---

> 本文将“前端开发时脑子里想的东西”拆成六类原子意图，作为 Intent/Pattern/Plan/Flow 的统一语义基座。画布、表单、CLI 都只是这些意图的表达形式。

## 1. Layout Intent · 布局意图

**问题域**：页面如何分区、各区域相对位置/优先级是什么。

- 示例：
  - “顶部一条工具栏，下方左右分栏：左侧列表，右侧详情。”
  - “工作台：上方指标区，下方左列表右详情。”
- Schema 草稿：

```ts
interface LayoutRegionIntent {
  id: string
  label: string
  role: 'filters' | 'toolbar' | 'table' | 'metrics' | 'detail' | string
}

interface LayoutIntent {
  layoutType: 'list-page' | 'workbench' | 'custom'
  regions: LayoutRegionIntent[]
  // 可选：网格线稿 / layout 树
  tree?: LayoutNode
}
```

**承载资产**：`Intent.layout`、layout 型 Pattern（如 workbench-layout）、设计文档 `design/layout.md`。

## 2. View & Component Intent · 视图与组件意图

**问题域**：每个区域里用什么组件/模式，它们的变体是什么。

- 示例：
  - “列表区使用可排序表格，带选择列和操作列。”
  - “弹框内是两列表单，底部固定操作条。”
- Schema 草稿：

```ts
interface ViewComponentIntent {
  slot: string // 对应 LayoutIntent.regions[].id
  patternId: string // e.g. table-with-server-filter
  variant?: string // e.g. dense / card / compact
  propsIntent?: Record<string, unknown> // 视图层的参数化意图
}

interface ViewIntent {
  components: ViewComponentIntent[]
}
```

**承载资产**：UI/Pro Pattern（composition/uiSchema）、Intent.view 段、模板中的组件骨架。

## 3. Interaction Intent · 交互意图

**问题域**：用户操作与即时 UI 反馈。

- 示例：
  - “点击‘新增’按钮，打开表单弹窗。”
  - “点击行右侧‘编辑’图标，打开右侧详情抽屉。”
- Schema 草稿：

```ts
interface InteractionIntent {
  events: Array<{
    id: string
    source: string // e.g. toolbar.addButton
    event: 'click' | 'change' | 'hover' | string
    uiEffect:
      | { type: 'openModal'; modalId: string }
      | { type: 'openDrawer'; drawerId: string }
      | { type: 'toggle'; target: string }
      | { type: 'scrollIntoView'; target: string }
      | { type: 'none' }
  }>
}
```

Interaction Intent 只描述“UI 层的可见反馈”，不负责业务流程（服务调用、状态写入）。

**承载资产**：`Intent.interaction` 段、组件 story/demo、Flow DSL 的 trigger 部分。

## 4. Behavior & Flow Intent · 行为与流程意图

**问题域**：跨组件/跨步骤的业务过程，服务调用顺序与分支。

- 示例：
  - “导出订单 = 读取当前筛选 + 当前可见列 → 调用 ExportService → 成功后提示 + 记录任务。”
  - “审批通过 = 校验表单 → 提交审批 API → 刷新任务列表 → 写入审计日志。”
- Schema 草稿：

```ts
interface FlowStepIntent {
  kind: 'callService' | 'branch' | 'delay' | 'parallel'
  serviceId?: string
  method?: string
  input?: Record<string, unknown>
  outputAlias?: string
  when?: string // 条件表达式（引用前面输出）
}

interface FlowIntent {
  id: string
  trigger: { source: string; event: string }
  pipeline: FlowStepIntent[]
}

interface BehaviorIntent {
  flows: FlowIntent[]
}
```

**承载资产**：Intent.behavior 段、Flow DSL AST、`.flow.ts` 文件、Effect 流水线。

## 5. Data & State Intent · 数据与状态意图

**问题域**：实体/表单/筛选字段长什么样，在哪儿存，怎么校验与同步。

- 示例：
  - “订单实体包含 id/status/amount 等字段，status 为枚举，可扩展。”
  - “列表数据由 React Query 管理，筛选条件由 Zustand 切片管理。”
- Schema 草稿：

```ts
interface EntityFieldIntent {
  name: string
  type: 'string' | 'number' | 'enum' | 'date' | 'boolean' | string
  enumValues?: string[]
  required?: boolean
}

interface EntityIntent {
  name: string
  fields: EntityFieldIntent[]
}

interface ApiIntent {
  name: string
  path: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | string
  params?: Record<string, string> // 简化表示
  returns?: string
}

interface StateSourceIntent {
  id: string // e.g. orderList
  kind: 'react-query' | 'zustand' | 'local-state'
  entity: string
}

interface DataStateIntent {
  entities: EntityIntent[]
  apis: ApiIntent[]
  stateSources?: StateSourceIntent[]
}
```

**承载资产**：Intent.domain、Pattern.dataContract、best-practice 中的状态管理规范（zustand slices、react-query keys 等）。

## 6. Code Structure Intent · 工程结构意图

**问题域**：代码如何组织，模块与文件如何拆分，如何映射到模板/Plan。

- 示例：
  - “订单模块 = page + filters/table/toolbar/quick-edit 四个组件 + order.store + order.service + useOrderList hook。”
  - “每个 feature 下有 `components/ stores/ services/ queries/ flows` 五个子目录。”
- Schema 草稿：

```ts
interface ModuleFileIntent {
  kind: 'page' | 'component' | 'store' | 'service' | 'hook' | 'flow'
  path: string // e.g. src/features/order/components/order-table.tsx
  templateId?: string // 对应 TemplateSpec
  patternId?: string // 对应 PatternSpec
}

interface CodeStructureIntent {
  featureId: string
  files: ModuleFileIntent[]
}
```

**承载资产**：Plan（create-file 列表）、Template（path+role 绑定）、best-practice 目录/切片指南。

## 7. Constraint & Quality Intent · 约束与质量意图

**问题域**：性能、安全、兼容性、可观测性等非功能性要求。

- 示例：
  - “该列表需要支持 1w+ 条数据滚动不卡顿；分页请求必须带上 cursor。”
  - “所有操作必须有 undo/rollback 通道；接口变更不得破坏现有调用（Never break userspace）。”

可以作为 metadata 附着在 Intent/Pattern/Plan/Flow 上：

```ts
interface ConstraintIntent {
  performance?: { maxItems?: number; latencyBudgetMs?: number }
  safety?: { requireAuth?: boolean; sensitiveFields?: string[] }
  compatibility?: { neverBreakUserspace?: boolean; dependsOnApis?: string[] }
  observability?: { requireAuditLog?: boolean; tracing?: boolean }
}
```

**承载资产**：

- Pattern.metadata（安全/性能/i18n/a11y 指南）；
- Intent.constraints（特定场景的额外要求）；
- Plan/Flow 的 run 配置（例如是否必须带埋点/审计日志）。

## 8. 组合与互斥

- 每句“原子描述”只能属于一个主意图类型：
  - “点击按钮打开弹框” → Interaction；
  - “点击确认后校验并调用接口” → Interaction + Behavior（需拆成两句意图）；
  - “导出任务成功后刷新列表数据” → Behavior & Flow；
  - “筛选条件由 Zustand 管理” → Data & State；
  - “订单模块拆成这些目录与文件” → Code Structure。
- 一个完整的 feature 通常包含：Layout + View + Interaction + Behavior + Data & State + Code Structure（再叠加 Constraints）。
- 平台与 LLM 的职责：
  - 引导用户在不同面板中表达对应类型的线稿；
  - 在每一层线稿之上进行“润色”（生成 Pattern/Template/Plan/Flow），而不是在一坨混合 YAML 上硬猜。

## 9. 设计原则：Intent ≠ 代码 DSL

为了防止 Intent 退化成“换一种格式写代码”，各意图层在设计与编辑时需遵守以下原则：

- **只说 What，不写 How**：  
  - Layout/View/Interaction/Behavior/Data/Code Structure 关注的是“想要什么布局/组件/行为/数据/拆分方式”；  
  - 具体组件实现、Hook 名、函数签名、错误处理细节等工程实现由 Pattern/Template/Plan/代码承担。
- **字段偏向业务决策而非实现细节**：  
  - Data & State 记录业务实体/字段含义/校验规则/状态来源类型，不记录具体 React Query key 或 hook 名；  
  - Behavior 描述“调用哪个领域服务/步骤链”，不在 Intent 里展开复杂控制流与错误重试策略（这些落在 Flow DSL + Constraint + Layer）。
- **Intent 可以不完备，但要稳定**：  
  - 允许只写 Layout + View + 核心 Behavior/Data，后续再增量补充其它层；  
  - 实现层的重构应尽量通过 Pattern/Template/Plan 吸收，不要求频繁修改 Intent，避免 Intent 跟着代码细节一起抖动。
- **编辑体验优先线稿与用例视角**：  
  - 默认入口是用例列表、线稿画布、列表/表格式编辑，而不是直接暴露 JSON/TS 源文件；  
  - Schema/TS 视图保留给高级用户，用于精细调整与审查，而不是日常「写 DSL」入口。

判断一个字段/交互是否适合放在 Intent 层，可以自问：它是否主要承载“脑子里的业务意图”？如果更多是在描述技术实现细节，就应考虑下沉到 Pattern/Template/Plan/代码。
