---
title: Agent 集成与编排规划 (Agent Integration & Orchestration)
status: draft
version: v3-code-first
---

> 本文是 `v3/06-codegen-and-parser.md` 的 **Agent 视角补篇**，不引入新的运行时 API，
> 仅从「LLM / Agent 如何与 Logix v3 协作」角度，对既有规范做约束与展开。

核心原则可以概括为一句话：

> **先立法（类型与文档），后执法（Parser），最后上岗（Agent）。**
> Bound API (`$`) + Fluent DSL + IntentRule IR 是唯一事实源，Agent 只是熟读手册的虚拟工程师。

## 1. 角色与目标：Agent 不是 Chatbot

- 角色定位：**Logic Pilot** —— 在单个 Logic 文件 / Module 上，基于 Bound API (`$`) 编排业务逻辑。
- 操作对象：不操作 JSON 配置，而是直接编辑 TypeScript 代码（`Module.logic(($)=>...)` 内部），使用 `$.onState` / `$.onAction` / `$.on` / `$.state` / `$.actions` / `$.use` / `$.match`。
- 上下文来源：Agent 的“世界观”来自类型与 AST：
  - 类型层：`logix-v3-core.ts`（Bound API / Flow / Control / Coordinator 类型草案）；
  - 文档层：`runtime-logix/core/03-logic-and-flow.md`、`06-codegen-and-parser.md`；
  - 代码层：当前 Logic 文件与微观沙箱中的 Schemas / Spec / IntentRule 片段。
- 目标：在 **保证类型与 IR 正确性** 的前提下，尽量使用 Fluent 白盒子集表达逻辑，使平台可以稳定还原 IntentRule 与 Logic Graph。

## 2. 五种技能：Bound API 作为认知模型

在 Agent 视角下，Bound API (`$`) 不是普通工具集，而是一套「思维技能」：

1. **感知 (Perception) → `$.flow` / `$.onState` / `$.onAction` / `$.on`**
   - 负责回答：“**什么时候触发？**”
   - 典型映射：
    - “监听本地 State 变化” → `$.onState(selector)`（语义等价于 `$.flow.fromState`）；
    - “监听本地 Action” → `$.onAction(predicate)`（语义等价于 `$.flow.fromAction`）；
     - "监听跨 Store / 外部流" → `$.on(stream)`，常见写法是 `$.on($Other.changes(...))`。

2. **策略 (Strategy) → Pipeline Operators / `$.flow`**
   - 负责回答：“**信号如何流动？**”
   - 典型映射：
     - “防抖” → `.debounce(ms)`；
     - “节流” → `.throttle(ms)`；
     - “过滤” → `.filter(predicate)`；
     - “并发策略” → `{ mode: "run" | "latest" | "exhaust" | "sequence" }` 或对应 `Flow.run*` 变体。

3. **行动 (Actuation) → `$.state` / `$.actions`**
   - 负责回答：“**最后作用在哪？**”
   - 典型映射：
     - “修改当前 Store 状态” → `$.state.mutate(draft => { ... })` / `$.state.update(prev => next)`；
     - “派发 Action” → `$.actions.dispatch(action)`。

4. **协作 (Collaboration) → `$.use`**
   - 负责回答：“**需要谁的帮助？**”
   - 典型映射：
     - “读取其他 Store 的状态/变化” → `const $Other = yield* $.use(OtherSpec)`；
     - “调用 Service” → `const api = yield* $.use(ApiServiceTag)`。

5. **结构 (Structure) → `$.match` / `Effect.*`**
   - **意图**：表达分支、错误处理、并发等结构化逻辑。
   - **映射**：
     - 条件分支 → `$.match(val).when(...).exhaustive()`；
     - 错误边界 → `Effect.catchAll(...)`；
     - 并行执行 → `Effect.all([...])`。

> Agent 视角下，这五个技能是等价的一等公民：
> **不要只会写 `$.onState` / `$.onAction` / `$.on` 和 `$.state`，却把所有结构层逻辑埋在裸 `if/else` 和 `try/catch` 里。**

> 与 runtime-logix v3 的对齐说明：这里的“感知/策略/行动”等技能，正好对应 Bound API `$` 内部的几个子域——`$.on*` 负责感知 (Perception)、`$.flow.*` 负责策略 (Strategy，时间轴与并发)、`$.state / $.actions` 负责行动 (Actuation)、`$.use` 与 `$.match` 分别承担协作与结构层职责。Agent 在写代码时应始终沿着这条链路思考，而不是把它们当成三套割裂的 API。

## 3. Fluent 白盒子集与 Effect 纯度（硬约束）

Agent 输出的代码必须遵守 v3 已经确定的“白盒子集”和 Effect 约定。违反这些约束，Parser 将直接拒绝生成 IntentRule：

1. **Fluent 链形态（白盒子集）**
   - 仅以下形态被视为白盒 Fluent 链，并被 Parser 还原为 IntentRule：
    - `yield* $.onState(selector).op1().op2().then(effect, opts?)`
    - `yield* $.onAction(predicate).op().then(effect, opts?)`
     - `yield* $.on(streamExpr).op().then(effect, opts?)`
   - 约束：
     - 链必须写在**单条 `yield*` 语句**中，不得拆成中间变量：
      - ✅ `yield* $.onState(...).debounce(300).then(...);`
      - ❌ `const flow = $.onState(...).debounce(300); yield* flow.then(...);`（Parser 视为 Raw Block）。
     - 中间算子必须来自受支持子集：`debounce` / `throttle` / `filter` 等，后续可扩展，但 Agent 不得擅自创造新算子名。

2. **Effect 纯度：禁止在 Logic 中使用 async/await**
   - Logic 与 Handler 内部不得直接使用 `async/await` 或返回 Promise 的函数：
     - `then` 的第一个参数必须是 `Effect.Effect`（通常由 `Effect.gen(function*(){ ... })` 构造），不得是 `async () => { ... }`。
     - 若需要调用 Promise API，应视为 Service 封装问题：由人类/平台在 Service 层使用 `Effect.tryPromise` / `Effect.promise` 包裹；Agent 只调用 `yield* api.method(...)`。
   - Parser 在遇到 `async` 形式的 Handler 时，应当返回 `ERR_ASYNC_HANDLER`，并提示 Agent 改写为 `Effect.gen + yield*` 形式。

3. **IR-first：优先使用 Fluent 子集表达 IntentRule**
   - Agent 的首要目标不是“写出任何能跑的代码”，而是**用 Fluent 子集表达 IntentRule**：
     - 在保证类型与业务语义正确的前提下，应优先选择 `$.onState().then(...)` / `$.onAction().then(...)` / `$.on().then(...)` + `$.match` 的组合；
     - 只有在需求确实无法落在 Fluent 子集内，或用户明确要求“Eject 到代码”时，才允许生成 Raw Block（例如直接编排 `Flow.*` / 复杂 `Effect`）。
   - Prompt 层推荐加入显式指令：**“除非万不得已，不要写 Parser 无法识别的结构（如拆链/任意 `async` handler）。”**

## 4. 所有权与 Eject 协议：`@agent-generated`

为避免 Agent 和人类“抢地盘”，需要对 `@agent-generated` 代码块的主权做清晰约定。

### 4.1 状态机（简化版）

以单个 Fluent 规则为粒度，可以抽象出三种状态：

1. **Agent 控制（Agent-owned）**
   - 代码块带有 `@agent-generated` 标记，且仍然是合法的 Fluent 链：
    `yield* $.onState(...).op().then(Effect.gen(...))`。
   - 视为由 Agent 负责维护的受控区域：平台允许 Agent 在其上做结构化修改（调整 debounce 时间、切换并发模式等）。

2. **人类微调但仍在白盒子集内（Co-owned）**
   - 人类对 `@agent-generated` 区域进行了修改，但 Parser 仍能识别为合法 Fluent 链。
   - 行为：
     - `@agent-generated` 标记保留；
     - 后续 Agent 修改必须以**当前 AST** 为唯一事实源，不得凭历史快照覆盖人类修改；
     - 允许 Agent 在链条结构不变的前提下做增量修改（如调整参数、填充 handler 内部逻辑）。

3. **已被 Eject 的 Raw Block（Ejected）**
   - 任一条件满足时视为已 Eject：
     - Fluent 链被拆成变量 / 动态组合，Parser 无法还原 R-S-T 结构；
     - 行内混入大量裸 `if/else` / `try/catch` / 任意控制结构，失去可视化边界；
     - 开发者显式移除 `@agent-generated` 注释。
   - 行为：
     - 平台在解析时自动移除 `@agent-generated` 标记，并将该段视为 Raw Block；
     - Agent 不再对该区域做“结构化维护”，只能给出**非强制性的建议**（例如评论/重构建议），不得静默覆盖整段实现。

### 4.2 Agent 行为约束

从 Agent 侧看，必须遵守的底线：

- 不得在用户未明确同意的情况下，重写已 Eject 的 Raw Block；
- 在 Co-owned 区域，只能基于当前代码做增量修改，禁止用“重写整个函数”的方式覆盖人类逻辑；
- 如发现 Fluent 链已经脱离白盒子集，应主动提醒“此规则已 Eject，无法再进行结构化编辑”，并建议用户恢复 Fluent 写法或接受 Raw 模式。

## 5. 微观沙箱：最小特权上下文

为了降低幻觉和误用依赖的风险，平台向 Agent 注入的上下文必须遵守**最小特权原则**。

### 5.1 必须注入的内容

针对单个 Logic 文件（通常对应某个 `Module.logic(($)=>...)`）：

- 当前 Module 的定义与 Schema 投影：
  - Module 标识（Id）、State/Action Schema 片段（字段名与类型，而非全部实现）；
  - 已存在的 Logic 代码片段（便于 Agent 做增量修改）。
- 已声明的依赖与一跳邻居：
  - 当前 Logic 中出现的 `yield* $.use(ModuleOrService)` 调用列表；
  - 与这些 Module / Service 在 IntentRule 拓扑上直接相连的一跳邻居（便于处理常见 L2 协作）。
- Bound API 与 Fluent 子集说明：
  - `$` 的类型签名片段：`state` / `actions` / `flow` / `control` / `use` 等方法名称与参数形状；
  - 1–2 个官方 Fluent 示例，作为风格与约束的示例代码。

### 5.2 明确禁止注入的内容

- 与当前 Logic 在 Module / IR 上**无直接关系**的其他业务域 Module / Service；
- 大体量实现细节：完整 Service 实现、长算法、非本场景的 Logic 文件；
- Runtime 内核细节：Tag / Context / Layer 组合实现等（对 Agent 来说视为黑盒）。

> Agent 侧额外约束：
> 只能对「Available Stores/Services」列表中的实体调用 `$.use`，不得凭空创造新的名称；
> 如需要能力不在列表中，应报告“当前沙箱不可用”，而不是编造模块。

## 6. Parser：执法者与反馈循环

Parser 是 Code-First 路径下的“执法者”，负责在类型与 AST 层面执行上述约束，并为 Agent 提供结构化反馈。

### 6.1 职责与输入输出

- 输入：
  - 单个 Logic 文件的 TypeScript 文本（或 AST）；
  - 可选：对应的 IntentRule / Spec 元信息，用于验证上下文一致性。
- 行为：
  - 扫描 `yield* $.onState(...) / $.onAction(...) / $.on(stream)...` 形态的 Fluent 链；
  - 尝试将其还原为 `{ source, pipeline, sink }` 结构的 IntentRule；
  - 识别常见违规模式并给出错误码（例如 `ERR_ASYNC_HANDLER` / `ERR_SPLIT_CHAIN` / `ERR_UNSUPPORTED_OP`）。
- 输出：
  - 成功：`{ rules: IntentRule[], errors: [] }`，每条规则附带位置与简要说明；
  - 失败：`{ rules: PartialIntentRule[], errors: ParseError[] }`，提供足够信息帮助 Agent/人类定位问题。

> 实现建议：
> 首版 Parser 可以基于 `ts-morph` 实现为 CLI 工具：
> `pnpm tsx scripts/intent-fluent-parser.ts --file path/to/logic.ts`，
> 只支持最小 Fluent 子集与少量错误码即可，后续再迭代。

### 6.2 与 Agent 的交互模式

- 在 Copilot / Agent 场景中，一次完整的交互应包含：
  1. Agent 生成/修改 Logic 代码（遵守本补篇约束）；
  2. 平台调用 Parser 对最新代码做静态验证；
  3. 若通过：返回 IntentRule 集合与 Graph 预览；
  4. 若失败：将结构化错误（错误码 + 位置 + 简短说明）反馈给 Agent，让其自愈修复。
- Parser 不负责“替用户改代码”，只负责做**判定与解释**；修复行为始终由 Agent 或人类承担。

## 7. 实施路线图回顾（Phase 1 → 3）

结合 v3 其他文档，本补篇推荐的实施顺序是：

1. **Phase 1：IDE Copilot（Headless）**
   - 以单文件 Copilot 为主，验证 Bound API 对 LLM 的友好度；
   - 关键指标：`Pass@1`（TSC + Parser 同时通过的比例）与 Fluent 白盒覆盖率。

2. **Phase 2：Canvas Orchestrator（Galaxy View 集成）**
   - 在 Galaxy View 中挂载 Agent，允许用户对单条规则发起自然语言修改请求；
   - Agent 基于 AST + IntentRule 做局部 patch，Parser 校验后更新 Graph；
   - Eject / Raw Block 只提供“跳转代码”和“Eject 到代码”的交互，不提供可视化编辑。

3. **Phase 3：Semantic Refactoring（语义级重构）**
   - Agent 在 IR / Module / 拓扑层面规划重构（例如拆 Module / 抽 Pattern），再下沉到具体代码 patch；
   - 必须依托 IntentRule 拓扑与 Module 关系，而不是纯文本/AST 重写；
   - 关键指标：典型业务 Flow 的回归脚本通过率与 Graph 拓扑稳定性。

通过以上“立法 → 执法 → 上岗”的路径，可以保证：

- 对人类开发者：始终可以在类型与文档层清晰理解 Agent 的权限与行为边界；
- 对平台：Parser 与 IntentRule 成为统一事实源，不被 Agent 的实现细节牵着走；
- 对 Agent：拥有清晰的五种技能与写作子集，不必猜测哪些写法是“平台可接受的”。
