---
title: 行为/流程意图（Behavior & Flow Intent）
status: draft
version: 2
---

> 本文聚焦 Behavior & Flow 意图及其与 Flow DSL、Effect 运行时的关系。

## 1. 定义

行为/流程意图回答：

> “在某个触发条件下，系统需要执行哪些业务步骤、调用哪些服务、如何处理结果？”

典型例子：

- 导出订单：
  1. 从 FilterStore 读取当前筛选条件；
  2. 从 TableUiState 读取当前可见列；
  3. 调用 ExportService.submitExportTask；
  4. 成功后提示并写入导出记录。

## 2. FlowIntent Schema 草图

```ts
interface FlowStepIntent {
  kind: 'callService' | 'branch' | 'delay' | 'parallel'
  serviceId?: string
  method?: string
  input?: Record<string, unknown>
  outputAlias?: string
  when?: string // 条件表达式，可引用 outputAlias
}

interface FlowIntent {
  id: string
  trigger: { source: string; event: string } // 与 InteractionIntent 对齐
  pipeline: FlowStepIntent[]
}

interface BehaviorIntent {
  flows: FlowIntent[]
}
```

在 IntentSpec v2 中：

```ts
interface IntentSpecV2 {
  // ...
  behavior?: BehaviorIntent
}
```

## 3. Effect-ts 在 v2 中的定位

Effect-ts 不再被视作“一个单独的技术选型”，而是：

> **Behavior & Flow 意图的标准运行时实现** —— 将 FlowIntent AST 映射为可组合、可测试、可观测的程序。

具体职责：

- 作为 Flow DSL 的“执行引擎”：
  - FlowIntent → FlowAst → Effect 程序（例如 `exportOrdersFlow: Effect<Env, Error, void>`）；
  - 提供组合、错误处理、重试、并行等高阶能力。
- 作为「约束/质量意图」的落地点之一：
  - 在 Effect 层实现 timeout/retry/circuit breaker 等性能与可靠性约束；
  - 通过中间件统一接入日志/追踪/审计。
- 在 Code Structure Intent 中：
  - 将 `.flow.ts` 模块作为一种“行为模块”纳入目录结构规范；
  - 与 best-practice 中的 Effect runtime 模块对齐（例如 `src/shared/effects/*`）。

简而言之：

- **Behavior & Flow Intent = 业务流程线稿**；
- **Flow DSL = 结构化表达**；
- **Effect-ts = 运行时程式化润色与执行层**。

## 4. 与其它意图层的边界

- 与 InteractionIntent：
  - Interaction 决定“什么时候触发 Flow”；
  - Behavior & Flow 决定“Flow 内部做什么”。
- 与 Data & State：
  - Flow 步骤可以读取/写入 state（例如 FilterStore/TableUiState）；
  - 但实体结构/状态来源在 Data & State Intent 中定义。
- 与 Code Structure：
  - `.flow.ts` 文件由 Plan/Template 在 Code Structure 意图下生成/更新；
  - v2 要求 `.flow.ts` 的组织遵循 best-practice 仓库的行为模块规范。

## 5. 设计边界：避免 Behavior & Flow 变成业务代码 DSL

Behavior & Flow Intent 的目标是表达“业务步骤链”与“服务调用关系”，而不是把所有控制流与错误处理细节都塞进 Intent。

### 5.1 本层允许/不允许的内容

- 允许（What）：
  - 哪个 Use Case / 事件触发哪个 Flow（引用 Interaction 事件）；
  - Flow 步骤级的业务语义：调用哪个领域服务、按什么顺序、基于什么条件分支；
  - 引用 Data & State 中的实体/API（例如某步骤输入/输出实体）。
- 不允许（How）：
  - 低层次控制流细节（复杂表达式、多重嵌套条件、循环等）；
  - 具体 Effect 组合方式（flatMap/gen/all 等）；
  - 日志/重试/超时/熔断等运行时细节（应由 Constraint + Layer 落地）。

示意对比：

```ts
// ✅ Good：Intent 层 Flow 步骤
pipeline: [
  { kind: 'callService', serviceId: 'FilterService', method: 'getCurrentFilters', outputAlias: 'filters' },
  { kind: 'callService', serviceId: 'ExportService', method: 'submitExportTask', input: { filters: '{{filters}}' } },
]

// ❌ Bad：把 Effect 细节写进 Intent
pipeline: [
  {
    kind: 'callService',
    serviceId: 'ExportService',
    method: 'submitExportTask',
    retryPolicy: { maxRetries: 3, backoffMs: 1000 }, // ← 应由 Constraint/Layer 配置
    effectImpl: 'Effect.gen(function*() { ... })', // ← 具体 Effect 代码不应出现在 Intent
  },
]
```

### 5.2 Minimal FlowIntent 建议

一个可用的 FlowIntent 通常至少包含：

- `id` + 触发事件（eventId 或 source/event）；
- 1–N 个步骤，每个步骤聚焦一个领域操作（调用服务、条件分支等）；
- 对关键输入/输出起别名（便于后续步骤引用）。

复杂的错误处理/重试策略可以在后续迭代中，通过 Constraint 意图 + Flow→Effect 编译器予以增强，而不必从第一天就写进 Intent。

## 6. LLM 与 Flow 的协作

在 v2 中，LLM 与 FlowIntent 的交互主要有三类：

1. 从自然语言/线稿生成初版 FlowIntent（线稿级行为意图）；
2. 从 FlowIntent 生成 Flow DSL + `.flow.ts` Effect 程序骨架；
3. 基于约束/质量意图，对现有 Flow 提出优化建议（重试/幂等/超时策略等）。

平台 UI 应为 Behavior & Flow 提供：

- 一种适合表达“步骤链”的视图（简化画布或步骤列表）；
- 一个 Effect 视图（`.flow.ts` 只读预览 + 可编辑模式）；
- 与运行时日志/监控的联动，用于调试 Flow 行为。
