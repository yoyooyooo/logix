---
title: Flow DSL · AST · Effect 程序
status: draft
version: v1
---

> 本文专门解释：Intent 中的 `runtimeFlows` 是什么、与 Flow AST 和 Effect 程序的关系是什么，  
> 帮助读者从“YAML 声明”理解到“可执行行为”这一条链路，而不涉及具体实现代码。

## 1. 三层一条链

在本方案中，行为编排相关的“程序”可以分为三层：

```text
Intent.runtimeFlows (YAML Flow DSL)
        ↓ parse
FlowAst（内存中的 Flow 抽象语法树）
        ↓ backend A：Effect 程序（Effect<Env, E, A>） ← 行为层 SSoT
        ↓ backend B：TS 代码生成（Hook / 事件处理器）
业务代码骨架（TS/React 源码）
```

- **Flow DSL（YAML）**：面向平台界面和配置，记录在 Intent 的 `runtimeFlows` 字段中；
- **Flow AST**：平台内部使用的中间结构（TypeScript 类型），便于校验、可视化和转换；
- **Effect 程序**：Flow AST 映射到 Effect 世界的“行为真身”（可以是 effect-ts 或等价实现的 `Effect<Env, E, A>`）；  
  在出码前平台内核中，Effect 程序被视为运行时行为的 SSoT；
- **TS 代码生成**：根据 Flow AST / Effect 程序生成 Hook/事件处理器等业务代码骨架，实现“出码”。

## 2. Flow DSL（YAML）回顾

以 `order-management.intent.yaml` 中的导出流程为例：

```yaml
runtimeFlows:
  - id: exportOrders
    trigger:
      element: toolbar.exportButton
      event: click
    pipeline:
      - call: FilterService.getCurrentFilters
        as: filters
      - call: TableUiStateService.getCurrentState
        as: tableState
      - call: ExportService.submitExportTask
        params:
          filters: "{{filters}}"
          columns: "{{tableState.visibleColumns}}"
```

DSL 的关键元素：

- `id`：流程唯一标识（例如 `exportOrders`）。
- `trigger`：触发条件（例如某个按钮的 click 事件）。
- `pipeline`：若干步骤构成的“流水线”，每一步都是一类操作：
  - `call: Service.method`：调用由 Pattern 提供的某个 Service（详见 `services.md`）；
  - `as`：将调用结果保存到上下文变量中；
  - `params`：调用参数，可以通过 `{{变量名}}` 从上下文中取值。

## 3. Flow AST（中间抽象）

为方便说明，可以构造一个示意性的 TypeScript 类型（实现时可根据实际需要调整）：

```ts
type FlowStep =
  | {
      _tag: 'Call'
      service: 'FilterService' | 'TableUiStateService' | 'ExportService'
      method: string
      as?: string
      params?: Record<string, unknown>
    }

interface FlowAst {
  id: string
  trigger: { element: string; event: string }
  pipeline: FlowStep[]
}
```

解析过程就是：

1. 从 YAML 中读取 `runtimeFlows`；
2. 将 `call: "FilterService.getCurrentFilters"` 拆分为 `service = "FilterService"`、`method = "getCurrentFilters"`；
3. 把 `as/params` 等字段映射到 AST 对象；
4. 将整条 `pipeline` 组装为 `FlowAst`。

这一层只是平台内部的“中间表示”，用途包括：

- 语义校验（例如引用的 Service 是否在 Pattern 中被 `provides`）；
- 静态分析（例如 pipeline 中是否使用了未定义的变量）；
- 可视化（在 UI 中画出流程图）。

## 4. 从 Flow AST 到 Effect 程序（示意）

在使用 Effect/DI 作为平台内核时，可以为 FlowAst 写一个“解释器”，将其转换为 Effect 程序。  
在本规划中，Effect 程序被视为运行时行为的 SSoT：Flow DSL 和 AST 是声明层，Effect 程序是可执行的行为模型。

```ts
// 这里的 Effect 可以是 effect-ts 的 Effect<Env, E, A>，
// 也可以是 v1/poc/effect.ts 中的简化版本。
type Effect<R, E, A> = (env: R) => Promise<A>

function interpretFlow(flow: FlowAst): Effect<Env, never, void> {
  // 伪代码：遍历 flow.pipeline，将每个 Call 步骤映射为对应 Service 的方法调用，
  // 并用 Effect 组合起来。具体实现留给平台内核。
}
```

对于上面的 `exportOrders` 流程，其 Effect 形态（伪代码）类似：

```ts
const exportOrdersEffect: Effect<Env, never, void> =
  FilterService.getCurrentFilters.pipe(
    Effect.bindTo('filters'),
    Effect.bind('tableState', () => TableUiStateService.getCurrentState),
    Effect.flatMap(({ filters, tableState }) =>
      ExportService.submitExportTask({
        filters,
        columns: tableState.visibleColumns,
      })
    )
  )
```

要点：

- Service 名（`FilterService`、`TableUiStateService`、`ExportService`）与 Pattern 中 `provides`/`requires` 声明的 Service ID 一致；
- Effect 程序本身是平台内核的实现细节，业务前端不会直接看到，只通过“点击导出按钮”这一交互体验到其行为。

## 5. 从 Flow AST 到代码生成（示意）

除了解释执行，还可以基于同一份 FlowAst 生成业务代码骨架。例如：

- FlowAst → `useExportOrders` Hook；
- FlowAst → 集成 Service 调用的按钮组件代码。

伪代码示意：

```ts
function generateFlowHookCode(flow: FlowAst): string {
  // 读取 flow.id / pipeline，拼出一个 TS Hook 源码字符串，
  // 例如 useExportOrders(() => ExportService.submitExportTask(...))
}
```

这样，Flow DSL 就既可以驱动平台内部的执行，又可以驱动“出码”，实现真正的“行为即配置”。

## 5. 什么时候值得“上 Flow + Effect”？（与简单 async 的边界）

- 适合使用 Flow + Effect 的场景：
  - 行为跨多个 Service / Store / 页面（例如导出、复杂审批操作、批量任务执行）；
  - 行为需要在 Intent 层“意图化”，希望被平台和 LLM 长期维护与重构；
  - 行为需要统一观测/审计（例如每次导出都要打日志、做权限检查）。
- 可以继续用简单 async 函数 + Hook 的场景：
  - 单一页面内的轻量交互（普通 CRUD 保存按钮、简单表单提交）；
  - 不需要进入 Intent.runtimeFlows 的行为，只在本地组件或 Store 内部使用。

推荐实践：

- 不强迫所有 CRUD 按 Flow + Effect 写；  
- 一旦某个行为被写入 Intent.runtimeFlows，且需要由平台/LLM 维护，优先用 Flow DSL → FlowAst → Effect 程序这条链路承载。

## 6. 与现有文档 / 文件的关系

- Intent：
  - `runtimeFlows` 字段定义了 Flow DSL 的数据结构；
  - 是本文件所述链路的入口。
- Pattern：
  - 通过 `composition.roles.provides/requires` 与 `services.md` 中的 Service ID 对齐；
  - 为 Flow DSL 中的 `call: Service.method` 提供语义基础。
- Template / Plan：
  - 继续负责“静态结构”（页面壳、组件、Store、Hook 等）；
  - Flow DSL 则负责“动态行为”的声明。

当前 v1 版本仅定义了 DSL 与 AST 的大致形状，并未强制平台在短期内实现全部解释与代码生成能力。  
这是一条面向未来的扩展路径：当平台需要更强的行为编排时，可以在本设计基础上增量实现。 
