---
title: 10 · 平台形态与交互草图（精简版）
status: draft
version: 2025-12-12
value: vision
priority: next
related:
  - ./00-overview.md
  - ./03-spec-studio-l0.md
  - ./05-intent-pipeline.md
  - ./06-dev-server-and-digital-twin.md
  - ./07-intent-compiler-and-json-definition.md
  - ./08-alignment-lab-and-sandbox.md
  - ./09-user-value-routes.md
  - ../sandbox-runtime/20-dependency-and-mock-strategy.md
---

# 平台形态与交互草图（围绕 Spec Studio 的精简路径）

> 说明：本文件收敛了一条以 **Spec Studio / Live Spec 路线** 为主干的“平台形态”叙事，只保留当前 sdd-platform 主线所需的最小形状。  
> 早期的全量发散稿已移至 `99-platform-shapes-and-interactions.backlog.md`，后续新的想法建议优先追加到 Backlog，再视情况前移到本文件。

## 0. 视角与角色

先固定几个典型使用者角色，下面所有形态都默认从他们的体验出发：

- PM / 业务负责人：关心“表达需求、看到可运行结果”。  
- 架构师 / Tech Lead：关心“系统拓扑、依赖关系、重构风险”。  
- 业务开发者：关心“高质量代码、少踩坑、清楚上下游”。  
- QA / 测试工程师：关心“用例管理、回归、定位问题根因”。  
- 解决方案工程师 / 实施顾问：关心“快速搭方案、少写代码、多复用”。  
- AI Agent（平台内置）：配合上述角色完成结构化转换与操作。

下文按“从 Spec Studio 出发的一条纵向体验”来展开，只保留与这条主干紧密相关的形态；其他形态（Universe/Galaxy、多项目控制台等）保留在 99 Backlog 中。

---

## 1. Spec Studio：Live Spec 入口

### 1.1 文档 + 意图块（Live Spec）

**What**：左侧是富文本 + Intent Widgets（Entity/Logic/Scenario 块），右侧是结构化预览与 AI Side Panel。  
**Who**：PM / 架构师。  

**Flow 草图**：

- 左侧：  
  - 普通 Markdown 段落，用来写背景、目标、约束；  
  - 嵌入式 Widget：Story / Scenario / Entity / Screen / Risk / No-Go 等；  
  - Slash 命令插入结构化块（“/Story”、“/Scenario”）。  
- 右侧：  
  - Feature/Scenario 列表视图（按优先级、进度、Owner 展示）；  
  - 自动推断出的实体/字段列表（Intent Pipeline 的 Stage 0&1 结果）；  
  - 每个结构化块旁边有 AI 解释：为什么这样解析、还有哪些 Corner Cases。  

**Backing Contracts**：

- `FeatureSpec` / `ScenarioSpec` / `SpecStep`（`05-intent-pipeline.md`）；  
- UI/Logic/Module Intent 基本 Schema（v3 intent-layers / assets）；  
- Spec Agent 协议：输入自然语言段落，输出结构化补丁（新增 Story、Scenario、Entity 等）。

---

## 2. 从 Live Spec 到 Blueprint / 出码 / Alignment：一条最小链路

围绕 Spec Studio，当前 sdd-platform 主线只保留以下几个“必需的下一站”，其他形态（Universe/Galaxy、多项目控制台等）暂留在 99 Backlog：

1. **Spec Studio → Intent Pipeline / Blueprint**（`05-intent-pipeline.md`）：  
   - 将 FeatureSpec/ScenarioSpec 中的 Entity/Logic/Scenario Block 映射为 Domain/Module/Logic Intent；  
   - 产出 FeatureBlueprint（Screen/Module/Service 粗粒度骨架）。  
2. **Blueprint → Module 图纸 / Traits**（`01-module-traits-integration.md` + `04-module-traits-sdd-roadmap.md`）：  
   - 为 Blueprint 中的 Module 补全 state/actions/traits 骨架；  
   - Traits 提供字段能力图，为后续数据治理和 Alignment 提供锚点。  
3. **Blueprint/Module → Code & Dev Server**（`06-dev-server-and-digital-twin.md`）：  
   - 通过 Dev Server 将 Module/Traits/IntentRule 出码为 TS/Effect 骨架；  
   - 支持“差分出码”（只生成缺的部分）与从代码反向更新 IR。  
4. **Code → Sandbox/Alignment Lab**（`08-alignment-lab-and-sandbox.md`）：  
   - 以 Scenario Block 为入口运行场景，收集 EffectOp + StateSnapshot + UI_INTENT；  
   - 生成 AlignmentReport，并回写到 Spec/Scenario Block 上（红绿灯/诊断文本）。

这一条链路对齐 `09-user-value-routes.md` 中的“从需求到跑得起来的页面”和“从失败用例到自愈代码”两条路线，是目前优先收敛的产品/技术脊柱。

---

## 3. JSON Definition / Intent Compiler UI（仅保留与主线直接相关部分）

### 6.1 Definition-First Studio：面向解决方案工程师的主界面

**What**：更多操作 JSON Definition / Visual Logic，而不是直接改 TS 代码。  

**Flow 草图**：

- 左侧：模块/页面列表；  
- 中间：Definition 编辑区（表单 + Graph 组合）：  
  - 配置 state 字段、Trait、Query、Pattern、路由结构；  
  - 逻辑流程用 Node-Edge 图表示（Visual Logic Protocol）。  
- 右侧：编译状态与代码预览：  
  - 显示本 Definition 对应的 TS/Effect 代码摘要；  
  - 编译错误/类型错误在这里集中呈现。  

**Backing Contracts**：

- JSON Definition Schema（`07-intent-compiler-and-json-definition.md`）；  
- Intent Compiler 协议（Definition → TS + Runtime meta）；  
- Dev Server 承载编译与类型检查。

### 6.2 逐层“解封印”：No Code → Low Code → Pro Code

**What**：在同一界面里支持三层使用模式。  

- No Code：  
  - 仅通过模板/组件库 + 配置完成交付；  
  - Intent Compiler 使用标准模板生成代码，用户不接触 TS。  
- Low Code：  
  - 在 Definition 的逻辑节点上配置“AI Slot”（提示词 + 少量脚本片段）；  
  - 编译时由 LLM 生成对应代码段。  
- Pro Code：  
  - 某些节点切换为 “External Handler”，链接到仓库中的手写函数；  
  - Studio 仍然显示为一个节点，只是提示“由 Pro Code 提供实现”。

**Backing Contracts**：

- Definition 中对节点 `type` 的约定（template / ai.generate / external.handler 等）；  
- SDD 生命周期中 IMPLEMENT 阶段的多种实现路径。

---

## 7. 其他可能形态（散点）

以下是一些尚未归入主干的散点形态，可作为后续专题草稿的种子：

- **Spec 时间轴**：展示某个 Feature 在时间维度上的演化（Spec/Blueprint/Code/Runtime 的版本），支持在任意时刻回放当时的 Alignment 状态。  
- **Pattern Marketplace**：把经验证的 Blueprint/Module/Traits 组合抽象成 Pattern，对业务团队开放复用；平台负责校验 Pattern 与项目当前架构/约束是否兼容。  
- **AI 导游模式**：新成员或外部审计访问 Universe 视图时，AI 带着“讲解系统架构”，逐步高亮模块与关键路径。  
- **多项目控制台**：在云端部署形态下，统一查看多个项目/仓库的 SDD 健康度（Spec 覆盖率、Scenario 通过率、Alignment Score 等）。

---

## 8. CLI + 远程平台：双端协作形态

> 目标：让“平台管 SDD 产物与协作，CLI 管本地代码与执行”成为一等架构，而不是事后外挂。

### 8.1 职责分工：Platform = Source of Specs, CLI = Source of Code

**What**：平台与本地 CLI 明确分工，各自持有不同类型的“真理来源”。  

- 平台负责：  
  - SDD 产物：FeatureSpec / ScenarioSpec / Blueprint / JSON Definition / Pattern / AlignmentReport 等；  
  - 协作与权限：多用户编辑、Review/Sign-off、Audit Trail；  
  - Agent Orchestration：调用 Spec/Architect/Task/Coder Agents 执行管线。  
- CLI/Dev Server 负责：  
  - 本地文件系统：TS/TSX 源码、配置、测试；  
  - 本地 Tooling：Typecheck/Lint/Test/Build 等命令执行；  
  - 语言服务：AST/IR/Graph 构建，提供给平台或本地编辑器。

**Flow 草图**：

- 首次接入：  
  - 开发者在项目根运行 `intent-cli init`：  
    - 注册 projectId，与远程平台建立绑定；  
    - 生成本地配置（包含平台 URL、Auth、项目根路径等）。  
  - 平台侧创建 Project 实体，保存 SDD 资产。  
- 日常工作：  
  - 平台通过 HTTP/WebSocket 下发 “计划好的变更”（例如 Blueprint 更新、IntentRule 编辑）给 CLI；  
  - CLI 将其翻译为本地 AST Patch 或新文件写入，并执行相关检查；  
  - CLI 将解析结果（IntentRule/Traits/Graph/Runtime meta）回传平台，用于 Universe/Galaxy/Alignment。

**Backing Contracts**：

- Project/Workspace 元模型（统一标识同一个代码仓库）；  
- Platform ↔ CLI 协议：  
  - Command：平台对 CLI 下发的指令（apply_patch、run_tests、refresh_graph 等）；  
  - Event：CLI 对平台上报的结果（graph_updated、tests_passed、patch_failed 等）。

### 8.2 在线/离线模式切换

**What**：支持开发者在完全离线或弱网环境下工作，平台在恢复连接后自动与本地状态对账。  

**Flow 草图**：

- 离线模式：  
  - CLI 仍可解析代码生成本地 Graph/IntentRule/Traits；  
  - 提供本地版 Universe/Galaxy/Alignment View（简化版 UI 或 CLI 输出）；  
  - 所有对 Spec/Blueprint 的变更以 “Local Draft Changes” 形式缓存在本地（小型事件日志）。  
- 重新上线：  
  - CLI 检测到平台可用，发起 Sync：  
    - 将本地 Draft Changes 与平台 Spec/Blueprint Diff 对比；  
    - 提供冲突解决界面（或自动开一个 Merge 请求，需人工 Review）。  

**Backing Contracts**：

- Draft/ChangeLog 模型（本地 SDD 产物修改记录）；  
- Sync 协议：如何将本地变更映射为平台 Spec/Blueprint/JSONDefinition 的 patch。

### 8.3 “平台出主意，CLI 执行”的协作流

**What**：把 Agent/平台当“策划者”，本地 CLI 当“执行者”，中间用结构化任务连接。  

**Flow 草图**：

- 平台侧：  
  - Architect/Task Agent 在浏览 Spec/Blueprint/Universe 时，生成一组 Task（例如“为 Order 模块补充 discount 逻辑”、“把 cityList 从 local 改为 source Trait”）；  
  - Task 被挂到平台的 Task Board，关联到具体项目与分支。  
- 本地侧：  
  - 开发者在 CLI 中运行 `intent-cli tasks pull`：  
    - 拉取自己负责的任务列表，附带上下文（Spec/Scenario/Blueprint snippet）；  
  - 运行 `intent-cli tasks apply <task-id>`：  
    - CLI 调用本地 “Coder Agent + AST 工具” 在当前分支生成候选 patch；  
    - 显示 diff，允许开发者编辑/确认；  
    - 运行 typecheck/lint/test，结果反馈给平台。  

**Backing Contracts**：

- Task 模型：与 SDD `/tasks` 阶段对齐（包含上下文与验收条件）；  
- CLI Task 执行协议：  
  - 任务 → 本地 patch 的映射规则；  
  - 验收条件 → 要求 CLI 跑哪些命令、上传哪些结果。

### 8.4 远程运行 / 本地代理：Sandbox & Alignment 联动

**What**：允许平台在云端运行 Sandbox/Alignment Lab，也允许本地 CLI 代理执行、上传结果，兼容不同数据敏感度场景。  

**Flow 草图**：

- 云端模式：  
  - 平台接管 Sandbox 运行，使用远程 Runner 拉取代码快照（通过 Git 或 Artifact），在隔离环境中执行 Scenario；  
  - 生成 AlignmentReport，直接挂在平台 UI 上。  
- 本地代理模式：  
  - 组织不希望代码/数据离开内网时：  
    - 平台仅下发 Scenario/Spec/Blueprint 的 ID 和运行配置给 CLI；  
    - CLI 在本地执行 Sandbox Run，生成 RunResult + AlignmentReport；  
    - 只上传脱敏后的结构化指标（通过/失败、差异摘要、Graph 级 diff），不上传完整日志/数据。  

**Backing Contracts**：

- ScenarioRunConfig / RunResult / AlignmentReport Schema；  
- “云端 Runner” 与 “本地 Runner” 的统一接口（平台不关心具体运行位置，只关心结果形式）；  
- 数据脱敏/隐私策略：哪些字段/日志可以回传平台、哪些只能本地查看。

---

## 9. 统一平台、多视图：产品与开发的承载原则

> 目标：在不拆成“两套平台”的前提下，让产品和开发都能在同一平台内“只看到自己该看的东西”，但共享一套 Spec/Intent/Blueprint/Code/Runtime 资产。

### 9.1 一套工件，多种投影

**原则**：平台围绕“工件类型”组织模块，而不是围绕“角色”分裂成两套系统。

- 工件层次（单一事实源）：  
  - L0：FeatureSpec / ScenarioSpec / Story（需求层）；  
  - L1：Blueprint / Intent（屏幕–模块–服务与交互拓扑）；  
  - L2：Implementation Contract（Schema / Traits / IntentRule / JSON Definition）；  
  - L3：Code & Runtime（TS/Effect 源码、RunResult/Alignment）。  
- 视图层次（按角色变化）：  
  - Product View：对同一工件做抽象/自然语言投影，只暴露与需求表达相关的部分；  
  - Dev View：展示技术细节（Schema/Traits/IntentRule/运行结果），并保持与 Product View 的锚点。

结果是：**数据只有一份，视图按角色切换**，避免“产品需求系统”和“开发配置系统”各自漂移。

### 9.2 Feature 页：产品主场 + 开发侧边栏

- 产品模式（默认）：  
  - 中心是一份 FeatureSpec/ScenarioSpec 文档 + Scenario 列表；  
  - 每条 Scenario 旁只显示“是否已规划/是否有 Demo/是否通过验收”，不出现 Module/Traits/IntentRule 等技术词汇。  
- 开发模式（在同一页面开启）：  
  - 右侧出现 Tech Panel：  
    - Scenario ↔ Blueprint/Modules/Traits/Tests 的映射表；  
    - 一键跳转到 IDE/仓库文件；  
    - 最近一次 Sandbox/Alignment Run 的结果。  

产品只用中间那份文档和简单状态灯；开发则把这同一份文档当作“从业务跳到代码的入口”。

### 9.3 Blueprint 视图：同一张图，不同粒度

- 产品看到：  
  - Screen/Route + Module/Service 的大块图形（类似信息架构图）；  
  - 能做的事情只有“勾选范围（本迭代做/不做）”、“标记关键路径”。  
- 开发/架构看到：  
  - 在同一图上叠加 Schema/Trait/IntentRule Overlay；  
  - 可以钻取到字段级数据流、TraitGraph、LogicGraph；  
  - 从任一节点跳转到 Module/traits/Logic 代码或测试。  

Blueprint 只有一份；产品把它当“功能地图”，开发把它当“架构与实现的索引”。

### 9.4 Spec Studio：同一文档，两种侧边栏

- 中心区域永远是一份 Spec 文档（Feature/Scenario/Step）。  
- 产品模式：右侧侧边栏是 AI 帮忙拆 Story/补 Scenario/标风险；  
- 开发模式：右侧侧边栏变成技术映射：  
  - “这段 Story 关联系统里的哪些模块/字段/测试”；  
  - “相关 Scenario 最近一次运行的状态”；  
  - “未覆盖的逻辑/测试空洞提示”。  

这样开发在看代码或 Traits 时，随时可以跳回 Spec 文档；产品则不会被迫操作任何技术控件。

### 9.5 导航与权限：按角色裁剪，而不是按模块复制

- 导航层：  
  - PM 登录：默认只露出 Spec Studio / Blueprint / Scenarios / Reports；  
  - Dev 登录：可以看到 Intent/Definition、DevTools、Sandbox/Alignment 等更多入口。  
- 权限层：  
  - Product View 对 Schema/Traits/IntentRule 只读，且用自然语言摘要；  
  - Dev View 可以编辑这些工件，并触发出码/运行/对齐；  
  - 所有改动都记录在同一条 SDD 链路上（Spec/Blueprint/Contract/Code 变化可追溯）。

### 9.6 决策标准

当我们设计新的平台能力或视图时，可以用这几条问题自检：

1. 这个能力创造/修改的是哪一类工件（Spec/Blueprint/Contract/Code/Runtime）？  
2. 对产品来说，是否可以只通过高层视图（文字/图形/状态灯）完成工作，而不需要理解任何技术字段？  
3. 对开发来说，是否可以在同一平台内，从业务视图一路 drill-down 到代码/运行时，再 drill-back 回 Spec？  
4. 是否避免为产品和开发各建一套平行的“需求/配置系统”，从而让 Intent/Spec 真正成为单一事实源？

---

## 10. 语义组件 & Semantic UI Mock & 接线协议

> 目标：在 AI 时代避免回到“拖 div + 选事件”的传统低代码，实现 **组件层完全语义化 + 与 Logix/Traits 的解耦接线**，同时让 Sandbox/Alignment 能在不依赖真实 UI 库的情况下验证行为。

### 10.1 语义组件模型：UiPort 作为“端口”而非 React 组件

**What**：平台视角中的组件不是 JSX，而是一组带语义的端口（UiPort）：

- 每个实例有：`id`（实例 id）、`type`（语义类型，如 `SearchTable`、`PrimaryButton`）、`slots`（子区域，如 `toolbar`/`footer`）；  
- `inputs` 部分描述它“从哪里读数据”：  
  - 静态 `props`：展示/配置属性（列名、标题、占位文案等）；  
  - 动态 `bindings`：将组件的某个 prop 绑定到 Module 的某个 state/view/trait（例如 `dataSource ← OrderModule.state.list`）；  
- `outputs` 部分描述它“向外发什么信号”：  
  - 例如 `onSubmit`、`onSearch`，每个信号都可以接到 `module.action` 或某条 IntentRule 上。

对应到实际实现：

- React/Vue 组件层只关心如何将 UiPort 映射为 `props + onXxx`，完全不感知 Logix/Effect；  
- Logix/Traits 层只看到“有 UI 在读/写某些状态/动作”，完全不知道具体 UI 库；  
- Intent/Definition 层只记录 “UiPort ↔ Module/Intent 的接线”。

### 10.2 接线协议：UiBinding & UiSignal

结合上面的抽象，可以约束一份平台级“接线协议”：

- `UiBinding`：描述“组件属性 ← 逻辑层”的关系：  
  - `targetProp`：例如 `dataSource`、`value`；  
  - `source`：`{ moduleId, kind: 'state' | 'view' | 'trait', path }`。  
- `UiSignal`：描述“组件事件 → 逻辑层”的关系：  
  - `name`：例如 `onClick`、`onSearch`；  
  - `wiring`：`{ moduleId, kind: 'action' | 'intent', name }`。

这套协议可以落在：

- v3 UI Intent / UIIntentNode 上（新增 `bindings`/`signals` 字段），或  
- 一份独立的 `UiBindingSpec`（Module 图纸或 Blueprint 的子资产）。

关键是：**平台只编辑这份接线，具体组件库可以换，逻辑层不会受影响。**

### 10.3 Semantic UI Mock：UI 层的 Executable Spec

`topics/sandbox-runtime/20-dependency-and-mock-strategy.md` 中已经定义了 Semantic UI Mock 的方向：

- 编译期将真实 UI 库（如 `antd`/`mui`）的 import 重写为 `semantic-ui-mock`；  
- Worker 里用 Headless Mock 组件替代真实 DOM 渲染：  
  - 仍然消费 UiPort 的 `inputs`（props + bindings），执行子树逻辑；  
  - 不画像素，而是发射 `UI_INTENT`：包含组件类型、交互位置（Button、Select）、关联的 storyId/stepId/props 等；  
- Host 负责用线框组件渲染这些 UI_INTENT，并把用户点击再通过协议回传给 Worker。

结合上面的接线协议，可以理解为：

- UiPort/UiBinding/UiSignal 决定“UI ↔ 逻辑”的接线；  
- Semantic UI Mock 决定“UI 在 Sandbox 里如何被执行与观测”，并把行为降维为 UI_INTENT 事件流；  
- Alignment Lab 把 UI_INTENT 与 ScenarioSpec/IntentRule 对齐，用于验证“需求级交互是否被正确实现”，而不是验证具体 UI 样式。

### 10.4 产品视角 vs 开发视角：同一棵语义组件树

在这一模型下，平台可以自然地为不同角色提供不同视图：

- 产品视角：  
  - 在 Blueprint/Spec Studio 里只看到语义组件树：  
    - “这里有个 SearchTable 显示订单列表，顶部有 FilterBar，右侧有 DetailPanel”；  
  - 绑定信息以自然语言呈现：  
    - “数据来自：订单列表模块”；“点击后：提交订单”。  
  - 不需要看到 `state.path` 或 Trait 名称，更不用配任何 Query/Env/Layer。  
- 开发视角：  
  - 同一棵树右侧多一个“接线面板”：  
    - 左列列出组件的 inputs/outputs；  
    - 右列列出当前 Feature 下可用的 state/view/trait/action/intent；  
    - 通过下拉/连线完成绑定，底层写入 UiBinding/UiSignal；  
  - 对老页面，Dev Server 可从 TSX 解析出初步 UiPort/UiBinding，开发在 UI 中编辑后反向 Patch 代码。

这样既满足了你“不想做传统拖 div 配事件”的诉求，又保留了对开发友好的“能精准接线、能反向解析老代码”的技术路径。

### 10.5 与 Sandbox/Alignment 的闭环

结合 Sandbox Runtime 的 Mock 策略，可以形成 UI 层的一条闭环链路：

- Spec/Blueprint/Definition 确定语义组件树与接线（UiPort/UiBinding/UiSignal）；  
- 在 Sandbox 中，Semantic UI Mock 将这些组件变成 UI_INTENT 流；  
- RunResult 中同时包含：EffectOp Timeline、StateSnapshot、UI_INTENT 流；  
- Alignment Lab 使用 ScenarioSpec 的 Step/Rule 对 UI_INTENT + StateSnapshot 做断言，生成 AlignmentReport；  
- Report 再驱动开发/AI 调整 Blueprint/接线/逻辑，实现 UI 层与 Intent 的自愈。

### 10.6 PM 视角的“翻译层”：把技术事件流变成可理解的隐喻

> `UI_INTENT` 事件流是给 Sandbox/Alignment/DevTools 看的“技术层”，**绝不能直接给 PM 看**。对 PM 来说，平台应该更像“能自动验收的墨刀/原型工具”，而不是事件监控台。

**设计原则**：PM 操作的是“页面/组件之间的因果关系”，平台在后台悄悄编译为 UiBinding/UiSignal/IntentRule/UI_INTENT。

- **交互隐喻：连线 = 逻辑**  
  - PM 在画布上只看到页面和组件：列表页、详情页、搜索按钮、API 方块；  
  - 从按钮拖一根线到“详情页”或“API 请求”节点，心智是“点这个就去那”；  
  - 平台在后台生成 `UiSignal` + IntentRule/dispatch 绑定，并在 Sandbox 中转成 `UI_INTENT`。  

- **属性隐喻：填空 = 绑定**  
  - PM 在属性面板只看到“数据内容”下拉框，选项是“用户列表/订单列表”等自然语言（来自 Domain/Module Intent 推断）；  
  - 选择完成后，平台生成 `UiBinding`，绑定到具体 state/trait 路径；  
  - 技术视图里可以看到精确路径，PM 永远只看到“内容来自某某列表”。  

- **行为隐喻：预制动作 = Flow 套餐**  
  - 对“提交表单并返回列表”这类逻辑，PM 在 UI 中只选择“点击后执行：提交表单”、“成功后：返回列表”；  
  - 平台用预设 Pattern 生成对应 IntentRule/Logic 代码，PM 不需要懂 Flow DSL。  

- **验证隐喻：红绿灯 = UI_INTENT 对齐结果**  
  - 在 Playground/Alignment Lab 里，PM 点击“运行演示”：  
    - 左侧是自己的 Scenario 文案；  
    - 运行完，每条 Step 旁出现 ✅/❌ 红绿灯，而不是 JSON；  
  - 底层是 Alignment Lab 用 UI_INTENT + StateSnapshot 匹配 Then 条件的结果。  

可以用一张“翻译表”来约束产品与实现之间的隐喻关系：

| Runtime / Dev 概念             | PM 界面隐喻                         |
| ------------------------------ | ----------------------------------- |
| UiPort (inputs/outputs/slots)  | 组件实例 + 可点击区域               |
| UiBinding                      | “数据内容”/“来自哪里”的属性选项    |
| UiSignal / dispatch            | 画布里的连线（跳转/执行某个动作）   |
| IntentRule / Flow              | 预制行为套餐（提交表单、刷新列表）  |
| UI_INTENT 事件流               | 演示回放 + Step 红绿灯验收          |
| Semantic UI Mock 线框渲染      | 可点击的高保真原型 / Demo 界面      |

后续在设计 UI 相关功能时，可以用这张表自检：  
凡是落在左列的概念，都应该在 PM 视图里有一个“自然语言/图形隐喻”的对映，而不是以技术名词出现。

后续若要正式规格化这一块，可以在：

- `docs/specs/intent-driven-ai-coding/v3` 中补充 UI Intent / UiPort / UI_INTENT 的 Schema；  
- `sandbox-runtime` 主题中将 Semantic UI Mock 从“依赖治理草案”提升为 UI 模型的一部分。 

---

> 说明：本文件刻意保持发散与冗余，不直接作为实现蓝图，而是为后续“收敛路线图”提供素材库。真要落地，应优先回看 `09-user-value-routes.md`，选择其中 1–2 条高价值路线，将对应的形态拆成 MVP → v1 → v2 的阶段性目标。 
> 早期完整发散版已移至 `99-platform-shapes-and-interactions.backlog.md`，本文件后续将尽量保持围绕 Spec Studio 主线的“瘦身”状态。
