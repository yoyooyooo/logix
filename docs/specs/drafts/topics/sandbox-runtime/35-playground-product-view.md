---
title: Playground / Alignment Lab · 产品视角与页面功能
status: draft
version: 2025-12-08
value: product
priority: next
---

# Playground / Alignment Lab · 产品视角与页面功能

> 本文从「产品需求 / 页面功能」视角，拆解 Sandbox/Playground 这一条链路应该长成什么样的界面与交互。
> 技术架构与协议见同目录下的其他文档，本稿只回答：**在 Studio/DevTools 里，Playground 这页究竟要做什么？支持谁，用来干什么？**

关联文档：

- 概念与方法论：`docs/specs/intent-driven-ai-coding/99-glossary-and-ssot.md`、`docs/specs/intent-driven-ai-coding/concepts/00-sdd-mapping.md`  
- 架构与协议：`05-architecture-and-boundary.md`、`10-runtime-baseline.md`、`15-protocol-and-schema.md`、`20-dependency-and-mock-strategy.md`  
- 包与实现：`25-sandbox-package-api.md`、`mvp/README.md`、`65-playground-as-executable-spec.md`

---

## 1. 产品目标（站在 PM 视角看 Playground 想解决什么）

### 1.1 核心问题

在 Intent Flow 平台中，Playground/Alignment Lab 需要回答三类问题：

1. **需求意图是否被满足？**  
   - “省市区联动”这个需求，在当前实现下是否按 Spec 预期工作？  
   - 对不同输入（选择不同省/市），状态与 UI 是否达到预期结果？
2. **哪条规则在起作用？**  
   - 哪些 IntentRule / R-S-T 链路被触发了？  
   - 如果逻辑跑偏，是哪一步/哪条规则出了问题？
3. **代码行为是否可解释？**  
   - 有一段 Logix/Effect 代码，能否在一个受控环境中运行，并将行为解释给人/AI看？

> 因此：Playground 不是“在线跑 JS/TS 的小工具”，而是一个 **“按场景验证 Intent → Logix → Runtime 对齐情况”的页面**。

### 1.2 主要用户 & 场景

- **PM / 设计**：  
  - 希望用自然语言 Spec + 少量配置描述需求，通过 Playground 看到逻辑是否满足这些场景；  
  - 不关心细节代码，但关心规则和状态变化。
- **开发者 / 架构师**：  
  - 希望在单场景下调试 Logix/Effect，知道哪条规则没触发 / 状态哪里错了；  
  - 希望在不改真页面的前提下快速实验逻辑修改。
- **AI Agent / 工具链**：  
  - 希望有一个可调用的「执行 + 观测」入口，用 Spec / IntentRule 约束生成代码，并基于 RunResult 做迭代。

---

## 2. 页面结构草案（单场景 Playground）

以 RegionSelector MVP 为基线，可以先定义一个单场景 Playground 页面结构，后续再扩展多场景/多模块。

### 2.1 布局概览

建议三栏布局（可按宽度调整）：

1. **左侧：场景 & Spec 面板**  
   - 场景选择器（MVP 固定为 “省市区联动”）；  
   - 场景说明：  
     - 简短文案（需求意图）；  
     - 若存在：ScenarioSpec 中的 Given-When-Then 片段。  
   - 场景 Step 列表（ScenarioSpec 编辑视图，后续增强）：  
     - PM 可以在此定义/编辑 Step1/2/3 等步骤（例如「打开选择器」「选择省份：广东」）；  
     - 每个 Step 绑定一个 `scenarioId + stepId`，供 UI_INTENT / Trace 用于对齐。  
   - （后续）规则清单：  
     - 与该场景关联的 IntentRule / R-S-T 概览列表。

2. **中间：代码 & 配置面板**  
   - 只读或可编辑的 Logix/Effect 代码视图：  
     - 关联的 `RegionSelectorModule` / Logic / Runtime 入口；  
   - Mock / 环境配置摘要（MockManifest）：  
     - 本场景使用的 HTTP Mock / RegionApi Mock（例如省/市/区接口数据来源）；  
     - 场景级环境变量（国家/语言/渠道等）；  
     - 方便 PM/开发确认当前是“Mock 环境”，不会打到真实服务，并能直观看到“省市区数据来自哪里”。

3. **右侧：运行结果面板**  
   - 顶部：UI 预览（Semantic UI Mock 渲染出的线框 UI）  
     - 展示语义组件（Select/按钮等）；  
     - 支持用户在 Playground 中直接点选/操作。  
   - 底部 Tab：  
     - `State`：stateSnapshot 的 JSON 视图（简化、高亮关键字段）；  
     - `Logs`：结构化日志列表（Effect / console）；  
     - `Trace`：TraceSpan 列表，显示 run 成功/失败节点；  
     - （后续）`Intent`：UI_INTENT 与 IntentRule 触发记录。

页面顶部统一放置运行控制：

- Run / Stop / Reset 按钮；  
- 当前 runId / duration / 状态（idle / running / completed / error）指示。

---

## 3. 用户流程（典型交互路径）

### 3.1 PM / 设计视角：验证一个业务场景

1. 在左侧选择「省市区联动」场景，阅读其需求说明 & Given-When-Then；  
2. 在右侧 UI 预览中：  
   - 选择一个省份（例如“浙江”）；  
   - 观察城市下拉框是否刷新为预期列表。  
3. 切换到底部 `State` Tab：  
   - 确认 `province` / `cityOptions` 等字段是否与 Spec 中的期望一致；  
4. 如行为不符合预期：  
   - 记录具体输入/输出，交给开发或 AI 作为修复输入（未来可由 AlignmentReport 自动生成诊断）。

### 3.2 开发者视角：定位规则/逻辑问题

1. 选择同一场景，查看中间的 Logix 代码与 IntentRule 列表；  
2. 点击 Run，一次性执行既定输入（或通过 UI 手动操作）；  
3. 在 `Trace` Tab 中找到 run 对应的根 span，展开查看：  
   - 哪个步骤/Effect 抛错；  
   - 哪些规则（ruleId）被触发/未触发（后续可在 Trace/Log 中附带 ruleId）。  
4. 在 `Logs` Tab 中查看 Effect/console 输出，与代码逻辑对照，迭代修改 Logic；  
5. 反复 Run，直到在 Spec 场景下行为与预期一致。

### 3.3 AI Agent 视角：迭代 Intent → Code → Run 的闭环

1. 从 Spec/Scenario（或用户输入）生成或修改 Logix/Effect 代码；  
2. 请求 Playground 执行特定场景（通过 API 调用 @logix/sandbox / Playground 后端）；  
3. 解析 RunResult（stateSnapshot/logs/traces/UI_INTENT），与 Spec/IntentRule 对比：  
   - 若存在违背 Spec 的行为，生成诊断和下一轮代码 patch；  
4. 重复，直到 Alignment 满足平台的阈值。

> 本文档对 AI 的流程只做占位，具体 API 与交互留给后续 spec/impl 文档细化。

### 3.4 单场景 Step 覆盖视图（基于 UI_INTENT 的 RegionSelector Happy Path）

- 为了让 PM 在不看 JSON/Trace 的前提下判断“场景是否按 Spec 跑完”，Playground 可以在右侧提供一个极简的 Step 覆盖卡片：  
  - Step 列表来自 ScenarioSpec（或硬编码定义），例如 RegionSelector：  
    - Step 1：打开省市区选择器  
    - Step 2：选择省份：广东  
    - Step 3：选择城市：深圳  
  - 覆盖状态由 UI_INTENT 决定：当某条 UI_INTENT 满足 `meta.storyId === scenarioId && meta.stepId === stepId` 时，将对应 Step 标记为 `covered`，否则保持 `pending`。  
- 当前 mvp 中的 RegionSelector Demo 已经实现这一 happy path：  
  - 默认运行一次场景，即可在 UI_INTENT 面板上方看到三步 Step 及其 covered/pending 状态；  
  - 这相当于用 UI_INTENT 协议为 PM 提供了一条“Spec → 行为”的最小闭环视图，后续可以把 Step 列表从硬编码迁移到真正的 ScenarioSpec 编辑器。

### 3.5 场景搭建入口：意图脚本 + 语义 UI 组件（当前 MVP 形态）

- 当前 RegionSelector Playground 的左侧场景面板已经引入一个最小形态的「意图脚本 + 语义 UI 组件」入口，对应 `examples/logix-sandbox-mvp/src/App.tsx` 中的 `ScenarioBuilder`：  
  - PM 可以在「意图脚本」文本框中用行级命令编排场景步骤，例如：  
    - `/select province 选择省份 [{"code":"44","name":"广东"}]`  
    - `/select city 选择城市 []`  
    - `/button 提交`  
  - 点击「从脚本生成步骤与语义组件」后，Playground 会自动生成：  
    - `scenarioSteps`：Step1/2/… 列表（供 Step 覆盖视图使用）；  
    - `semanticWidgets`：一组语义化的 Select/Button 元数据（字段名、标签、stepId、optionsJson）。
- 右侧 UI_INTENT Tab 顶部的 `MockUiPreview` 使用这些 `semanticWidgets` 渲染线框 UI：  
  - 每个 Select/Button 的交互都会发出一条 `UiIntentPacket`（带上 `meta.storyId/stepId/label`），既驱动 Step 覆盖视图，也通过 `UI_CALLBACK` 命令回流到 Worker 端，产生对应的 Trace/log；  
  - Mock UI 不依赖真实业务页面，只要求语义组件 + Mock 配置即可重放关键交互。
- 这一套「意图脚本 → 语义组件 → Mock UI → UI_INTENT/TRACE」链路，是未来富文本 + 斜杠模板 + LLM 提炼 Spec 的原型：  
  - 目前用纯文本 + 简单 DSL 实现，从 0 到 1 让 PM 能在 Playground 内“编排出一个场景”；  
  - 后续可以在 Studio 中用富文本/文档编辑器承载同一份数据模型，由 AI 帮 PM 从自然语言 Spec 生成这些结构。

---

## 4. MVP 范围：单场景 Playground 需要做到什么

结合 `mvp/README.md`，Playground MVP 版页面功能收敛为：

1. 支持固定场景「省市区联动」：  
   - 左侧展示场景名称与简要说明（可以先用纯文案）；  
   - 不必一开始就引入完整 ScenarioSpec/IntentRule UI，但代码里可以先有对应的结构。
2. 运行控制：  
   - 提供 Run 按钮，调用 `@logix/sandbox` 的 `init/compile/run` 链路；  
   - Run 成功后在右侧展示 RunResult（State/Logs/Trace）；  
   - 出错时展示错误信息（ERROR 事件），保持页面可恢复。
3. UI 视图：  
   - MVP 阶段可以：  
     - 先用真实 RegionSelector 表单（使用 @logix/react），或者  
     - 直接用一组简单控件模拟（不必一开始接入 Semantic UI Mock）；  
   - 关键是：**用户可以通过 Playground 触发“选择省/市”等行为**，并立即在 State/Logs 中看到效果。
4. 观测面：  
   - `State` Tab：展示最终 stateSnapshot；  
   - `Logs` Tab：展示 Effect/console 日志；  
   - `Trace` Tab：展示至少一棵成功/失败的 run span。

> MVP 阶段 **不要求**：  
> - 显示 IntentRule 列表；  
> - 自动 AlignmentReport；  
> - 完整的 Semantic UI Mock（可以先用真实 UI 或简化版 UI）。

在当前 RegionSelector MVP 中，已经额外验证了一条「Step 对齐视图」的最小闭环：

- Step 列表暂由代码/文档硬编码（后续收敛到 ScenarioSpec 编辑器）；  
- UI_INTENT 事件通过 `meta.storyId / meta.stepId / meta.label` 与这些 Step 对齐；  
- UI 在 UI_INTENT 面板上方显示每个 Step 的 `covered/pending` 状态，为 PM 提供一个“无需查看 JSON/Trace 也能判断场景是否按 Spec 跑完”的提示层。

---

## 5. 后续增强：从 Playground 向 Alignment Lab 演进

在 MVP 跑通后，可按以下方向增强页面能力：

### 5.1 IntentRule / R-S-T 面板

- 在左侧或中间增加「规则视图」：  
  - 列出与当前场景关联的 IntentRule（采用平台统一模型）；  
  - 点击某条规则时：  
    - 高亮对应的 Logix 代码片段；  
    - 在 Trace/Logs 中只展示与该 ruleId 相关的事件。

### 5.2 UI_INTENT / Semantic UI Mock 集成

- 将右侧 UI 预览替换/扩展为 Semantic UI Mock 驱动的线框视图：  
  - Worker 发出 UI_INTENT（来自 Semantic UI Mock）；  
  - Host/Playground 渲染线框组件，并处理用户交互；  
  - UI_INTENT 列表作为一个新的 Tab，展示 UI 行为意图流。

### 5.3 AlignmentReport 与诊断视图

- 在 RunResult 之上增加一层 AlignmentReport（可先从 RegionSelector 单场景开始）：  
  - 用简单规则（例如“选择浙江后 cityOptions 必须包含杭州”）对 stateSnapshot/Trace 做断言；  
  - 在页面上用通过/失败标记场景执行结果，并列出违反的规则。  
- 为 AI/开发提供一份可复制的诊断文本或结构化数据。

### 5.4 多场景与多模块扩展

- 支持在左侧选择不同场景（例如不同用例或不同 Module）；  
- 在 Studio 中，将 Playground 作为 Module/Scenario 详情页中的一个 Tab 嵌入，而不是独立页面。

### 5.5 录制/回放 + 任务联动（规划中的交互能力）

- 录制模式：允许 PM/开发在 Playground 中真实操作一次场景，系统记录 UI_INTENT/TRACE/HTTP 序列并自动生成 ScenarioSpec 草稿（预填 storyId/stepId/label 与 props 匹配规则），PM 再补充 Given/When/Then 文案。  
- 回放模式：选择某个 Spec 版本，自动执行并对比 RunResult，生成 AlignmentReport；未命中的 Step/Rule 可一键创建任务，附带场景片段与运行摘要，减少人工复述。  
- 覆盖/回归仪表盘：汇总 storyId/stepId/intentId 的覆盖情况与回归趋势，为 PM 提供“需求满足度”视图，为开发/AI 提供“需要修复的具体步骤/规则”入口。
---

## 6. 小结

- 从产品视角看，Playground/Alignment Lab 是 Intent Flow 平台中承接 **Spec/Intent → Logix → Runtime 行为** 的关键页面；  
- 短期目标是：  
  - 用 RegionSelector 场景实现一个可运行的 Playground 原型；  
  - 让 PM/开发可以在这页上手动验证“级联逻辑是否按预期工作”；  
- 中长期目标是：  
  - 把 IntentRule / UI_INTENT / AlignmentReport 叠加上去，让这页成为 Spec-Driven / Intent-Driven 开发里的「Executable Spec Lab」入口。  

后续若页面信息架构收敛稳定，可以将本稿拆分为更细的 PRD/交互稿，与 Studio/DevTools 的整体导航对齐。
