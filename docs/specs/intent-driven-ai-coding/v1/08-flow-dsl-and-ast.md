---
title: Flow DSL · AST · Effect 程序（v1 精简版）
status: archived
version: v1
supersededBy: ../v3
---

> 本文保留 v1 对 “Flow DSL → AST → Effect 程序” 三层映射的最小说明，作为对比 v3 Logix/Flow 设计的参考。

## 1. 三层一条链（v1 视角）

在 v1 里，行为相关“程序”被拆成三层：

```text
Intent.runtimeFlows (YAML Flow DSL)
        ↓ parse
FlowAst（内存中的 Flow 抽象语法树）
        ↓
Effect 程序（Effect<Env, E, A>）
```

- **Flow DSL（YAML）**：面向平台 UI 的声明式流程描述（trigger + pipeline）。  
- **Flow AST**：平台内部的中间结构，便于校验、可视化和转换。  
- **Effect 程序**：将 Flow AST 映射为 Effect/TS 世界的真正可执行逻辑，被视为行为层 SSoT。

v3 中，这条链路更多落在「Flow DSL + Logix/Effect Runtime」的一体化实现上，但“AST/中间表示 + 行为 SSoT”这两个想法仍然重要。

## 2. 一个最小的 v1 Flow DSL 示例

```yaml
runtimeFlows:
  - id: exportOrders
    trigger:
      element: toolbar.exportButton
      event: click
    pipeline:
      - call: FilterService.getCurrentFilters
        as: filters
      - call: ExportService.submitExportTask
        params:
          filters: "{{filters}}"
```

对应的简化 AST 形式：

```ts
type FlowStep =
  | { _tag: 'Call'; service: string; method: string; as?: string; params?: Record<string, unknown> }

interface FlowAst {
  id: string
  trigger: { element: string; event: string }
  pipeline: FlowStep[]
}
```

以及一个典型的 Effect 程序投影（示意）：

```ts
const exportOrdersFlow = (env: Env) =>
  Effect.gen(function* () {
    const filters = yield* env.FilterService.getCurrentFilters()
    yield* env.ExportService.submitExportTask({ filters })
  })
```

v3 中 Flow/Logix 的设计可以被视为这条链的演进版本：  
Flow DSL 更结构化，Effect/Logix 程序成为统一运行时，并且和 Intent/Schema/Codegen 建立了更直接的映射关系。

