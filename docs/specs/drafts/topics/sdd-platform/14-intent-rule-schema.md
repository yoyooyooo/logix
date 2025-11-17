---
title: 14 · IntentRule Data Model & Schema (The Wiring Protocol)
status: draft
version: 1.0
topic: sdd-platform
---

> **定位**: 这是连接 **Visual Galaxy (UI)** 与 **Code Generator (Impl)** 的核心协议。
> 它扩展了 Runtime Core 中的定义，增加了支持画布交互、配置存储与 Trace 映射所需的元数据。

## 1. 核心模型: IntentRule

在 Galaxy 视图中，每一条连线 (Edge) 或 逻辑单元 (Node) 的组装，背后都对应一条 `IntentRule`。

```typescript
type RuleId = string // UUID or Deterministic Hash

interface IntentRuleSchema {
  id: RuleId
  version: number

  // 1. Topology (What connects to What)
  // 定义了 Galaxy 画布上的连线关系
  source: RuleEndpoint
  sink: RuleEndpoint

  // 2. Strategy (How it flows)
  // 定义了中间的流控策略 (Debounce/Filter/Map)
  pipeline?: RuleOp[]

  // 3. Metadata (Visual & Governance)
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
type RuleEndpoint = StateEndpoint | ActionEndpoint | ServiceEndpoint | PatternEndpoint

// 监听状态变化 (L1/L2)
interface StateEndpoint {
  kind: 'state'
  context: string // ModuleId (e.g. "UserSearch", "self")
  path: string // State Path (e.g. "filter.keyword", "results[0].id")
}

// 监听或触发动作 (L1/L2)
interface ActionEndpoint {
  kind: 'action'
  context: string
  type: string // Action Type (e.g. "submit", "reset")
  payload?: any // (仅用于 Sink) 预设的 Payload
}

// 调用服务 (L1/L2)
interface ServiceEndpoint {
  kind: 'service'
  context: string // ModuleId
  method: string // Method Name (e.g. "searchUsers")
  args?: any[] // (仅用于 Sink) 预设参数
}

// 调用复杂模式 (L2/L3)
// 对应 Galaxy 视图中的 "Pattern Node"
interface PatternEndpoint {
  kind: 'pattern'
  assetId: string // Pattern Asset ID (e.g. "@std/table-search")
  config: any // 符合 Pattern Schema 的配置对象
}
```

## 3. Pipeline Operations (流控算子)

描述原本隐藏在 `flow.pipe(...)` 中的逻辑。

```typescript
type RuleOp =
  | { op: 'debounce'; ms: number }
  | { op: 'throttle'; ms: number }
  | { op: 'filter'; expression: string } // 简单表达式，如 "x > 10"
  | { op: 'map'; expression: string } // 简单转换，如 "x.trim()"
```

## 4. Galaxy View Mapping (视图映射)

在 Galaxy 画布中，Entities (Store, Pattern) 是 **Node**，而 IntentRule 是 **Edge**。

| IntentRule Component | Galaxy Element       | Interaction                                                           |
| :------------------- | :------------------- | :-------------------------------------------------------------------- |
| **Source (`state`)** | Node Port (Right)    | 从 Store 节点的 "State" 端口拖出连线。                                |
| **Sink (`pattern`)** | Node Port (Left)     | 连入 Pattern 节点的 "Trigger" 端口。                                  |
| **Pipeline**         | Edge Label / Tooltip | 点击连线，弹出微型编辑器配置 Debounce/Filter。                        |
| **Pattern Config**   | Right Panel (Wizard) | 选中 Pattern 节点，右侧面板根据 Schema 渲染表单，更新 `sink.config`。 |

## 5. Trace Integration (运行时映射)

运行时 (Runtime) 产生的 `EffectOp` 事件流需要映射回 `IntentRule` 以实现“可视化调试”。

- **Trace ID**: Runtime 生成的每个 EffectOp (Action/Flow/State) 携带 `ruleId` (如果是由 Rule 生成的)。
- **Visual Feedback**:
  - 当 `Link{ruleId}` 激活时，Galaxy 上的对应 **连线 (Edge)** 高亮闪烁。
  - 当 Pattern 执行时，对应的 **节点 (Node)** 显示 Loading/Success 状态。

---

## 6. Example JSON (Scenario: Search to Detail)

场景：当 `UserSearch` 模块的 `results` 变化时，如果结果不为空，则自动触发 `UserDetail` 模块的 `load` 动作。

```json
{
  "id": "rule-uuid-1234",
  "version": 1,
  "meta": {
    "description": "Auto-select first result"
  },
  "source": {
    "kind": "state",
    "context": "UserSearch",
    "path": "results"
  },
  "pipeline": [
    { "op": "debounce", "ms": 200 },
    { "op": "filter", "expression": "results.length > 0" }
  ],
  "sink": {
    "kind": "action",
    "context": "UserDetail",
    "type": "load",
    "payload": "${results[0].id}" // 动态绑定表达式
  }
}
```
