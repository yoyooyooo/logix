---
title: Logix Spec Studio PoC · v0.5 Alpha
status: draft
version: 0.5
value: vision
priority: next
related:
  - ../../L9/runtime-studio-full-duplex-digital-twin.md
  - ../../L9/logix-cli-and-dev-server.md
---

# 1. 产品总览 (Product Overview)

**定位**：意图驱动开发 (Intent-Driven Development) 的全双工交互原型。  
**核心理念**：文档即代码 (Document is Code)，意图即运行时 (Intent is Runtime)。

本 PoC 验证的关键命题：

- 以富文本意图为源头，实时映射为 **可执行代码 + 活体运行时**；
- 在一个界面内打通“PRD 文档 / IDE 代码 / 运行环境”，实现毫秒级的“定义 → 编译 → 验证”闭环。

## 1.1 三位一体布局 (The Trinity Layout)

界面采用三栏式布局，对应软件工程的三个维度：

- **左侧：Intent Editor（意图编辑器）**
  - 载体：富文本 + 结构化意图节点；
  - 角色：PM/架构师描述“想要什么”。
- **右上：Generated Code（代码投影）**
  - 载体：只读代码编辑器（语法高亮）；
  - 角色：实时展示意图编译后的 Logix v3 TypeScript，实现 “Code is Truth”。
- **右下：Runtime Simulator（运行时模拟）**
  - 载体：交互式状态面板；
  - 角色：即时运行逻辑，用户通过修改数据验证规则是否生效。

---

# 2. 核心功能模块 (Core Capabilities)

## 2.1 混合意图编辑器 (Hybrid Intent Editor)

基于 Tiptap 构建的混合编辑器，支持“自然语言 + 结构化节点”混排：

- **文本流 (Text Stream)**：H1 / 段落 / 列表等，用于背景与业务叙述；
- **意图节点 (Intent Nodes)**：
  - **Module Node（蓝色）**
    - 用于定义领域实体（Domain Entity）；
    - 展开后支持可视化编辑字段（名称/类型）；
    - 数据映射：Schema 定义，例如 `Order { id, total, status }`。
  - **Logic Node（紫色）**
    - 用于定义业务规则（Behavior Rule）；
    - 编辑 Trigger（Source）与 Action（Sink），隐含 Pipeline（Strategy）；
    - 数据映射：逻辑三元组 `Source -> Pipeline -> Sink`，对应 IntentRule。
- **Slash Command**
  - 输入 `/` 呼出命令面板，快速插入 Module/Logic 节点，交互风格类似 Notion / Lark。

## 2.2 AI 编排助手 (AI Orchestrator)

内置（当前模拟）的本地 AI Agent，提供“自然语言编程”体验：

- **指令式交互**：用户在底部输入框下达指令，AI 直接操作编辑器内容；
- **语义解析能力（PoC 阶段使用 Regex/Rule 模拟）**：
  - “Create Product module” → 插入带默认字段的 `Product` Module Node；
  - “If total > 100 then discount = 0.9” → 解析为 When/Then 结构并生成 Logic Node；
- **反馈机制**：操作完成后自动滚动到新节点，附带 AI 确认回复。

未来版本预期替换为真实 LLM（例如通过 Logix Dev Server 调用云端模型），并与 v3 Intent 模型对齐。

## 2.3 实时编译器 (Live Compiler)

实现 Doc → Code 的单向实时编译：

- 监听机制：编辑器内容变更触发 `onUpdate`；
- AST 转换：从文档中提取 Module/Logic 节点，生成 Logix v3 风格代码：
  - `Logix.Module("Order", { state: Schema.Struct(...), actions: {...} })`；
  - Logic 使用 `Effect.gen` + `$.onState / $.onAction` Fluent DSL；
- 价值：让非技术角色看到“需求被翻译成标准代码”，构建对 Runtime 的信任。

## 2.4 活体运行时 (Live Runtime)

实现 Intent → Runtime 的即时反馈链路（PoC 阶段为轻量模拟）：

- **状态机模拟**：前端内存中维护一个简单 Store；
- **动态 Schema**：Module 定义变化时，Runtime 面板自动渲染对应字段输入控件；
- **规则执行**：
  - 用户在 Runtime 面板修改字段值（模拟 Action/Input）；
  - 引擎遍历所有 Logic 规则，匹配 Trigger 条件（如 `total > 1000`）；
  - 满足条件时执行 Action（如 `status = "VIP"`），实时刷新面板。

后续与真实 `LogixRuntime` 对接时，应替换为真正的 ModuleRuntime + Effect 程序，而不是 JS 对象模拟。

---

# 3. 用户旅程 (User Journey)

以“订单审批”需求为例：

1. **定义 (Define)**  
   - 用户在 Intent Editor 输入：“我们需要一个订单模块。”  
   - 使用 `/Module` 快捷指令创建 `Order` 模块，添加 `amount: number`、`status: string` 字段。

2. **编排 (Orchestrate)**  
   - 用户对 AI 说：“如果订单金额大于 5000，则状态变为‘待审批’。”  
   - AI 插入 Logic 规则：`WHEN Order.amount > 5000 THEN Order.status = "Pending"`。

3. **验证 (Verify)**  
   - 用户在 Runtime 面板中将 `amount` 设置为 6000；  
   - 规则触发，`status` 自动变为 `"Pending"`，用户确认逻辑正确。

4. **交付 (Deliver)**  
   - 用户在 Code 面板复制生成的 TS 代码，发给开发团队或提交到 Git；  
   - 后续可由 Builder / `logix generate` 融入真实项目。

---

# 4. 技术实现摘要 (Technical Stack)

- 前端框架：React 18；  
- 编辑器内核：Tiptap (ProseMirror) + 自定义 Node Views；  
- 样式：Tailwind CSS；  
- 状态管理：React Context + 局部 State（PoC 级）；  
- 编译/运行：纯前端模拟，无后端依赖，极低延迟。

后续在接入 `logix dev` Dev Server 后：

- Doc → Code 的编译将由本地 Builder/Parser 接管（真实 TS AST）；  
- Runtime 面板可以直接连接当前项目的 `LogixRuntime`（通过 Debug/Introspection 接口）。

---

# 5. 局限与演进方向

## 5.1 当前局限

- **解析能力有限**：基于正则/简单 JSON，无法覆盖复杂嵌套逻辑与函数调用；
- **单向流动**：目前只支持 Doc → Code，尚未实现 Code → Doc 的逆向同步或锚点联动；
- **运行时沙箱简化**：Runtime 是 JS 对象模拟，未使用 Effect-TS / ModuleRuntime；
- **缺乏项目上下文**：PoC 不感知真实仓库结构（ModuleImpl / LogixRuntime / Layer 等）。

## 5.2 下一步规划 (Roadmap)

结合 `runtime-studio-full-duplex-digital-twin.md` 与 `logix-cli-and-dev-server.md`：

1. **引入 WASM 解析器 / Builder 集成**  
   - 在浏览器或本地 Dev Server 中接入真实 TypeScript Parser（swc/ts-morph），用统一 IR 表达 Module/Logic；
   - 将当前的“模拟编译器”替换为基于 IntentRule 的标准 Codegen。

2. **对接真实 LLM 与 Intent 模型**  
   - 使用平台统一的 AI 接入层（而不是本地 Regex）；  
   - 把 AI 操作严格约束在 Intent/Spec 模型之内（User Story / Logic Flow / Domain Concept）。

3. **全双工锚点 (Full-Duplex Anchors)**  
   - 点击右侧代码行，高亮左侧对应的 Intent 节点；  
   - 在 Studio/Dev Server 架构下，支持 Code ↔ Doc ↔ Runtime 三向同步。

4. **接入 `logix dev` 与本地 Runtime**  
   - 将 Spec Studio PoC 从“纯前端 Playground”演进为“连接本地仓库与 Runtime 的前端”；  
   - 通过 Dev Server 访问真实项目的 Module / IntentRule / LogixRuntime，实现从 L0 Spec 到 L2 Logic 的完整链路。 

