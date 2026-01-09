---
title: 12 · UI ↔ Logic 语义绑定协议（Semantic Binding）
status: draft
version: 2026-01-06
value: core
priority: next
related:
  - ../00-overview.md
  - ../05-intent-pipeline.md
  - ../08-alignment-lab-and-sandbox.md
  - ../14-intent-rule-schema.md
  - ./04-semantic-ui-modeling.md
  - docs/ssot/platform/contracts/01-runresult-trace-tape.md
---

# UI ↔ Logic 语义绑定协议（Semantic Binding）

> 目标：让“UI 交给 React，逻辑交给 Logix”成为可执行事实，而不是口号。
>
> 本文定义平台侧的 **Binding Contract**：如何把 UI 组件树（React）与 Logic 资产（Module/Traits/Programs/IntentRule）声明式连接，并在 Sandbox/Alignment 中产出可对齐的 RunResult。

## 1) 三个输入：UI、Logic、Binding（缺一不可）

平台要做“连接”，必须先让两端都暴露可消费的 **Manifest**：

1. **UI Manifest（组件侧）**
   - 来源：组件库 Registry（例如 antd adapter）
   - 内容：组件类型、props（可绑定项）、events（可触发项）、slots（可嵌套项）

2. **Logic Manifest（逻辑侧）**
   - 来源：Unified Static IR（`C_T + Π`）与反射输出（Parser/Loader）
   - 内容：
     - 可读：state paths（含类型）、derived/computed（若可反射）
     - 可写：actions（含 payload 类型）
     - 可约束：traits（`C_T`），programs（`Π`），以及它们的稳定锚点（programId/nodeId/traitPath）

3. **Binding（连接协议）**
   - 来源：Studio 的“接线面板”（或 Agent 生成）
   - 内容：把 UI 的 sockets（props/events）绑定到 Logic 的 endpoints（state/action/service/pattern）

> 约束：Binding 只描述 “What connects to what”，不携带不可序列化闭包；运行期行为必须落到 `Π`（Program）或 `C_T`（Traits），而不是把动态流程塞进 Binding。

## 2) Binding 的最小形态（V1）

> 这是工作模型：先跑通 “可绑定、可生成、可对齐”；复杂表达力通过 Pattern/Program 扩展。

```ts
type BindingV1 = {
  readonly componentId: string
  readonly componentType: string
  readonly bindings: Record<
    string,
    | { readonly kind: 'state'; readonly moduleId: string; readonly path: string }
    | { readonly kind: 'action'; readonly moduleId: string; readonly action: string; readonly args?: unknown[] }
    | { readonly kind: 'intentRule'; readonly ruleId: string }
    | { readonly kind: 'literal'; readonly value: unknown }
  >
}
```

约束：

- `componentId` 必须稳定（用于 RunResult 对齐、回放与 diff）。
- `state.path` 必须可类型检查（靠 type projection / compiler）。
- 复杂条件/映射（例如 `!canSubmit`、`payload = results[0].id`）不进入 V1 Binding；应上升为：
  - Pattern 注意力（`intentRule`/pattern config），或
  - Program（`Π`）的一部分（FlowProgram）。

## 3) Sandbox/Alignment 中的可观测闭环

Binding 的价值只有在 “可运行 + 可回流” 下才成立：

- UI 在 Sandbox 中不必渲染真实 DOM：可用 Semantic UI Mock 产出 `ui:intent` 事件流（见 `ui-ux/04-semantic-ui-modeling.md`）。
- Logic 在 Worker 内运行 Logix Runtime；所有行为通过 RunResult 输出（见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）。

对齐要点：

- `ui:intent` 事件必须携带 `componentId` 与（可选）`scenarioId/stepId`，以便 Alignment 把“点击了哪个按钮”映射回 Spec Step。
- RunResult 的其他事件（`debug:event`）通过 `tickSeq/instanceId/txnSeq/opSeq/linkId` 与 `program/run/timer/call anchors` 串起因果链，避免“UI 发生了但不知道为何”。

## 4) 三种消费模式（避免平台锁死）

Binding 协议必须支持“逐级跳伞（Ejection）”，否则无法长期演进：

1. **Managed（平台托管）**
   - 用途：Sandbox/预览/快速验证
   - 消费：Runtime 解释 Binding（最小开销、可观测优先）

2. **Codegen（React 产物）**
   - 用途：生产构建（UI 仍是普通 React）
   - 消费：把 Binding 编译成 `props={state.x}` / `onClick={actions.submit}` 等 TSX 投影

3. **Pro‑Code（手写覆盖）**
   - 用途：复杂 UI/极致性能/组件库深度定制
   - 消费：保留 Binding 作为“设计时真相”，但允许局部节点变成 Gray/Black Box（仍需通过 RunResult 观察边界行为）

## 5) 与其它文档的边界

- IntentRule（连线协议）数据模型：`docs/specs/sdd-platform/workbench/14-intent-rule-schema.md`
- Semantic UI Mock 与 UI_INTENT：`docs/specs/sdd-platform/workbench/ui-ux/04-semantic-ui-modeling.md`
- RunResult/证据链口径：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`
