# Platform Integration (平台集成与治理)

> **Status**: Draft  
> **Context**: 本文档从 Logix 视角说明：在 `intent-driven-ai-coding` v3 架构下，Logix 作为 `logix-engine` Runtime Target，如何消费 Intent/Flow/Constraint 契约并接入平台的治理能力。

## 1. 总体定位

在平台整体架构中：

- **Intent (意图)**：产品与开发者在 v3 模型下表达的 UI / Logic / Domain 等信息；  
- **Platform (平台)**：负责 Intent 的校验、Logic 编译、出码与治理；  
- **Runtimes (运行时家族)**：承接 Logic Intent 的具体执行后端，其中之一就是本文件描述的 Logix Engine Runtime。

## 2. Intent 层映射（Logix 视角）

### 2.1 Domain Intent -> Logix Schema

平台定义的 Domain Intent（实体/字段/校验等）直接映射为 Logix Store 的 Schema 与初始值：

- **Entity / Field Schema**：映射为 `Schema.Struct`、`Schema.Union` 等，组成 Store 的 `StateLayer`；  
- **State Source**：  
  - `local`: 映射为 Store 内部状态字段；  
  - `external`（如 React Query、WebSocket）：通过 `inputs` 与 `Flow.from` 规则接入。

### 2.2 Logic Intent -> Logix Logic（仅 `logix-engine`）

当 Logic Intent 的 `runtimeTarget = 'logix-engine'` 时：

- **Trigger**：`LogicIntent.trigger` → 映射为 Interaction/State 事件：  
  - 字段变化：`Flow.from(store.change(selector))`；  
  - 动作：`Flow.from(store.action(type))`；  

- **Steps**：`LogicIntent.graph` → 映射为 Logic Handler 中的 Effect 步骤序列：  
  - `callService`：`yield* services.ServiceName.method(...)`；  
  - `branch`：`control.branch(...)`；  
  - `runPattern`：`Flow.run(Pattern(config))`。

### 2.3 UI Intent -> Inputs & Actions

UI 意图中的“用户行为”在 UI 层被标准化为 Logix 可消费的事件：

- **字段输入**：映射为 `state.mutate(draft => draft.path = value)`，触发相应的 `change` 规则；  
- **按钮点击等动作**：映射为 `dispatch(action)`；

### 2.4 Constraints -> Rule Options / 中间件

平台定义的非功能性约束映射为：

- **Rule Options**：  
  - 性能：`Flow.debounce`, `Flow.throttle`；  
  - 并发：`concurrency: 'switch' | 'exhaust' | 'queue'` 等；

## 3. 静态分析与竞态治理（Logix 代码视角）

虽然 Logix 在运行时内置了 Loop Protection，但平台侧仍应基于 Logix Logic 做静态分析，以提前发现问题。

### 3.1 依赖图构建（Dependency Graph）

平台解析 Logix Logic，构建 Path 级依赖有向图：

- **Nodes**：State Path（如 `user.name`、`items.*.price`）或 Action/Input 标识；  
- **Edges**：规则依赖关系（如 `Flow.from('a').pipe(run(Logic.set('b')))` 形成 `A -> B`）。

### 3.2 治理策略

| 风险模式 | 检测逻辑 | 平台行为 |
| :--- | :--- | :--- |
| **直接循环** | Graph Cycle (A -> B -> A) | **Error**：阻止代码生成或运行，要求人工介入。 |
| **多源写入** | 多条规则写入同一路径 (A -> C, B -> C) | **Warning**：提示竞态风险，建议合并逻辑。 |

## 4. IntentRule：统一的规则 IR

为了在平台侧统一描述各类联动规则（无论是由开发者手写 Intent API，还是由画布/DSL 生成），本架构引入 `IntentRule` 作为中间表示（IR）：

```ts
interface IntentRule {
  source: {
    context: "self" | string;        // self 或某个 Store/Service 标识
    type: "state" | "action";        // 监听 State 视图还是 Action
    selector: string;                // AST 引用或序列化表达式
  };
  pipeline: Array<{
    op: "debounce" | "throttle" | "filter" | "switchMap" | "exhaustMap" | "custom";
    args: ReadonlyArray<unknown>;
  }>;
  sink: {
    context: "self" | string;        // self 或某个目标 Store/Service
    type: "mutate" | "dispatch" | "service";
    handler: string;                 // AST 引用或序列化表达式
  };
}
```

映射关系示意：

- `Intent.andUpdateOnChanges/andUpdateOnAction`：  
  - `source.context = "self"`，`type = "state" | "action"`；  
  - `pipeline = []`；  
  - `sink.context = "self"`，`type = "mutate"`。  
- `Intent.Coordinate.on*Dispatch`：  
  - `source.context = <SourceStoreId>`，`sink.context = <TargetStoreId>`；  
  - `pipeline = []`；  
  - `sink.type = "dispatch"`。  
- `Intent.react`（未来扩展）：  
  - `pipeline` 中填充 debounce/filter/switchMap 等算子；  
  - 其余字段与上面一致。

平台 Parser 的职责是：

1. 从 TS 代码中解析 Intent API / Flow 组合，尽可能还原为 `IntentRule`；  
2. 对于识别不了的复杂 Flow/Stream，退化为 Gray/Black Box 节点，仅保留 minimal 信息；  
3. 在画布/DSL 编辑规则时，直接操作 `IntentRule` 结构，再通过 Generator 生成标准化的 Intent API 调用。

这使得：**代码写法可以多样，但图模型与平台协议只有一个：IntentRule。**

## 5. 可观测性与 Intent Trace 集成

Logix 默认集成 Effect Tracing 与结构化调试事件（详见 `09-debugging.md`），平台 DevTools 可以在此基础上提供： 

1. **Timeline View**  
   - 展示 State 变更时间轴；  
   - 每条变更关联触发规则、源 Path/Action/Input、Constraint 信息等。

2. **Causal Graph View**  
   - 可视化展示当前变更的因果链（State/Action/Input 之间的传播）；  
   - 与静态依赖图结合，用于分析复杂联动。
