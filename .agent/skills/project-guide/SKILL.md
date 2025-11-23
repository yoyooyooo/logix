---
name: project-guide
description: 当在 intent-flow 仓库内进行架构设计、Flow/Effect 运行时演进、典型场景 PoC 或日常功能开发时，加载本 skill 以获得“docs/specs 为主事实源”的项目导航、目录索引与施工流程。
---

# intent-flow · project-guide

## PURPOSE · skill 目标

在处理 intent-flow 仓库相关任务时，使用本 skill 明确三件事：

- 识别当前问题应落在哪一层：docs/specs 规划（v1/v2）、docs/specs 下的 effect-poc PoC、还是 `packages/effect-runtime-poc` 运行时代码；
- 找到对应的 docs/specs 文档作为事实源，并基于文档中的契约与示例设计改动；
- 把在 PoC/运行时代码中验证过的经验及时回写 docs/specs，保持文档为 SSoT，本 skill 只做摘要与导航。

> 任何涉及 Intent 模型、Flow DSL、Effect 运行时契约的决策，一律以 `docs/specs/intent-driven-ai-coding` 下文档为准；若本 skill 与 docs/specs 不一致，优先修文档，再同步 skill。

## WHEN · 何时加载本 skill

- 在 intent-flow 仓库内接到“新增功能 / PoC / 重构 / 规范化”任务，需要先看清落点与事实源时；
- 需要对齐「意图驱动 + Effect 运行时」整体蓝图、六层 Intent 模型或 v2 规划时；
- 需要决定：某个需求/修改是先更新 docs/specs、还是直接在 effect-poc / effect-runtime-poc 中迭代代码时；
- 在 CI/脚手架/工具链层面扩展本仓库时，需要确认“约束与契约”写在哪个文档或目录时。

## DOCS-FIRST · 文档作为主事实源

在任何实现行为之前，优先按以下顺序定位文档：

1. 读取总览与版本结构  
   - `docs/specs/intent-driven-ai-coding/README.md`：平台原始诉求、v1→v2 演进与六层意图模型大图；  
   - 明确当前改动主要针对 v2 体系（除非显式维护 v1 历史文档）。
2. 查 v2 顶层规划  
   - `v2/01-overview.md`：意图分层与平台蓝图；  
   - `v2/02-intent-layers.md`：六类意图的定义与 Schema 草稿；  
   - `v2/03-assets-and-schemas.md`：Intent/Pattern/Template/Plan/Flow 与意图层映射；  
   - `v2/04-intent-to-code-example.md`：端到端示例链路；  
   - `v2/05-platform-ux.md`：Intent/Pattern/Flow/Code Studio 与预览工作台 UX；  
   - `v2/06-intent-linking-and-traceability.md`：Use Case 锚点、跨层 ID 模型与 Interaction 录制/回放；  
   - `v2/10-product-morphology-and-intent-crystallization.md`：v2 阶段产品形态（三视图）顶层设计；  
   - `v2/97-effect-runtime-and-flow-execution.md`：Effect 运行时职责、Env/Layer/Flow 执行链路；  
   - `v2/98-intent-boundaries-and-open-questions.md`：Intent 边界与未决问题；  
   - `v2/99-long-term-blueprint.md`：长期蓝图与演进路线；  
   - `v2/SCHEMA_EVOLUTION.md`：Intent/Plan/Flow 等 schema 的演进契约与兼容规则。
3. 查 v2/design 细化设计  
   - `v2/design/layout.md`：布局意图与网格线稿/区域树；  
   - `v2/design/view-and-component.md`：视图/组件意图与 UI/Pro Pattern 的关系；  
   - `v2/design/interaction.md`：交互意图（事件 → 即时 UI 反馈）；  
   - `v2/design/behavior-and-flow.md`：行为/流程意图，Flow DSL/AST 与 `.flow.ts`；  
   - `v2/design/data-and-state.md`：数据/状态意图，与数据契约、store/query 规范；  
   - `v2/design/code-structure.md`：工程结构意图，对模块/文件/目录的出码约束；  
   - `v2/design/constraints-and-quality.md`：约束与质量意图（性能、安全、可观测性等）。
4. 查 v1 历史资料（如有需要）  
   - `v1/*`：早期以资产类型为中心的规划，可作为背景与对比，不再作为主合同；  
   - 当发现 v2 未覆盖的旧概念，可从 v1 中提炼，再以 v2 模型重写。

在 docs/specs 中确定意图与契约之后，再进入 PoC 或运行时子包的修改。

## REPO MAP · 文档与代码落点

处理具体任务时，以“docs/specs 决策 → PoC 演练 → runtime 实现”的顺序组织改动：

- `docs/specs/intent-driven-ai-coding/`  
  - 作为 Intent 模型、Flow DSL、Effect 运行时契约的主事实源；  
  - 新约束、新场景、新 Schema 变更一律先更新这里。

- `docs/specs/intent-driven-ai-coding/v2/effect-poc/`  
  - 用于演练“Intent/Flow/Effect 运行时”在简化场景中的落地；  
  - `scenarios/*` 目录按业务场景拆分，包含 `env.ts` / `flow.ts`（可选 `index.ts`）；  
  - 适合验证 Flow DSL/Env/Layer 写法以及横切能力（重试/超时/Trace 等）。

- `packages/effect-runtime-poc/`  
  - 真实依赖 `effect`（v3.x）的运行时子包，逐步抽象 Env/Flow/Layer 结构；  
  - 作为未来 Studio / 平台的运行时基线，需要遵守本仓对 `Effect.Effect<A, E, R>`、Env 逆变与 Tag 模式的所有约定。

## WORKFLOW · 典型任务用法

在使用本 skill 时，按任务类型选择对应流程：

- 新增 ToB 业务 Flow PoC  
  - 先在 `v2/01-overview.md` 与 `v2/02-intent-layers.md` 中对齐六层意图与场景定位；  
  - 在 `v2` 下补充/更新 Intent 描述与 Data/State/Interaction 契约；  
  - 在 `v2/effect-poc/scenarios` 下新增场景目录，编写 `env.ts`/`flow.ts`；  
  - 将验证过的 Flow/Env/Layer 写法回写 `v2/97-effect-runtime-and-flow-execution.md` 与相关 design 文档。

- 扩展 effect-runtime-poc 运行时能力  
  - 先重读 `v2/97-effect-runtime-and-flow-execution.md` 与 `SCHEMA_EVOLUTION.md`，确认改动定位在运行时层；  
  - 在 `packages/effect-runtime-poc` 中以最小增量扩展 Env/Layer/Helper，并确保泛型顺序与 Env 逆变契约正确；  
  - 如涉及 Flow DSL 或 Env 契约变更，回写 `v2/02-intent-layers.md`、`v2/03-assets-and-schemas.md` 及相关 design 文档。

- 实现端到端 Intent→Flow→代码示例  
  - 参考 `v2/04-intent-to-code-example.md` 的链路，先在 docs/specs 中走完需求→Intent→Pattern/Plan/Flow 草稿；  
  - 再在 effect-poc 与 effect-runtime-poc 中落地运行时代码，保持与 Intent/Schema 一致；  
  - 最后把踩坑与实践经验沉淀回 v2 文档。

## DESIGN PRINCIPLES · 使用时牢记的共识

- Intent 只表达业务/交互/信息结构的 **What**，不写组件/API/文件级 **How**；  
- Flow/Effect 层负责“步骤链 + 服务调用 + 横切约束”，领域算法留在服务实现中；  
- `Effect.Effect<A, E, R>` 泛型顺序固定为 A/E/R，Env 视为逆变集合，通过 Tag 获取服务；  
- 所有“看起来合理但文档未记载”的决定，应优先在 docs/specs 里形成说明，再在 PoC/运行时中实施。

## RESOURCES · 进一步阅读

- `references/project-architecture.md`：在需要更细的“项目架构 & specs 导航”时加载，帮助快速定位应修改的文档与代码目录。  
- 其他可选资源：若后续为本仓增加通用脚本（如批量校验 Intent/Plan/Flow）或模板资产，可放入 `scripts/` / `assets/`，并在本节补充说明与使用方式。
