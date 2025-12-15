# Platform · Intent & UX Planning (Draft)

> **Status**: Draft
> **Scope**: 平台侧围绕「业务意图 → 规则 IR → 代码 / Runtime」的整体交互规划。
> **Goal**: 为后续更细化的产品需求与交互稿提供统一骨架（目录级规划），避免 Intent 层设计和平台体验脱节。

本目录用于沉淀「平台视角」下的规划：
- 产品 / 设计 / 架构 / 开发 如何在同一套 **意图模型** 上协作；
- 画布 / 列表 / 表单 / 调试视图 如何承载 `IntentRule` 与 L1/L2/L3 API；
- 如何让未来的 LLM / Agent 在平台上与人协同编排业务逻辑。

## 1. 核心共识回顾（R-S-T + L1/L2/L3 + IntentRule）

平台 / Runtime / 代码三端共同遵循的统一模型：

- **R-S-T 链路**：任何联动都抽象为一条 `Source --Strategy--> Target` 的响应式链路：
  - Source：事件从哪里来？（State 视图 / Action / External）
  - Strategy：如何流动？（过滤、防抖、并发、错误、Scope）
  - Target：最后作用在哪？（本 Store 状态、本/他 Store Action、Service 调用等）

-- **IntentRule（IR）**：平台侧的统一规则表示（详见 `runtime-logix/core/06-platform-integration.md`）：
  - `source`: `{ context, type, selector }`
  - `pipeline`: `[{ op, args }]`
  - `sink`: `{ context, type, handler }`
  代码中的 **Fluent DSL（`$.onState` / `$.onAction` / `$.on(stream)`）** 会被解析为 IntentRule；不同 L1/L2 规则形态仅通过 IntentRule 的字段（例如 kind/context/type）区分，不再依赖运行时 `Intent.*` 命名空间。

- **L1 / L2 / L3 分层 API（代码视图）**：
  - L1：单 Store 内同步联动 —— 代码侧推荐用 `$.onState / $.onAction` + `.update/.mutate` 表达；在 IR 中对应 L1 IntentRule（self.state/self.action → self.mutate）；
  - L2：跨 Store 协作 —— 代码侧推荐用 `$.use(StoreSpec)` 获取 StoreHandle + `$.on($Other.changes/… ).run((payload) => $Target.dispatch(/* action */))` 表达；在 IR 中对应 L2 IntentRule（A.state/A.action → B.dispatch）；
  - L3：Flow/Stream/Effect —— 极度定制化逻辑的逃逸口，平台仅部分可视化或降级为 Code Block。

本目录后续所有平台交互设计，都默认建立在这套模型之上：

> 画布 / 表单 / 列表 操作的是业务语义 → 映射为 `IntentRule` → 再由生成器落到 Fluent 代码（`$.onState` / `$.onAction` / `$.on` + `$.state/dispatch`）/ Flow / Pattern 上。

## 2. 平台顶层模块（视角与职责）

结合现有 v3 文档（`06-platform-ui-and-interactions.md` 等），平台 UI 规划初步拆为以下几大模块（之后可演进为独立文档）：

1. **Universe View（模块拓扑视图）**
   - 视角：业务域 / 模块之间的依赖拓扑。
   - 目标用户：产品、架构。
   - 核心能力：
     - 展示业务域、模块、跨模块依赖（可由 IntentRule 聚合得到）。
     - 支持从模块节点 Drill-down 到 Logic/Intent 编排视图。
     - 高亮“循环依赖模块”“跨域过多联动”等治理信号。

2. **Galaxy View（Logic & Intent 编排画布）**
   - 视角：单个 Logic Module 内的 Pattern / Store / 规则编排。
   - 目标用户：PM、资深前端、架构师。
   - 核心能力：
     - 把 Store / Pattern / Service 代理节点与 UI Trigger 连接成信号流；
     - 支持拖拽业务积木（字段联动、模块联动、审批流、搜索-详情等），自动生成/更新 IntentRule；
     - 右侧 Config Panel 直接编辑规则参数（源/目标/条件/策略），驱动对应 IntentRule 的变更；
     - 与代码联动：节点/连线支持「Jump to Code」「Peek Definition」。

3. **UI & Module Studio（屏幕与数据模型工作台）**
   - 视角：页面结构、组件、字段与交互入口。
   - 目标用户：产品、设计、前端。
   - 核心能力：
     - 声明/编辑页面布局与 UI Intent（参照 `07-ui-ux-detailed-specs.md`）；
     - 基于 Module Schema 管理字段、校验、初值；
     - 为各 UI 交互配置 Logic 入口（绑定到具体 Store / Action / IntentRule）。

4. **Pattern Studio（模式资产工作台）**
   - 视角：Pattern 作为可复用逻辑资产。
   - 目标用户：架构师、高级开发。
   - 核心能力：
     - 编写 `(input) => Effect` + Config Schema 的 Pattern 代码；
     - 实时预览 Pattern 的配置表单与模拟执行结果；
     - 发布到 Pattern Registry，作为 Galaxy View 中的业务积木；
-- Pattern 内部可使用 Fluent DSL / Flow / Control / Service，平台仅需关心 Pattern 的输入/输出契约与 meta。

5. **IntentRule Explorer（规则列表视图）**
   - 视角：以“规则表”的方式审视一个模块/页面的所有联动。
   - 目标用户：PM、开发、测试。
   - 核心能力：
     - 按模块/字段/Action 列出所有 IntentRule；
     - 支持搜索/过滤（例如“所有影响字段 X 的规则”“所有跨模块规则”）；
     - 行级操作跳转到 Galaxy 节点或代码；
     - 为治理/审计提供基础视图。

6. **Runtime & Debug View（运行时追踪与调试）**
   - 视角：运行时的触发、传播与状态变化。
   - 目标用户：开发、测试、运维、PM（问题定位）。
   - 核心能力：
     - 时间线：按时间展示 Action/State 变化与触发的 IntentRule；
     - 因果图：从一次变更追溯整条 R-S-T 链路；
     - 与 Galaxy 联动：从 Trace 直接高亮对应节点与规则。

7. **AI Assist / Copilot（意图级助手）**
   - 视角：围绕当前上下文（模块/屏幕/规则）提供自然语言辅助。
   - 核心能力：
     - 读取当前模块的 IntentRule 集合与 Schema，回答“这块逻辑在做什么”；
     - 根据自然语言需求生成/修改 IntentRule（例如“这里加个 500ms 防抖”“Search 结果为空时重置 Detail”）；
     - 协助在 Universe/Galaxy/Explorer 之间导航和做治理建议。

> 后续可以为上述每个模块单独建立文档（如 `platform/universe.md`, `platform/galaxy-intent-canvas.md` 等），本 README 仅作为平台侧规划的“索引与骨架”。

## 3. 后续细化方向（TODO）

1. **IntentRule 视角下的业务积木规范**
   - 为“字段联动卡片 / 模块联动连线 / Pattern 节点”等定义统一的配置 Schema 与对应的 IntentRule 模板；
  - 明确哪些积木仅生成 L1（单 Store 同步联动）、哪些生成 L2（跨 Store 协作），哪些生成 L2/L3 组合（React/Flow/Pattern）。

2. **跨文档对齐**
   - 将本目录中的模块拆分点与 `runtime-logix/core/*`、`v3/02-intent-layers.md`、`v3/03-assets-and-schemas.md` 等文档建立交叉链接，保证“Intent 模型 → Runtime → 平台 UI”三线一致。

3. **PM 视角意图语言（草案）**
   - 基于 IntentRule 设计一套轻量的业务 DSL / 文本描述规范（可选），与画布操作互通；
   - 例如支持类似 YAML 的“当 X 时，若条件 Y，则执行 Z”描述，平台转译为 IntentRule。

4. **AI 辅助策略**
   - 定义 Copilot 的上下文打包规范：每种视图下，向 LLM 提供哪些 IntentRule/Schema/Trace 信息；
   - 规范“AI 推荐模式 / AI 自动修复意图”的交互边界与人工确认流程。

本 README 只是起点，目的是给“平台侧意图与交互体验设计”开一个明确的落脚点。后续可以根据实际产品讨论，将每个模块拆成更细的需求与交互文档。

## 4. 自上而下的资产链路：业务需求 → 意图 → 实现

为了避免“意图在产品 / 平台 / 代码之间一路变形”，平台需要从业务需求开始就用统一的资产体系承载意图。可以粗分为四个层级：

### 4.1 Level 0：业务需求（Business Requirement）

- 形态：需求文档 / 用户故事 / PRD 段落，例如：
  - “搜索结果列表的第一条应自动在右侧详情面板展示”；
  - “审批通过时记录审计日志并刷新待办列表”；
  - “用户切换国家时，应清空省份和城市字段”。
- 责任角色：PM / 业务方。
- 平台职责：
  - 提供结构化模板，引导需求用“当 X 时，如果 Y，则系统应 Z”的形式书写；
  - 为 Level 1 的意图拆解提供上下文输入（包括场景、页面、字段、约束等）。

### 4.2 Level 1：需求意图（Requirement Intent）

- 形态：将自然语言需求投影到 v3 Intent 模型（UI / Logic / Module / Constraint），并初步拆成「用例级蓝图」：
  - UI / Interaction：涉及哪些页面、哪类用户行为（点击、输入、切换）作为 Trigger；
  - Data & State：哪些字段/实体参与联动；
  - Behavior & Flow：需要哪几步行为（调用 Service、更新状态、调度其他模块）；
  - Constraints：防抖/幂等/并发/超时等约束。
- 平台资产：
  - **Use Case Blueprint**：一个用例级的“意图蓝图”，对应一组候选的 `IntentRule` 集合 + 可能用到的 Pattern/模块。
- 责任角色：PM / 架构 / AI 协同。
- 与 IR 的关系：
  - Level 1 不一定直接用 TS API 表达，但可以先生成较粗粒度的 `IntentRule` 草稿（只填 source/sink，pipeline 可以留空或用自然语言注释）。

### 4.3 Level 2：开发意图（Developer Intent）

- 形态：在 Requirement Intent 的基础上，显式落到具体的 Store / Pattern / Intent API 选择上：
  - 确认涉及到哪些 Logix.ModuleShape（State/Action Schema）；
  - 确认哪些联动属于 L1（单 Store 同步联动）/ L2（跨 Store 协作）/ L3（Flow/Pattern）；
  - 为每条规则选择合适的 API 形态（Intent 快捷方式 / 结构化 Coordinate / Flow 组合）。
- 平台资产：
  - **IntentRule 集合**：用结构化的 IR 全面覆盖某个用例/模块的联动规则；
  - **Pattern Asset**：`(input) => Effect` 级别的可复用行为；
  - （可选）Logic 模板 / Store 模板，用于在单项目内复用场景级模块。
- 责任角色：资深前端 / 架构 / LLM（在上下文中补全 IntentRule → Intent API 映射）。

### 4.4 Level 3：实现与出码（Implementation & Codegen）

- 形态：将 Level 2 的开发意图自动或半自动生成为具体代码与运行时配置：
  - 类型安全的 Module Schema / `Logix.Module` 定义与 `Module.logic` / `Module.live` 调用；
  - Logic 程序内部的 Fluent DSL / Flow / Control 调用；
  - Pattern 定义文件、测试用例、React 绑定代码等。
- 平台职责：
  - 提供稳定的 Codegen 模板：从 `IntentRule` 到 Fluent DSL / Flow 调用的标准化生成；
  - 通过 AST patch 方式安全地对现有代码进行增量修改（遵守项目风格与已有结构）；
  - 与 Runtime（Logix / Effect Flow Runtime）对齐类型与 Layer 组合方式。

### 4.5 资产体系在四个层级中的角色

结合前述资产分类，四个层级可以大致对应不同粒度的可复用资产：

- Level 0：
  - 需求模板 / 用例库（以自然语言或轻量 DSL 形式存在），便于沉淀业务场景。
- Level 1：
  - Use Case Blueprint（需求意图蓝图），本质是一组未完全实现的 IntentRule + Pattern/模块引用。
- Level 2：
  - Pattern 资产 / Logic 模板 / Store 模板 / IntentRule 集合，构成开发侧的“意图实现资产”。
- Level 3：
  - 具体的 Store / Logic / Pattern / React 组件代码，与 Runtime 配置；
  - 仍然可以通过 Pattern/模板机制在多个项目中横向复用。

这套自上而下的链路，目标是让“业务需求 → 需求意图 → 开发意图 → 实现出码”在平台内部都能用同一套概念对齐：

- PM / 业务侧主要操作 Level 0–1；
- 架构 / 高级开发主要在 Level 1–2 设计蓝图与资产；
- 代码生成与 Runtime 实现负责 Level 2–3 的落地；
- LLM/Agent 贯穿全链路，帮助从自然语言推导/对齐 IntentRule 与具体实现。***
