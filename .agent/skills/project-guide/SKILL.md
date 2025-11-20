---
name: project-guide
description: 当在 intent-flow 仓库内进行架构设计、Flow/Effect 运行时演进、典型场景 PoC 或日常功能开发时，加载本 skill 以获得“单一事实源”（SSoT）级的项目指南、目录索引与施工流程。
---

# intent-flow · project-guide

## Overview

本 skill 充当 intent-flow 仓库的“总施工手册 + 设计导航”，帮助后续的 Claude 实例在有限上下文里快速对齐：仓库愿景、docs/specs 体系、Effect 运行时 PoC、以及在当前阶段应该如何落地一个具体需求。

> 说明：当前内容基于规划期设计整理，后续若 v2 文档或运行时实现出现与本 skill 不一致的更新，一律以最新 specs/实现为准，本 skill 视为待同步对象。

> 所有对“平台能力”“Flow/Effect 写法”“目录规范”的问题，优先将本 skill 视作 SSoT，再按指引跳转到更细的 specs 文档或代码位置。

## WHEN · 何时加载本 skill

- 在本仓库内接到任何“新增功能 / PoC / 重构 / 规范化”类任务时作为优先 skill；
- 需要理解「意图驱动 + Effect 运行时」整体蓝图、六层 Intent 模型或 v2 规划时；
- 需要决定：某个需求/修改应该落在 docs/specs 文档层、effect PoC、还是 `packages/effect-runtime-poc` 真实运行时代码时；
- 在 CI/工具/脚手架层面扩展本仓库时，确认“事实源与契约”应该写在哪。

## CORE IDEAS · 项目核心共识

- **仓库定位**：本仓库是「意图驱动 + Effect 运行时」的实验场，而不是直接面向业务的产品仓库；可以不计成本地修改结构与代码，以沉淀最佳写法与运行时契约。
- **Intent 六层模型**：所有需求优先用 Layout / View&Component / Interaction / Behavior&Flow / Data&State / CodeStructure + Constraint & Quality 这套意图分类来思考和拆分，避免一开始就混在“组件/接口/文件”层。
- **What/How 分层**：docs/specs 里的 Intent/Flow/Effect 设计负责表达 “What”（意图与契约），具体实现 “How”（React 组件、Effect Env 实现、CLI 命令）分别落在 PoC 或运行时子包中。
- **Effect 运行时角色**：Effect 只做 Behavior & Flow Intent 的执行内核 + 横切能力（重试/超时/日志/Trace），不侵入领域算法本身；复杂业务仍保留在服务实现里。
- **SSoT 原则**：关于「意图语义」「schema 契约」「Flow/Effect 写法」的权威定义在 docs/specs/v2 下，本 skill 只是导航与压缩摘要；所有实现需要回到 specs 对齐。

## REPO MAP · 仓库总览与目录分工

在处理任何任务前，先用这张“心智地图”定位改动目标：

- `docs/specs/intent-driven-ai-coding/README.md`  
  - 说明整套“意图驱动 AI Coding 平台”的动机与原始诉求；
  - 给出从 v1（资产视角）到 v2（意图分层视角）的演进背景。

- `docs/specs/intent-driven-ai-coding/v2/`  
  - `01-overview.md`：六大意图类型与平台蓝图总览（首选阅读入口）；  
  - `02-intent-layers.md`：逐个定义 Layout / View / Interaction / Behavior&Flow / Data&State / CodeStructure + Constraint 的语义与 Schema 草稿；  
  - `03-assets-and-schemas.md`：把 Intent / Pattern / Template / Plan / Flow / best-practice 映射到各意图层；  
  - `04-intent-to-code-example.md`：订单管理示例，串起“需求 → 意图线稿 → IntentSpec → Pattern/Plan/Flow/Effect → 代码骨架”；  
  - `05-platform-ux.md`：Intent/Pattern/Flow/Code Studio 与预览工作台的 UX 蓝图；  
  - `06-intent-linking-and-replay.md` & `06-intent-linking-and-traceability.md`：意图之间的关联模型、Interaction 录制/回放与可追踪性；  
  - `97-effect-runtime-and-flow-execution.md`：Effect 运行时职责、Env/Layer 设计与 Flow 执行链路；  
  - `98-intent-boundaries-and-open-questions.md`：Intent 边界与当前未决问题；  
  - `99-long-term-blueprint.md`：长期演进蓝图；  
  - `SCHEMA_EVOLUTION.md`：Intent/Plan/Flow 等 schema 的演进契约与兼容性规则。

> 当需要对某类意图或运行时作出“原则性决定”（例如 Flow 步骤集、Env 组织方式），优先在 v2 文档中更新，再同步到代码。不要只在代码里临时拍脑袋。

- `docs/specs/intent-driven-ai-coding/v2/design/`  
  - `layout.md`：布局意图与网格线稿、区域树；  
  - `view-and-component.md`：视图/组件意图与 UI/Pro Pattern 的关系；  
  - `interaction.md`：交互意图（事件 → 即时 UI 反馈）；  
  - `behavior-and-flow.md`：行为/流程意图，Flow DSL/AST 与 `.flow.ts` 的关系；  
  - `data-and-state.md`：数据/状态意图，与后端契约、store/query 规范的绑定；  
  - `code-structure.md`：工程结构意图，对模块/文件/目录的出码约束；  
  - `constraints-and-quality.md`：约束与质量意图（性能、安全、可观测性等）。

- `docs/specs/intent-driven-ai-coding/v2/effect-poc/`  
  - 以 `effect-ts` 或简化版 Effect 为基础，按场景拆分 Env/Flow/Layer 的 PoC；  
  - 用来在“正式沉淀 best-practice 之前”快速尝试 ToB 场景中复杂异步、表单、轮询、审批等写法；
  - 每个场景目录下约定 `env.ts`（服务接口）、`flow.ts`（Effect Flow 实现）、`index.ts`（可选 run 示例）。

- `packages/effect-runtime-poc/`  
  - 真实依赖 `effect`（v3.x）的运行时子包，逐步抽象 Env/Flow/Layer 结构；  
  - 需要严格遵守项目中对 `Effect.Effect<A, E, R>` 三个泛型顺序、Env 逆变等约定；
  - 未来 Studio / 平台将基于这里的运行时契约来驱动实际执行。

## WORKFLOW · 常见任务流程

本节给出几类典型任务的推荐步骤，所有落地工作都应尽量沿这些路线前进。

### 场景 1：为新 ToB 业务补一条 Flow PoC

1. **对齐业务与意图分层**  
   - 先用自然语言梳理需求，用六类 Intent 重新描述：布局、视图、交互、行为/流程、数据/状态、工程结构；  
   - 若某一层的表达不清晰，优先查阅 `v2/02-intent-layers.md` 与 `v2/design/*` 里对应文档。
2. **在 docs/specs 里落下 Intent 草稿**  
   - 在 v2 下新增或扩展对应的 Intent/Use Case 文档，至少明确 Behavior & Flow Intent 的步骤链与触发事件（引用 InteractionIntent 的 eventId）；  
   - 若涉及新数据结构，遵守 Data & State Intent 的事实源约定（优先引用 OpenAPI/TS 类型，必要时记为临时 local 定义）。
3. **在 effect-poc 中添加场景子目录**  
   - 在 `docs/specs/intent-driven-ai-coding/v2/effect-poc/scenarios` 下新增场景目录，创建 `env.ts` / `flow.ts`（可选 `index.ts`）；  
   - Env 以“按服务分桶”的方式定义（OrderService/ExportService 等），不要按 API 调用分桶。
4. **参考 97 文档设计 Flow/Env/Layer**  
   - Flow 使用 Effect 组合基础步骤（callService/branch/parallel 等），避免在 Flow 中内联复杂领域逻辑；  
   - 横切能力（重试/超时/审计/Trace）通过 Layer 与 ConstraintIntent 提供。
5. **补充回流到 v2 文档**  
   - 当 PoC 的写法被认为合理时，把关键经验回写到 `97-effect-runtime-and-flow-execution.md` 和相关 design 文档，形成新的约束或示例。

### 场景 2：在 effect-runtime-poc 中扩展运行时能力

1. **从文档找“职责边界”**  
   - 先重读 `97-effect-runtime-and-flow-execution.md` 与 `SCHEMA_EVOLUTION.md`，确认要改的是运行时能力，而非业务 Flow 本身；  
   - 若改动影响 Flow DSL 结构或 Env 契约，必须同步更新 v2 文档。
2. **以最小增量扩展 Env/Layer/Helpers**  
   - 在 `packages/effect-runtime-poc/src` 中新增 Env 接口、Context.Tag 或 Layer 时，遵守：  
     - `Effect.Effect<A, E, R>` 三个泛型顺序固定为 A/E/R；  
     - `R` 逆变：公共 Flow 的签名应设计为 `<R extends BaseEnv>() => Effect.Effect<A, E, R>` 以便 Env 扩展；  
     - 通过统一的 `getEnv<R>()` 从 Effect.context 中取出 env，而不是在业务代码里对 Context<R> 做断言。
3. **保持 SSoT 与 PoC 一致**  
   - 运行时层增加的新能力（例如统一重试策略、Tracing 字段）应在 `v2/97` 中形成说明，并尽量在 effect-poc 中给出简短示例；  
   - 禁止只改运行时代码、不更新 specs，造成“文档与实现漂移”。

### 场景 3：按 Intent 模型实现一个端到端示例

1. 在 `v2/04-intent-to-code-example.md` 的基础上，挑选一个类似或新的业务用例；  
2. 先完整走一遍“需求 → 意图线稿 → IntentSpec → Pattern/Plan/Flow/Effect”的链路，仅在 docs/specs 中落草稿；  
3. 然后在 effect-poc 与 effect-runtime-poc 中逐步补齐 Flow/Env/Layer 与运行时实现，并保持每一步的 schema 与目录符合 v2 设计；  
4. 最后回到 v2 文档，把踩坑与最佳实践收敛成新的章节。

## DESIGN PRINCIPLES · 关键设计原则速记

- Intent 只表达业务/交互/信息结构的 **What**，不直接表达组件/API/文件的 **How**；  
- Flow/Effect 层只负责“步骤链 + 服务调用 + 横切约束”，领域算法留在服务实现中；  
- `Effect` 泛型顺序固定为 `Effect.Effect<A, E, R>`，避免调换位置；  
- Env 为逆变：让公共 Flow 写成“需要更少依赖”的形式，方便在不同场景复用；  
- Tag 只表示服务接口，不挂业务字段；  
- 语义错误类型 `E` 尽量具体（领域/校验/用户可见），不要把裸 `unknown` 透传到 Flow 之上。

如遇不确定的设计决策，先查本节与 v2 文档，再在 PoC/运行时中实验；实验成功后，回写 specs，保持 SSoT 一致。

## Resources

- `references/project-architecture.md`：在需要比 SKILL.md 更细的“项目架构 & specs 导航”时加载，帮助快速定位应该修改的文档与代码目录。
- `scripts/` 与 `assets/` 当前仅保留模板结构；若后续为本仓库增加通用脚本（如批量校验 Intent/Plan/Flow）或模板资产，可放入相应目录，并在本节补充说明。
