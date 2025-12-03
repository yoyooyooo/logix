---
name: project-guide
description: 当在 intent-flow 仓库内进行架构设计、v3 Intent/Runtime/平台规划演进、典型场景 PoC 或日常功能开发时，加载本 skill 以获得“docs/specs 为主事实源”的项目导航、目录索引与施工流程。
---

# intent-flow · project-guide

## PURPOSE · skill 目标

在处理 intent-flow 仓库相关任务时，使用本 skill 明确三件事：

- 明确当前决策属于哪一层：平台/意图模型 (v3)、Logix Runtime/Intent API、还是 PoC/运行时代码；
- 找到对应的 `docs/specs` 文档作为事实源，并基于文档中的契约与示例设计改动；
- 在 PoC/运行时代码中验证过的经验及时回写 `docs/specs`，保持文档为 SSoT，本 skill 只做摘要与导航。

> 任何涉及 Intent 模型、Flow/Intent API、Effect 运行时契约或平台交互的决策，一律以 `docs/specs/intent-driven-ai-coding/v3` 与 `docs/specs/runtime-logix` 下文档为准；若本 skill 与 docs/specs 不一致，应先修文档，再同步 skill。

## WHEN · 何时加载本 skill

- 在 intent-flow 仓库内接到“新增功能 / PoC / 重构 / 规范化”任务，需要先看清落点与事实源时；
- 需要对齐「意图驱动 + Effect 运行时 + 平台交互」整体蓝图，明确当前应遵循的 v3 规范时；
- 需要决定：某个需求/修改是先更新 v3 docs/specs、还是直接在 `effect-poc` / `effect-runtime-poc` 中迭代代码时；
- 在 CI/脚手架/工具链层面扩展本仓库时，需要确认“约束与契约”写在哪个文档或目录时。

## DOCS-FIRST · 文档作为主事实源

在任何实现行为之前，优先按以下顺序定位 v3 文档，并将 v1/v2 视为历史参考：

1. 读取 v3 总览与 SSOT（概念层）
   - `docs/specs/intent-driven-ai-coding/README.md`：版本索引与整体进展；
   - `v3/01-overview.md`：意图驱动开发平台总览，包含三位一体模型、全双工引擎与 SSOT 优先级定义；
   - `v3/99-glossary-and-ssot.md`：跨层概念总览与术语表（Conceptual SSOT），所有核心术语（UI/Logic/Domain、Pattern、IntentRule、L0–L3 等）以此为准；
   - `v3/00-platform-manifesto.md`：平台宣言与资产共建策略；
   - `v3/blueprint.md`：长期蓝图（自愈架构、全双工编排）。
2. 查 v3 Intent 模型与资产结构（模型层）
   - `v3/02-intent-layers.md`：UI/Logic/Domain 三维 Intent 模型定义；
   - `v3/03-assets-and-schemas.md`：资产结构（Pattern / IntentRule / Store / Logic 等）的定义与关系；
   - `v3/effect-poc` 下的注释（如 `effect-poc/README.md` 如存在），补充 PoC 范围与约束。
3. 查 Runtime / Intent API 规范（运行时层）
   - `docs/specs/runtime-logix/core/README.md`：Logix Runtime 总览；
   - `runtime-logix/core/02-module-and-logic-api.md`：Module / Logic / Live / ModuleImpl API 与契约；
   - `runtime-logix/core/03-logic-and-flow.md`：Logic / Flow / Bound API `$` 与 Fluent DSL 形态；
   - `runtime-logix/core/06-platform-integration.md`：IntentRule IR 与平台集成规范；
   - `docs/specs/intent-driven-ai-coding/v3/effect-poc/shared/logix-v3-core.ts`：以类型为准的最终 API 形状（Module / Store / Flow / Intent）。
4. 查平台交互与资产链路（产品/UX 层）
   - `v3/06-platform-ui-and-interactions.md`：Universe / Galaxy / Studio 等视图的交互原则；
   - `v3/platform/README.md`：平台 Intent & UX 规划，以及 L0–L3 资产链路（业务需求 → 需求意图 → 开发意图 → 实现出码）。
5. 查 v1/v2 历史资料（如有需要）
   - `v2/*`：六层 Intent 模型与 v2 阶段设计，仅作为历史背景与灵感来源；
   - 当 v3 未覆盖某个旧概念时，从 v2 中提炼，再以 v3 模型重写，并更新 v3 文档。

在 docs/specs 中确定意图与契约之后，再进入 PoC 或运行时子包的修改。

## REPO MAP · 文档与代码落点

处理具体任务时，以“docs/specs 决策 → PoC 演练 → runtime 实现”的顺序组织改动：

- `docs/specs/intent-driven-ai-coding/v3`
  - 作为 Intent 模型、资产结构、平台与 Runtime 契约的主事实源；
  - 新约束、新场景、新 Schema 变更一律先更新这里；
  - `v3/effect-poc` 作为 Intent/Flow/Effect 组合的轻量演练场，**不直接绑定具体运行时实现**。

- `docs/specs/runtime-logix`
  - 作为 Logix Engine（前端运行时）的 SSoT：
    - `core/*` 描述 Module/Logic/Flow/Intent API 与运行时契约；
    - `impl/*` 记录当前实现方案与技术取舍；
    - `test/*` 记录运行时层面的测试策略与覆盖要求。
  - 任何 runtime 能力（如 ModuleRuntime / ModuleImpl / useRemote / Link / watcher patterns）的行为变更，需同步更新这里。

- 运行时代码：
  - `packages/logix-core`
    - 当前主线运行时内核（ModuleRuntime / Bound API / Link / ModuleImpl / Logix.app 等）；
    - 行为应与 `docs/specs/runtime-logix` 中的契约保持一致；
    - 新增/调整运行时能力时，优先在这里实现并配套单测。
  - `packages/logix-react`
    - React 适配层：`RuntimeProvider` + `useModule` / `useSelector` / `useDispatch` / `useLocalModule` 等；
    - 用于把 Logix Engine 能力暴露给 React 应用，行为约束同样以 `runtime-logix` 文档为准。
  - `packages/effect-runtime-poc/`
    - 早期 Effect 运行时 PoC，更多作为实验场与历史参考；
    - 新的运行时约束建议优先落在 `logix-core` + `runtime-logix` 上，再视情况回收/迁移这里的经验。

## WORKFLOW · 典型任务用法

在使用本 skill 时，按任务类型选择对应流程：

### 场景一：新增 ToB 业务 Flow / Logix 场景 PoC

- 在 v3 规格中对齐意图与落点  
  - 读取 `v3/01-overview.md`、`v3/02-intent-layers.md` 和 `v3/03-assets-and-schemas.md`，明确场景涉及的 UI/Logic/Domain 维度与资产类型；  
  - 如涉及 Runtime 行为，补读 `runtime-logix/core/02-store.md` 与 `03-logic-and-flow.md`。
- 在 specs 中记录意图与契约  
  - 在 v3 文档中补充/更新相关 Intent 描述与 Data/State/Interaction 契约（必要时在 `v3/platform/README.md` 增加 Use Case Blueprint 草稿）；  
  - 确认是否需要新增/修改 Pattern 或 IntentRule 类型。
- 在 effect-poc 中演练  
  - 在 `v3/effect-poc/scenarios` 下新增场景文件，使用 `Intent.andUpdate*` / `Intent.Coordinate` / Pattern 组合表达联动；  
  - 根据需要扩展 `shared/logix-v3-core.ts` 类型草案。
- 回写经验  
  - 将验证过的 Flow/Env/Layer/IntentRule 写法回写 `runtime-logix/core/*` 与 v3 文档（特别是 `03-logic-and-flow.md` 与 `06-platform-integration.md`）。

### 场景二：扩展 Logix Runtime 能力（@logix/core + @logix/react）

- 对齐 Runtime 责任与契约  
  - 重读 `runtime-logix/core/02-module-and-logic-api.md`、`03-logic-and-flow.md` 与 `05-runtime-implementation.md`；  
  - 如涉及 IntentRule 或平台集成，补读 `runtime-logix/core/06-platform-integration.md`。
- 在运行时子包扩展能力  
  - 优先在 `packages/logix-core` 中以最小增量扩展 Env/Layer/Helper/API，并确保：
    - `Effect.Effect<A, E, R>` 泛型顺序与 Env 逆变契约正确；
    - Module / ModuleRuntime / BoundApi / ModuleImpl / Logix.app 契约与 runtime-logix 文档一致；
  - 对应的 React 能力在 `packages/logix-react` 中补上适配（如 RuntimeProvider 新能力、hooks 扩展）。
- 回写规格  
  - 如涉及 API 形态或运行时语义变更，先更新 `docs/specs/runtime-logix/core/*` 与 `impl/*`，再在 `logix-core` / `logix-react` 中落实；
  - 对应的使用教程/示例，再同步到 `apps/docs/content/docs`。

### 场景三：实现端到端 “需求 → IntentRule → 代码” 示例

- 在 v3 文档中走完整链路  
  - 参考 `v3/04-intent-to-code-example.md` 与 `v3/platform/README.md`，从业务需求出发梳理 Level 0–2（业务需求 → 需求意图 → 开发意图）；  
  - 为用例定义 Use Case Blueprint 与一组 IntentRule 草稿。
- 在 PoC 与运行时中落地  
  - 在 effect-poc 中用 Intent API/Pattern 落地规则，并在 effect-runtime-poc 中实现必要的运行时扩展；  
  - 确保代码与 IntentRule/Schema 保持一致。
- 回写经验  
  - 把踩坑与反例沉淀回 `v3/04-intent-to-code-example.md` 与 runtime-logix 文档，作为后续 AI/人类复用的样板。

## DESIGN PRINCIPLES · 使用时牢记的共识

- Intent 只表达业务/交互/信息结构的 **What**，不写组件/API/文件级 **How**；
- Flow/Effect 层负责“步骤链 + 服务调用 + 横切约束”，领域算法留在服务实现中；
- `Effect.Effect<A, E, R>` 泛型顺序固定为 A/E/R，Env 视为逆变集合，通过 Tag 获取服务；
- Module / Logic / Live / ModuleImpl / BoundApi `$` 的最终形状以 `docs/specs/runtime-logix/core` + `v3/effect-poc/shared/logix-v3-core.ts` 为准；
- 所有“看起来合理但文档未记载”的决定，应优先在 docs/specs 里形成说明，再在 PoC/运行时中实施。

## RESOURCES · 进一步阅读

- `references/project-architecture.md`：在需要更细的“项目架构 & specs 导航”时加载，帮助快速定位应修改的文档与代码目录。
- 其他可选资源：若后续为本仓增加通用脚本（如批量校验 Intent/Plan/Flow）或模板资产，可放入 `scripts/` / `assets/`，并在本节补充说明与使用方式。

## 优化本 skill 注意事项

必须使用 skill-creator skill 来优化
