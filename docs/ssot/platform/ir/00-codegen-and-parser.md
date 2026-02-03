---
title: 06 · 全双工引擎：静态分析与锚点系统 (The Full-Duplex Engine)
status: living
---

> **核心目标**：实现 Intent (图) 与 Code (码) 的**无损双向同步**。
> 在当前主线架构（Context is World）下，Parser 聚焦于识别 **Module + Fluent Intent 链**，并将其映射为稳定的 IntentRule IR。

> 注：为保证 Platform-Grade 子集的可解析/可回写，`IntentBuilder.andThen`（按 handler 形态/参数数推断语义）已从公共 API 移除；业务/平台只允许显式终端 `.update/.mutate/.run*`。
> 同时，早期 Parser PoC（`scripts/intent-fluent-parser.ts`）已删除。
>
> **现状**：仓库已提供 Node-only 的 `logix` CLI（`specs/085-logix-cli-node-only`）作为“全双工前置”的集成跑道，可导出 `AnchorIndex@v1`、生成 `PatchPlan@v1` 并执行最小写回（`WriteBackResult@v1`）。  
> **但**：本章描述的“Fluent Intent 链 → IntentRule IR”仍属于目标约束与逐步落地路线；当前 CLI/Parser 的已落地部分以 081/079/082 的 contracts 与 `specs/085-logix-cli-node-only/quickstart.md` 为准。
>
> Dev Server（本地桥接进程）的协议与最小特权约束见：`docs/ssot/platform/contracts/04-devserver-protocol.md`


## 0. 全双工的边界：Platform-Grade vs Runtime-Grade

在当前主线中，“全双工”并不意味着 **所有 Effect 代码都要可逆**，而是只对一小块 **平台子集（Platform-Grade Subset）** 做严格约束，其余视为运行时实现细节（Runtime-Grade）。

- **Platform-Grade 子集**（必须全双工，可被平台完整解析与重写）：
  - `Logix.Module.make(...)`（ModuleDef 定义）与 `ModuleDef.logic(($) => ...)` 入口；
  - 基于 `$` 的 Fluent DSL：`$.onState / $.onAction / $.on(...)` + pipeline + `.update/.mutate/.run*`（含 `.run*Task` 等）；
  - `$.use`（依赖锚点）、`$.match`（结构化控制流锚点）、`$.lifecycle.*` 等；
  - 官方/平台认可的 `$` 扩展（如 `$.router` 等），其语义在平台侧有明确的 IR 映射。
- **Runtime-Grade 区域**（不要求可逆，只需可运行、尽量可观测）：
  - 任意 `Effect` / `Stream` 组合、领域算法、容错逻辑等；
  - 通过 Service Tag / Env 提供的实现细节，如 `yield* RouterService`、`yield* PaymentService` 等；
  - 平台只需知道“它挂在某个规则/节点里”，必要时通过 Trace 做灰盒观测。

因此，本章所有“解析规则”“可视锚点”等约束，都只针对 Platform-Grade 子集：**凡是希望进入 IntentRule / 依赖图 / 画布编辑的逻辑，必须用 `$` + Fluent DSL 写在这块子集之内；其余代码默认视为 Runtime-Grade，Parser 仅做最佳努力的灰盒处理**。

## 1. 核心理念：架构即视图 (Architecture as View)

我们依然不试图解析每一行代码，而是只关注架构骨架，但骨架的锚点已经演进为：

- **Module 定义与 Logic 入口**：识别 `Logix.Module.make(...)` 与 `ModuleDef.logic(($) => ...)` 形式的 Logic；
- **Fluent Intent 链**：识别 `yield* $.onState(...).debounce(...).update/mutate/run*(...)` / `$.onAction(...)` / `$.on(streamFromHandle)...run*(...)` 结构；
- **依赖与上下文**：识别 `yield* $.use(ModuleOrService)` 构建模块依赖图与符号表。

换言之：
> 对 Parser 来说，**Bound API (`$`) + Fluent DSL 就是“可视架构”本身**。
> 其他 Effect / Stream 代码视为细节实现，默认降级为 Gray/Black Box。

## 2. 静态分析引擎 (The Static Analysis Engine)

### 2.1 识别规则 (Recognition Rules)

Parser 通过识别特定的 **AST Pattern** 来提取语义：

1.  **Module 定义与 Logic 入口**
   - 匹配 `Logix.Module.make("Id", { state, actions })`，提取：
     - Module 标识（Id）；
     - State/Action Schema（用于 Shape 与 IR 血缘追踪）；
   - 匹配 `ModuleDef.logic(($) => Effect.gen(function* (_) { ... }))`，将其视为一个 Logic 单元，并绑定 `$` 的上下文为对应的模块定义（ModuleDef）。

2.  **依赖符号表 (`$.use`)**
   - 扫描 `const local = yield* $.use(ModuleOrService)`：
     - 若参数是 Module：记录为 Module 依赖，构建 `$LocalModule` → Module.Id 的映射；
     - 若参数是 Service Tag：记录为 Service 依赖。
   - 该符号表在后续 Fluent 解析中用于判定 “某个链条的 Source/Sink 属于哪个 Store / Service”。

3.  **Fluent Intent 链（R-S-T）**
   - 白盒模式仅覆盖以下直接调用形态（单语句，不经中转变量）：
     - `yield* $.onState(selector).debounce(...).update/mutate/run*(...)`  // State Selector (Function)
     - `yield* $.onAction('actionType').debounce(...).update/mutate/run*(...)` // Action Type (String Literal)
     - `yield* $.on(stream$).debounce(...).run*(...)`   // Stream (Object/Identifier)
   - 解析流程：
     - **Rule (Source)**：根据 `$.onState` / `$.onAction` / `$.on` 的不同API，结合符号表确定 Source：
       - Function / ArrowFunction → **State Source** (当前 Store)；
       - StringLiteral → **Action Source** (当前 Store)；
       - Identifier / CallExpression → **Stream Source** (需结合 `$.use` 符号表推导)；
     - **Strategy (Pipeline)**：在有限白盒算子子集内（`debounce` / `throttle` / `filter` / `map` 等）提取 `[{ op, args }]`；
     - **Target (Sink)**：以**终端算子**为准区分语义：
       - `.update/.mutate`：纯同步写入（事务窗口内），对应 IR 的 `sink.type = "mutate"`；
       - `.run*` / `.run*Task`：副作用/长链路（事务外），对应 IR 的 effectful sink；Parser 仅对“直接 dispatch / 直接 state.update/mutate / 直接 Pattern 调用”等可识别形态做结构化提取，其余降级为 Gray/Black Box。

4.  **Pattern 挂载（可选）**
   - 在 Fluent 链中，如 `run*(SomePattern(config))` / `runTask({ ... })`，Parser 将 Pattern 调用视为 Pattern 节点：
     - 使用 `config` Schema 生成属性面板；
     - 将 Pattern 视为带有输入/输出契约的逻辑块，其内部实现仍可视为黑盒。

    - **解析复杂度注记**:
      - 通过 `$.onState` / `$.onAction` / `$.on` 三个独立API，AST 分析可以直接识别类型，简化了 Parser 实现。
      - **约束**: 为确保白盒识别，`Action Type` 必须是字符串字面量，`State Selector` 必须是内联函数。变量引用会导致降级为 Stream Source（需查符号表）。

### 2.2 结构化控制流 (Structural Control Flow)

除了线性的 Fluent 链，Parser 还能识别以下 **结构化节点**，它们在图上表现为特殊形状（菱形、分叉等），而非黑盒代码块。

1.  **分支 (Branch / Switch)**
    - **AST Pattern**: `$.match(val).with(...).exhaustive()`
    - **Graph Node**: 菱形分支节点 (Switch Node)。
    - **解析逻辑**: 提取每个 `.with(predicate, body)` 中的 `body` 作为子图 (Subgraph)。

2.  **错误边界 (Error Boundary)**
    - **AST Pattern**: `Effect.catchTags(...)` / `Effect.catchAll(...)`
    - **Graph Node**: 容器节点 (Boundary Node)，包裹主逻辑，侧边挂载错误处理分支。

3.  **并发组 (Concurrency Group)**
    - **AST Pattern**: `Effect.all([...], { concurrency: ... })`
    - **Graph Node**: 并行容器 (Parallel Node)。

### 2.3 降级策略 (Degradation Strategy)

为保证解析器实现的简洁与鲁棒性，当前主线采用 **显式的白盒/黑盒分界**：

- **White Box（Fluent Mode）**：
  - 满足以下全部条件的 Fluent 链被视为白盒：
    - 直接写成单条 `yield* $.onState(...).debounce(...).update/mutate/run*(...)` / `yield* $.onAction(...).debounce(...).update/mutate/run*(...)` / `yield* $.on(...).debounce(...).run*(...)` 调用（不拆成中间变量）；
    - 使用受支持算子子集；
    - 使用 `$.use` 获取的 StoreHandle / Service，而非手写 Tag / Context。
  - Parser 对白盒链提供完整的 R-S-T 解析与 IntentRule 还原能力。

- **Black Box（Raw Mode）**：
  - 以下情况统一视为 Raw Mode：
    - 任意 `Flow.from(...).pipe(...)` / `stream.pipe(...)` 风格代码；
    - Fluent 链被拆解为中间变量：
      `const flow = $.onState(...).debounce(300); yield* flow.runLatest(...);`
    - 复杂闭包 / 动态组合导致无法稳定识别 Source/Sink。
  - Raw Mode 仅在图上展示为 Code Block，不尝试还原 IntentRule；平台仅提供“打开代码编辑”的入口。

## 3. 锚点系统 (The Anchor System)

当前主线中，锚点系统不再依赖大量魔法注释，而是以内建结构为主、注释为辅：

1. **上下文锚点：`$` 与 Module**
   - 对 Parser 而言，`Logix.Module.make(...)` + `.logic(($) => ...)` 明确标记了 Logic 的上下文（Module Id）；
   - `$` 作为 Logic 文件中唯一的 Bound API 入口，是所有 Intent 链的起点。

2. **依赖锚点：`$.use`**
   - `$.use(ModuleOrService)` 既是运行时代码的 DI API，也是 Parser 构建依赖图的唯一事实源；
   - 所有跨 Module 协作、Service 调用都必须经过 `$.use`，否则平台无法提供稳定的拓扑视图。

3. **规则锚点：`$.onState/$.onAction/$.on + pipeline + (.update/.mutate/.run*)`**
   - Fluent 链本身就是 IntentRule 的结构化表达：
     - `$.onState/$.onAction/$.on` 对应 IR 的 `source`；
     - 链上的算子对应 `pipeline`；
     - 终端算子（`.update/.mutate/.run*`）对应 `sink`。
   - 只有满足 2.1/2.2 中约束的 Fluent 链才被视为“锚点规则”，其余逻辑节点统一降级。

4. **幽灵注解（Ghost Annotations，兜底手段）**
   - 在极少数无法静态推导 Sink 归属的场景，可使用轻量注释提示 Parser：
     ```ts
     // @intent-sink dispatch:Auth
     yield* $.onState((s) => s.xxx)
       .run(dynamicDispatchEffect)
     ```
   - Ghost 注解仅作为兜底，不应成为主流编程方式；一旦可以用 Fluent 明确表达，应优先改写为结构化链路。

## 4. 全双工工作流 (The Workflow)

在新的 Fluent 架构下，全双工工作流可以更精确地描述为：

1. **Code → Graph（Fluent 优先）**
   - 解析入口：扫描 `Logix.Module.make(...)` / `ModuleDef.logic(($) => ...)` / `$.use` / Fluent 链；
   - 构建过程：
     - 基于 Module / use 生成 Module/Service 拓扑；
     - 基于 Fluent 链生成 IntentRule 集合，并将其挂载到对应 Module/Logic 节点下；
     - Raw Mode 代码作为 Code Block 附着在节点上。

2. **Graph → Code（Graph-First 编辑）**
   - 当用户在 Galaxy View 中编辑规则（增加/删除连线、修改防抖时间、切换并发策略等）时：
     - 平台直接修改对应 Fluent 链中的 `on* / pipeline / terminal` 调用参数；
     - 保证修改范围严格限定在白盒子集内，避免破坏手写代码结构。
   - 对于 Raw Mode 节点，平台只提供“跳转代码”与“Eject 到代码”的操作，不提供可视化编辑。

3. **Eject to Code（显式降级）**
   - 用户可主动选择将某个 Fluent 规则“Eject 到代码”：
     - 平台用规范化模板将 Fluent 链转换为 `$.flow.fromX().pipe(..., run*)` 或更底层的 Effect 组合；
     - 在节点上打上“Raw”标记，Parser 不再尝试将其还原为 Fluent Card。
   - 该操作是单向的：一旦 Eject，即视为“手写代码优先”，平台只维护最小的结构化信息（如所属 Store/Logic）。

通过以上约束与流程，我们在当前主线达成了：
- 对业务作者：**一个入口 `$` + Fluent DSL 即是全部**；
- 对平台：**有限且稳定的 AST 子集即可完整重建 IntentRule 与 Logic Graph**；
- 对运行时：在不牺牲 Effect 原生表达力的前提下，将架构复杂性折叠回 Module 定义与 Bound API 内部。
