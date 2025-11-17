---
title: 意图 / 模式工作台 · 平台设计
status: draft
version: v1
---

> 本文描述一个面向 toB 管理系统前端团队的「意图 / 模式工作台」应如何运作：有哪些工作区、每个角色在其中做什么、交付物如何定义与流转。

## 1. 平台一句话定位

> 这是一个专门承载「需求 → 意图 → 模式选择 → 出码计划」的工作台，  
> 不替代 IDE，也不直接面向终端用户，而是服务于前端团队的设计与出码前阶段。

其职责是：

- 接住需求文档和口头沟通；
- 引导团队用结构化方式整理意图；
- 基于模式库进行模式选择和配置；
- 计算并展示“出码计划”，最终驱动代码生成/更新。

补充说明：

- 平台默认对接的是 IMD 仓库 `/Users/yoyo/projj/git.imile.com/ux/imd` 与 best-practice 仓库 `/Users/yoyo/projj/git.imile.com/ux/best-practice` 提供的组件、规范与代码片段；
- 这些仓库提供的是当前阶段的最佳实践与实现素材，而不是高于 Intent / Pattern / Plan 的终极真理；
- 一条 Intent → Pattern → Template → Plan 流水线是否被长期采纳，取决于它在真实项目中的提效效果和稳定性反馈；
- 当发现某条规则、模板或片段在实践中“负收益”时，允许在平台内替换或降级它，而无需推翻上层 Intent/Pattern 资产。

## 2. 三个核心工作区

### 2.1 意图工作台（Intent Studio）

面向：业务前端 / AI。

职责：

- 以“场景”为单位创建和编辑意图资产；
- 支持自然语言 + 结构化表单组合的输入方式；
- 帮助用户从 L0/L1/L3 角度讲清楚这个场景。

关键能力：

- 意图草稿管理：
  - 创建 `feature-id.intent.yaml`；
  - 维护状态：`draft` / `ready-for-pattern` / `ready-for-plan` 等。
- 结构化引导：
  - 引导填写目标（goals）、场景（scene）、领域实体（domain）等；
  - 利用 schema 做基本校验。
- AI 辅助：
  - 提问和澄清不完整的描述；
  - 根据已有内容给出“类似场景”的参考；
  - 帮忙把散文式描述转成结构化字段。

### 2.2 模式库管理（Pattern Studio）

面向：平台 / 架构前端，业务前端/AI 阅读。

职责：

- 把团队认同的“通用编码套路”沉淀为模式文档；
- 提供模式的浏览、搜索、比对、适用性提示；
- 把“经验”从口头花絮变成可索引的知识资产。

关键能力：

- 模式列表与详情：
  - 展示每个模式的适用场景、组成部分、最佳实践与反模式；
  - 支持示意图和代码片段示例。
- 模式与意图的匹配：
  - 对当前意图评估模式适配度；
  - 提示“缺少哪些信息无法判断适配性”；
  - 支持开发者手工绑定/解绑模式。
- 模式版本管理：
  - 支持模式演进（增加约束、拆分模式等）；
  - 标记哪些旧意图仍引用旧版本模式，提示是否迁移。

### 2.3 生成控制台（Generation Console）

面向：业务前端 / 平台 / AI。

职责：

- 把意图 + 模式组合转换为一份具体的“出码计划”；
- 可视化地展示计划对代码库的影响；
- 触发并监控生成/更新过程。

关键能力：

- 计划生成：
  - 根据意图和已绑定模式，选择合适模板；
  - 生成 `feature-id.plan.json`；
  - 标注每一步需要的参数和目前的填充状态。
- 计划可视化：
  - 列出将创建/更新/删除的文件及路径；
  - 展示模板来源、模式来源；
  - 对 AI 生成的参数/slot 提供“编辑和修正”界面。
- 执行与回滚：
  - 执行计划，将更改应用到代码仓库；
  - 记录执行日志和“意图/模式/模板 ↔ 代码”的映射；
  - 提供回滚或重放某个计划的能力（至少记录差异）。

## 3. 中间交付物及生命周期

### 3.1 Intent Spec（意图说明）

- 产生：在意图工作台中，由业务前端（兼任产品角色）+AI 基于外部需求输入协作创建；
- 内容：goals, scene, patterns, domain, openQuestions, autoFill 等；
- 生命周期：
  - 初稿 → 模式匹配 → 生成计划 → 标记“已落地某版本”；
  - 后续变更时优先修改 Intent，再重新生成或迁移。

### 3.2 Pattern Spec（模式定义）

- 产生：在模式库管理中，由前端架构师 / 平台前端撰写；
- 内容：problem、applicability、composition、dataContract、bestPractices、antiPatterns 等；
- 生命周期：
  - 被多个 Intent 引用；
  - 演进时需评估对已有 Intent 的影响，必要时提供迁移指南。

### 3.3 Template Meta（模板元数据）

- 产生：由前端架构师 / 平台前端在平台中维护；
- 内容：
  - patternId、variant、参数列表、slot 定义、依赖约束；
  - 对应模式角色的文件路径模式（`implements.roles`）；
  - 针对模式声明的 `uiCapabilities`，在当前项目中绑定到具体组件的 `runtimeBindings`
    （例如 table 能力绑定到某个 ProTable 组件，filterControls 能力绑定到一组表单控件）。
- 生命周期：
  - 被生成控制台用来从模式映射到具体模板；
  - 模板演进时更新元数据，以便工具捕获不兼容变更。

### 3.4 Generation Plan（出码计划）

- 产生：生成控制台根据 Intent + Pattern + Template 推导；
- 内容：
  - 目标文件及改动类型；
  - 来源模式/模板；
  - 参数/slot 的具体值；
  - 执行顺序和依赖关系；
- 生命周期：
  - 由平台生成器根据 Intent/Pattern/Template Meta 自动生成；
  - 由业务前端审阅和调整（选择执行/跳过部分 action）；
  - 执行后连同日志一起归档，可用来对比不同 Intent 版本之间的差异。

### 3.5 Execution Log & Mapping（执行日志与映射）

- 产生：执行计划时自动记录；
- 内容：
  - 每一步操作的结果（成功/失败/跳过）；
  - 对代码文件的具体 diff；
  - 某段代码与 Intent/Pattern/Template 的对应关系；
- 生命周期：
  - 由平台在执行 Plan 时自动生成；
  - 被前端业务开发与前端架构师用于追溯、调试和重构；
  - 支持从代码导航回 Intent/Pattern，支持 AI 解释“这段代码为什么长这样”，并为后续自动迁移/重构提供依据。

## 4. 一次“新工作台”从无到有的示例流程

以 toB 场景中一个“运营工作台”为例：

1. **产品在意图工作台起草**
   - 新建 `ops-workbench` 意图；
   - 填写目标（提高效率、支持窄屏等）、角色（operator）、主要流程；
   - AI 提问澄清未说明的部分（例如是否需要批量操作）。
2. **业务前端补全意图与模式选择**
   - 补充 Task 实体、接口草案、状态机；
   - 在模式库中选择：
     - `workbench-layout`（左任务+右详情+指标）；
     - `table-with-server-filter`（列表部分）。
   - 配置模式参数（例如使用分页、启用批量完成）。
3. **生成控制台生成并展示 Plan**
   - 系统选出适配的模板（布局模板、表格模板等）；
   - 生成 Plan，列出将创建/更新的文件与参数；
   - AI 用 Task 字段自动生成列配置初稿，前端在 UI 中微调。
4. **执行 Plan，生成代码**
   - 一键执行，生成工作台页面骨架及相关组件；
   - 记录执行日志与 Intent/Pattern/Template ↔ 代码的映射。
5. **业务前端微调 & 回写意图**
   - 在生成的代码上添加业务特例逻辑；
   - 如有结构性变更（新增 tab、重构指标区），回到意图工作台更新 Intent；
   - 根据新 Intent 再次生成/迁移，避免长期偏离。

## 5. 平台设计的关键原则

- **意图优先**：没有清晰的 Intent，就不允许进入模式选择和生成环节。
- **模式显性化**：开发者明确知道自己选择了哪个模式，而不是“某个模板偷偷做了很多事”。
- **模板退居二线**：模板是实现模式的手段，而不是业务讨论的对象。
- **交付物可版本化**：Intent/Pattern/Template Meta/Plan/Log 都应可追踪、可 diff。
- **AI 辅助而非主导**：AI 负责补全、解释、提示；真正的决策记录在 Intent 与 Pattern 中。

## 6. 技术架构草案（POC 视角）

> 本节从“只给前端团队用”的前提出发，给出一个可以落地的最小可行技术架构，方便做 PoC。

### 6.1 边界与部署形态

最小版本可以是：

- 一个运行在本地仓库根目录的 **Node 服务 / CLI**：
  - 负责读写意图/模式/模板/计划文件；
  - 对外暴露一组 HTTP API 或直接提供 CLI 子命令。
- 一个前端单页应用（SPA）：
  - 运行在浏览器中，供前端开发者使用；
  - 通过 API 或本地桥接与 Node 服务通信。

简化边界：

- 平台只需要访问：
  - 代码仓库的文件系统；
  - （可选）本地 Git，用于查询 diff 和提交信息；
  - （可选）LLM 接口，用于 AI 辅助。
- 不直接依赖生产运行时环境（后端服务、数据库等），避免耦合。

### 6.2 数据模型与存储约定

为方便落地，可约定以下最小目录结构（仅示例，具体路径可调整）：

- 意图资产：`intents/<feature-id>.intent.yaml`
- 模式定义：`patterns/<pattern-id>.pattern.yaml`
- 模板元数据：`templates/<template-id>.template.yaml`
- 出码计划：`.plans/<feature-id>.plan.json`
- 执行日志与映射：`.plans/logs/<feature-id>/<timestamp>.log.json`

其中：

- 文件格式统一使用 YAML/JSON + 明确的 Schema，方便校验和 AI 消化；
- 所有文件纳入 Git 管理，作为长期资产；
- 生成器执行时：
  - 从 `intents/` 读取 Intent；
  - 从 `patterns/` 读取 Pattern；
  - 从 `templates/` 读取 Template Meta；
  - 生成 `.plans/` 下的 Plan，再按 Plan 对业务代码目录进行变更。

### 6.3 典型请求链路（从“编辑 Intent”到“执行 Plan”）

以“新建工作台场景”为例，链路可以细化为：

1. **编辑 Intent**
   - 前端在 SPA 中打开 `ops-workbench` 场景：
     - 若文件不存在，平台调用 Node 服务创建空的 `intents/ops-workbench.intent.yaml`。
     - UI 提供表单（目标、场景结构、实体与接口等），可在右侧展示原始 YAML 视图。
   - 前端修改字段 → 前端通过 API 把完整 Intent 对象 POST 回 Node 服务 → 服务校验 Schema 后写盘。

2. **模式匹配与绑定**
   - 前端点击“推荐模式”按钮：
     - SPA 调用 API：`POST /patterns/match`，传入当前 Intent 摘要；
     - Node 服务调用模式匹配逻辑（可引入 AI）返回候选模式列表及匹配度；
     - 前端展示候选模式列表，允许勾选并配置模式参数；
     - 选择结果写回 Intent 的 `patterns` 字段。

3. **生成 Plan**
   - 前端点击“生成计划”：
     - 调用 API：`POST /plans/generate?intentId=ops-workbench`；
     - Node 服务读取 Intent + Patterns + Template Meta，构建 Plan：
       - 选择模板；
       - 计算将生成/更新的文件列表；
       - 识别所需参数/slot 并尝试自动填充。
     - Plan 持久化到 `.plans/ops-workbench.plan.json`，并返回给前端。
   - 前端用“变更预览”组件展示 Plan：
     - 比如文件树 + 操作类型（新增/修改）；
     - 单个文件的预览 diff（可选，基于 dry-run 生成）。

4. **审阅与执行**
   - 前端在 UI 中：
     - 可禁用某些计划项（只生成骨架，不生成测试/文档等）；
     - 手动调整 AI 生成的参数/slot 内容。
   - 点击“执行计划”：
     - 调用 API：`POST /plans/execute?intentId=ops-workbench`；
     - Node 服务按 Plan 对仓库文件进行修改：
       - 写文件、应用模板、做文本 patch；
       - 记录每步操作结果和 diff。
     - 写入执行日志与映射文件。

5. **后续导航与回滚**
   - SPA 可以：
     - 在查看代码文件时，通过映射信息跳回对应 Intent/Pattern/Template；
     - 在 Plan 历史中对比不同版本的 Plan 和执行日志；
     - 提供“重放某个 Plan”或“撤销本次 Plan 所有变更”的操作（结合 Git）。

### 6.4 有效性保障：为什么不是“又一个看起来很美的工具”？

要让这套平台“真的有效”，关键是让**每一步交互都减少实际工作量**：

- 编辑 Intent：比直接写文档更结构化，可被后续工具/AI 利用；
- 选择模式：比每次从零设计页面架构省脑子，减少踩坑；
- 生成 Plan：提前看到改动范围，减少“生成完才知道改多大”；
- 执行 Plan：把重复性的目录/文件/骨架操作交给工具做，前端专注于业务代码；
- 映射与日志：解决“代码为什么是这样”的追溯问题，让后续人/AI 都有依据。

如果某一步“只增加负担，不减轻负担”，那它的交互和实现就需要被删减或重做，而不是继续往上叠抽象。

## 7. 模式沉淀期与模板阶段的关系（补充）

在平台落地时应刻意区分两个阶段：

1. **模式沉淀阶段**
   - 目标：把“套路”沉淀出来，而不是立刻绑死具体模板或技术栈。
   - 输出：
     - Pattern 文档：问题场景、适用性、组成部分、数据约定、最佳实践/反模式。
     - Implementation Profile：在 `composition.roles` 中声明该模式所需“代码角色”（组件/Store/Hook 等）的职责边界。
     - `paramsSchema` + `uiSchema`：该模式在具体场景下需要向前端“询问”的参数集合，以及这些参数在平台 UI 中应如何呈现。
   - 不做：
     - 不在模式里写死文件路径或状态管理库；
     - 不要求模式定义阶段就已经有完整模板实现。

2. **模板与出码阶段**
  - 目标：在具体技术栈下，为模式的各个“角色”提供模板实现，并生成出码计划。
  - 输出：
    - Template Meta：声明 `patternId`，并通过 `implements.roles` 将抽象角色映射到具体文件路径模式；
    - Generation Plan：基于 Intent + Pattern + Template Meta 推导出的具体文件操作列表。

这样，平台可以先在“模式沉淀期”就支撑意图编辑与模式配置（哪怕暂时没有模板），  
再在“模板阶段”逐步补齐不同技术栈下的模板实现，避免“一开始就卡在所有模板没写完”的状态。

## 8. Plan 执行链路与 LLM 介入点（概览）

以单个 `create-file` 类型的 action 为例（例如生成 `use-orders-list.hook.ts`），整个链路可以拆分为两个阶段：

### 8.1 规划阶段：从 Intent / Pattern / Template Meta 到 Plan

1. 读取 Intent：
   - 从 `intents/<id>.intent.yaml` 解析出场景、模式绑定、领域实体与接口。
2. 匹配模式与角色：
   - 根据 Intent 中绑定的模式 ID（如 `table-with-server-filter`），在模式定义中找到对应角色（如 `ListQueryHook`）。
3. 解析模板 Meta：
   - 在 Template Meta 中查找声明实现了该模式角色的模板（例如 `list-query-hook` 对应某个文件路径模式）。
4. 推导路径与参数：
   - 根据模板路径模式 + Intent（featureId/entity）计算出目标文件路径；
   - 根据模式的 `paramsSchema` + Intent（domain.entities/apis、patterns.config）推导出 `params`（例如 `entity=Order`、`apiName=listOrders`）。
5. 写入 Plan：
   - 将上述信息固化为一条 action：
     - `type` / `path` / `template` / `patternId` / `params`。

LLM 在此阶段可以参与：

- 帮助从 Intent 的自然语言描述中推导/补全结构化字段（例如猜测哪个 API 是列表接口）；
- 在参数不完全时提出建议（例如推荐默认列集合、筛选字段集合）；
- 用自然语言解释“为什么推荐这个模式/模板组合”，辅助前端做决策。

### 8.2 执行阶段：从 Plan 到实际代码与映射

执行 `executePlan(plan)` 时，对于每个 `create-file` action：

1. 参数校验：
   - 根据 `patternId` 读取模式定义，使用 `paramsSchema` 校验 `params` 是否符合约束；
   - 可选：检查 `params` 中引用的实体/接口在 Intent 中确实存在。
2. 查找模板实现：
   - 通过 `template` 字段在模板仓库中找到对应的模板实现（例如某个 `render(intent, params)` 函数）。
3. 渲染代码骨架：
   - 调用模板的 `render`，传入 Intent 与 `params`，生成目标文件的源码字符串；
   - 模板内部会使用 Intent 的领域信息（实体字段、接口参数）以及模式参数（列/筛选字段等）拼装出骨架代码。
4. 写入文件与记录溯源：
   - 将生成的源码写入 `path`；
   - 在映射表中记录该文件由哪个 Intent / Pattern / Template / params 生成，便于后续追溯。

LLM 在执行阶段一般不直接操作文件系统，而是可以通过受控能力参与：

- 在模板渲染内部，为复杂片段提供初稿（例如根据字段生成更复杂的过滤条件映射函数），由模板以插槽形式注入；
- 在 Plan 执行前后，用自然语言解释 action 的作用和潜在影响，帮助前端审阅变更；
- 在执行失败时，对结构化错误（参数缺失、约束不满足）进行可读性高的错误说明与修复建议。

整条链路中，LLM 被限制在“生成和解释结构化/代码片段”的角色，  
真正的决策（Plan 内容）与副作用执行（写文件）始终由平台管线与模板代码负责。

## 9. 内核视图（架构师视角）

从平台内核的角度，可以把核心概念抽象成三块并通过 Service 连接起来：

```text
          +------------------+
          |   Intent (YAML)  |
          |  - scene         |
          |  - domain        |
          |  - patterns      |
          |  - runtimeFlows  |
          +---------+--------+
                    |
                    | 绑定模式 ID / Flow DSL
                    v
          +---------+--------+
          |   Pattern (YAML) |
          |  - roles         |
          |  - provides      |
          |  - requires      |
          |  - uiCapabilities|
          +---------+--------+
                    |
                    | Service ID（见 services.md）
                    v
          +---------+--------+
          | Template Meta    |
          |  - implements    |
          |  - impl          |
          |  - runtimeBind   |
          +---------+--------+
                    |
                    | 规划阶段：buildPlan
                    v
          +---------+--------+
          |   Plan (JSON)    |
          |  - actions[]     |
          +---------+--------+
                    |
                    | 执行阶段：executePlan
                    v
          +---------+--------+
          |  代码骨架 / Diff |
          +------------------+
```

对应关系简要说明：

- **Intent**
  - 描述场景结构（scene）、实体与接口（domain）、使用哪些模式（patterns），以及通过 `runtimeFlows` 声明行为流水线；
  - Flow DSL 中的 `call: Service.method` 使用的是在 Pattern 中 `provides`、`services.md` 中列出的 Service ID。
- **Pattern**
  - 通过 `roles`/`provides`/`requires` 声明模式内部的服务角色图；
  - 通过 `uiCapabilities` 描述对底层组件库的能力需求；
  - 为 Intent 的结构提供“套路”和 Service 语义基础。
- **Template Meta**
  - 通过 `implements.roles` 将抽象角色映射到具体文件路径模式；
  - 通过 `impl` 与未来的 Layer/实现风格标签对齐；
  - 通过 `runtimeBindings` 将 uiCapabilities 绑定到具体组件库。
- **Plan**
  - 是 Intent + Pattern + Template Meta 的具体展开结果：  
    每个 action 都携带 `patternId` / `template` / `params`，以及隐含的 Service 背景；
  - 平台可以基于 Plan 做可视化、审阅、执行与追溯。

对架构师而言，上图可以作为“平台内核脑内模型”：  
上游只有 Intent/Pattern/Template 三类声明式配置，下游只有 Plan 和代码/ Diff，中间的 Service 与 Flow 由平台内核（可选用 Effect/DI 实现）负责解释和执行。
