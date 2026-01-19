---
title: 14 · IntentRule Data Model & Schema (The Wiring Protocol)
status: draft
version: 2.0
topic: sdd-platform
---

> **定位**: IntentRule 是连接 **Visual Galaxy（设计态）** 与 **Code Generator（实现态）** 的 wiring 协议：它只描述 “What connects to what”，用于生成/回写代码与驱动 Studio 交互。
>
> **边界**：
> - IntentRule 不是运行时事件协议；运行时证据以 RunResult 为准：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`
> - IntentRule 不是 `Π`：任何动态律（时间/并发/取消/重试/分支）必须编译为 Workflow（权威输入 `WorkflowDef`，导出 `Workflow Static IR（Π slice）`；对外 DX 入口可为 `FlowProgram` 值对象），而不是在 Rule 里塞“表达式/计时器/并发黑魔法”（参照 `docs/ssot/platform/contracts/00-execution-model.md` 与 `specs/075-flow-program-codegen-ir/contracts/public-api.md`）
> - IntentRule 不承载闭包：不得出现不可校验/不可落盘的函数/字符串表达式；需要复杂映射/条件时，必须上升为 Pattern（纯数据 config → 编译到 `C_T/Π`）或 Service（把复杂性下沉到可替换端口）

## 1. 核心模型: IntentRule

在 Galaxy 视图中，每一条连线 (Edge) 或 逻辑单元 (Node) 的组装，背后都对应一条 `IntentRule`。

```typescript
type RuleId = string // MUST be stable (禁止默认随机/时间)；推荐：author 提供稳定字符串，或用 StableJson+hash 确定性派生

interface IntentRuleV2 {
  id: RuleId
  version: 2

  // 1. Topology (What connects to What)
  // 定义了 Galaxy 画布上的连线关系
  source: RuleEndpoint
  sink: RuleEndpoint

  // 2. Metadata (Visual & Governance)
  meta: {
    author?: string
    description?: string // "当用户类型变化时，重置税号"
    visual?: {
      color?: string
      style?: 'solid' | 'dashed'
    }
    // 追踪源码位置 (如果是由 Code 反向生成的)
    codeLocation?: {
      file: string
      line: number
    }
  }
}
```

## 2. Endpoints (连接点)

连接点描述了规则的“起点”和“终点”。它必须足够的结构化，以便支持 **Wizard Forms** 的自动生成。

```typescript
type JsonPointer = string // JSON Pointer；用于“地址/引用”，不得承载可执行表达式

type RuleEndpoint =
  | UiIntentEndpoint
  | StateEndpoint
  | ActionEndpoint
  | ServiceEndpoint
  | WorkflowEndpoint
  | PatternEndpoint

// UI 事件（设计态入口；用于把 componentId 锚定到 RunResult 的 ui:intent 事件）
interface UiIntentEndpoint {
  kind: 'uiIntent'
  componentId: string // stable componentId
  event: string // e.g. "click", "change"
}

// 监听状态变化 (L1/L2)
interface StateEndpoint {
  kind: 'state'
  context: string // ModuleId (e.g. "UserSearch", "self")
  path: string // State Path（作为“地址/引用”，不在 Rule 内做 map/filter 表达式）
}

// 监听或触发动作 (L1/L2)
interface ActionEndpoint {
  kind: 'action'
  context: string
  actionTag: string // ActionTag (e.g. "submit", "reset")
  payload?: unknown // (仅用于 Sink) 允许是“纯数据”或“可校验映射”；复杂映射必须上升到 Pattern/Service
}

// 调用服务 (L1/L2)
interface ServiceEndpoint {
  kind: 'service'
  serviceId: string // MUST align to ServiceId（078）；禁止 methodName 双真相源
  input?: unknown // 推荐使用 075 的 InputExprV1（payload/const/object/merge）；不得携带闭包/表达式
}

// 引用工作流（Π）：Rule 只“指向”一个 Workflow，不在 Rule 里定义控制律
interface WorkflowEndpoint {
  kind: 'workflow'
  programId: string // WorkflowProgramId（稳定锚点；来自 workflowSurface/静态 IR）
  input?: unknown // 推荐使用 075 的 InputExprV1（仅从 source payload 映射）
}

// 调用复杂模式 (L2/L3)
// 对应 Galaxy 视图中的 "Pattern Node"
interface PatternEndpoint {
  kind: 'pattern'
  assetId: string // Pattern Asset ID (e.g. "@std/table-search")
  config: unknown // 符合 Pattern Schema 的纯数据配置；Pattern 负责把 config 编译到 `C_T/Π`（不得在 Rule 中塞表达式）
}
```

## 3. Galaxy View Mapping (视图映射)

在 Galaxy 画布中，Entities (Store, Pattern) 是 **Node**，而 IntentRule 是 **Edge**。

| IntentRule Component | Galaxy Element       | Interaction                                                           |
| :------------------- | :------------------- | :-------------------------------------------------------------------- |
| **Source (`state`)** | Node Port (Right)    | 从 Store 节点的 "State" 端口拖出连线。                                |
| **Sink (`pattern`)** | Node Port (Left)     | 连入 Pattern 节点的 "Trigger" 端口。                                  |
| **Sink (`workflow`)**| Node Port (Left)     | 连入 Workflow 节点（只引用，不在 Rule 内编辑控制律）。                |
| **Pattern Config**   | Right Panel (Wizard) | 选中 Pattern 节点，右侧面板根据 Schema 渲染表单，更新 `sink.config`。 |

## 4. Trace Integration (运行时映射)

运行时证据以 RunResult 为准；IntentRule 只提供“设计态锚点”。两者的映射需要一个中间层（Dev Server / Loader / Parser）：

- **Rule Anchor**：Codegen/Parser 需要把 `ruleId`（或等价 digest）注入到运行时可导出的事件元数据里（例如 `RuntimeDebugEventRef.meta.intentRuleId`）。
- **Evidence**：Studio 消费 RunResult 的 `evidence.events`（ObservationEnvelope），并通过 `tickSeq/instanceId/txnSeq/opSeq/linkId` 与 `intentRuleId`（可选）把事件回溯到画布节点/边（口径见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）。
- **Visual Feedback**:
  - 当 `Link{ruleId}` 激活时，Galaxy 上的对应 **连线 (Edge)** 高亮闪烁。
  - 当 Pattern 执行时，对应的 **节点 (Node)** 显示 Loading/Success 状态。

---

## 5. Example JSON（Scenario: Search to Detail）

场景：当 `UserSearch` 模块的 `results` 变化时，如果结果不为空，则自动触发 `UserDetail` 模块的 `load` 动作。

```json
{
  "id": "rule:UserSearch.results->UserDetail.load:autoSelectFirst",
  "version": 2,
  "meta": {
    "description": "Auto-select first result"
  },
  "source": {
    "kind": "state",
    "context": "UserSearch",
    "path": "results"
  },
  "sink": {
    "kind": "pattern",
    "assetId": "@std/auto-select-first-result",
    "config": {
      "source": { "kind": "state", "context": "UserSearch", "path": "results" },
      "when": "nonEmpty",
      "emit": { "kind": "action", "context": "UserDetail", "actionTag": "load" },
      "payloadFrom": { "kind": "state.path", "pointer": "/results/0/id" }
    }
  }
}
```
