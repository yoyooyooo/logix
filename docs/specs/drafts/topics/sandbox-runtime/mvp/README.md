---
title: Playground/Sandbox MVP · 省市区联动场景
status: draft
version: 2025-12-07
value: core
priority: now
---

# Playground/Sandbox MVP · 省市区联动场景

> 目的：收窄范围，只用一个已经存在的真实场景——省市区联动——验证「Effect/Logix 代码在浏览器 Worker 中可运行、可观测」这一核心能力，为后续 **Intent Playground / Runtime Alignment Lab** 与平台集成打基础。

## 1. 问题重述（MVP 核心）

- 我们暂时不追求造一个万能 Playground，而是先回答一个具体问题：  
  > 给我一个 Logix 场景（省市区联动）和一份 Mock 配置，能否在浏览器 Worker 里用 Effect 运行起来，并产出平台/AI 可消费的行为记录与状态快照？
- 这意味着当前 MVP 的技术重心是：
  - **运行时**：Effect/Logix 在 Web Worker 环境的执行链路（Kernel 预注入 + esbuild-wasm）；  
  - **协议与事件**：Host↔Worker 的 Commands/Events 是否能稳定传递日志、Trace 与状态；  
  - **可观测物**：最小化的日志/Trace/stateSnapshot 是否足以支撑平台侧验证与后续 AI 回路。

### 1.1 在 Spec-Driven / Intent-Driven 流程中的位置

从 SDD 的视角看，本 MVP 只覆盖整个链路中的一段子路径：

- 上游（SPECIFY/PLAN）：  
  - 产品/PM 以 Spec（用户旅程、场景描述）表达「省市区联动」的需求意图；  
  - 平台将 Spec 拆解为若干 IntentRule / R-S-T 链路（Source/Strategy/Target）。  
- 中层（TASKS/IMPLEMENT）：  
  - 这些 IntentRule 映射到具体的 Logix/Effect 实现（`RegionSelectorModule` + Logic + Runtime）；  
  - **本 MVP 的 Sandbox/Playground 负责在浏览器 Worker 中执行这段实现，并产生结构化 RunResult（日志/Trace/stateSnapshot）**。  
- 下游（验证与回流）：  
  - 后续阶段会将 RunResult 与上游 Spec/IntentRule 对齐，形成可执行规范（Executable Spec），本 MVP 只需在协议与观测物层面预留字段与结构。

## 2. 场景定义：省市区联动

- 逻辑概述：  
  - 用户选择省份 → 加载该省下的城市列表 → 用户选择城市 → 加载区县列表；  
  - 场景内至少包含一个主模块 `RegionSelectorModule`，state 中有 `province/city/district` 与对应 options。
- 资产边界：  
  - 一个 `ModuleImpl`：负责定义 state 结构、初始值、行动类型等；  
  - 一段 Logic/Flow：以推荐的 `$` DSL 或 Flow API 实现「选择 → 加载 → 更新」链路；  
  - 一个与之匹配的 `MockManifest`：模拟地区 API，保证在 Playground 中不依赖真实后端。
- 实现约束：  
  - 场景内的所有 Logix 定义与运行时逻辑，必须基于现有 `packages/logix-core` 与 `packages/logix-react` 提供的 API 来实现与集成；  
  - 禁止在 MVP 中另起一套临时 Runtime/Hook，只允许在现有包之上做最小适配（例如通过 `Logix.Runtime.make` + `RuntimeProvider` 启动前端 Runtime）。

> 说明：MVP 不要求在 UI 层完全复刻业务页面，只需要在日志/Trace/stateSnapshot 中能观察到「级联逻辑按预期发生」。

## 3. 一次 Playground/Sandbox 运行的输入与输出

### 3.1 输入（Host → Worker）

一次针对「省市区联动」场景的运行，至少包含：

- 场景代码快照：  
  - `RegionSelectorModule` 的 Module/ModuleImpl 定义；  
  - 对应的 Logic/Flow 实现（可作为字符串或打包前的虚拟文件）；  
  - 版本标记 `sourceVersion`（便于后续 Diff）。
- Mock 与环境：  
  - `MockManifest` 的 HTTP 段：省、市、区接口的 mock 规则；  
  - SDK/UI 段可为空或最小化；  
  - 可选 env：例如 `country = "CN"`、`lang = "zh-CN"`。
- 运行配置：  
  - `runId`（一次运行的唯一标识）；  
  - timeout（默认 5s）、可选重试策略；  
  - `kernelUrl` / `wasmUrl`：Kernel 与 esbuild-wasm 的 HTTP(S) 绝对 URL（由 Host 或测试环境提供）。

### 3.2 输出（Worker → Host）

一轮运行结束后，MVP 需要稳定产出：

- 结构化日志：  
  - DebugSink 事件：`action:dispatch` / `state:update` / `lifecycle:error` / `diagnostic` 等；  
  - ConsoleProxy 事件：来自业务代码的 `console.log` 等。
- 执行 Trace 摘要：  
  - 基于 Effect 官方 Tracer 的最小版 `TraceSpan` 列表；  
  - 能看出“某次操作（例如 selectProvince）触发了哪些 Flow/Effect 调用”。
- 状态快照：  
  - 至少包含主模块最终 state：当前选中省市区、每一级 options 内容；  
  - 后续 Session/Diff 的数据基础；  
  - 为后续“Spec 场景级断言”（Given-When-Then 或 IntentRule 对齐）提供输入。
- UI 意图（MVP PoC 已接入）：  
  - Worker 通过 UI_INTENT 事件输出语义 UI 行为（组件 mount/update/action），并在 `UiIntentPacket.meta.storyId/stepId/label` 中附带场景与步骤信息；  
  - RegionSelector Demo 中，Playground 会使用这些字段在 UI_INTENT 面板上方渲染一个简单的 Step 覆盖视图（Step1~3 的 covered/pending），作为「Executable Spec」的第一条 happy path。

### 3.3 序列化与 DTO 约束

- 所有跨 Worker 边界传输的数据（日志 / Trace / 错误 / stateSnapshot）必须是 **可序列化的 DTO（Plain Object）**：  
  - 不直接传 Effect 内部对象（`FiberId` / `Cause` / `Context` 等），避免 DataCloneError 或巨大 payload；  
  - Trace 与日志在 Worker 端先经过 Transformer，裁剪成协议层定义的 JSON 结构，再通过 `postMessage` 发送；  
  - 错误信息建议在 Worker 端转换为结构化 ErrorView（`code` / `message` / `stackText` / 关键 annotations）后再传出。

> 约束：MVP 不要求实现 Intent 覆盖率百分比、多运行时漏斗或完整 Session 时间轴，只需在协议与数据结构层面为 runId/traceId/intents 预留字段。

## 4. 技术切片与实施步骤

### 4.1 技术切片

- 切片 A：编译与 Kernel 预注入  
  - 在 Worker 中完成：「esbuild-wasm + Kernel（effect + @logixjs/core）」组合；  
  - 支持将 RegionSelector 场景代码打成可执行 bundle；  
  - Kernel 通过 `kernelUrl` 以 HTTP(S) 形式注入，测试环境可用 MSW 拦截该 URL 并返回本地 Kernel bundle。
- 切片 B：Sandbox RuntimeEnv  
  - 组合 ConsoleProxy / HttpProxy / Tracer / DebugSinkLayer / Platform.Live；  
  - 确保 Logic/Flow 在 Worker 内运行时的 Env 与生产/React 环境语义一致。  
  - 集成 Phase Guard：在「Logic/Flow 构建阶段」与「Effect 运行阶段」之间建立清晰边界，运行阶段误用 DSL（例如在 Effect 中调用 `$.onAction`）时，通过 DebugSink / ERROR 事件给出明确诊断。
- 切片 C：协议与事件流  
  - Commands：`INIT` / `COMPILE` / `RUN` / `TERMINATE`；  
  - Events：`READY` / `LOG` / `ERROR` / `TRACE` / `COMPLETE`（UI_INTENT 可选）。  
  - 保证一次运行的关键事件不会丢失，顺序足够稳定。
- 切片 D：Host 侧最小 UI（Playground 原型）  
  - 不追求完整 Studio，只实现一个最小 Playground：  
    - 一个固定的 RegionSelector 场景；  
    - 一个「Run」按钮；  
    - 三个简单面板：日志列表、Trace 列表、状态 JSON 视图（展示 `RunResult`）；  
  - 前端 UI 与 Runtime 集成层优先使用 `@logixjs/react`（`RuntimeProvider` / `useModule` 等），在其之上通过 `@logixjs/sandbox` 适配 Worker 运行时，避免发明新的前端集成模式；  
  - 后续阶段会在此基础上叠加 Spec/IntentRule 视图与更丰富的 UI/UX，用于对齐 PM/Intent/代码/运行行为。

> 代码落点：`packages/logix-sandbox` 作为 Effect-first 的沙箱包（内置 Worker/协议/编译器），业务侧示例放在 `examples/logix-sandbox-mvp`，通过 `@logixjs/sandbox` 提供的 Effect/Layer API 接入。

> Mock 注入原则：对于 RegionSelector 场景，推荐通过 Effect Layer 注入 Mock 实现（例如 `RegionApi` Service + 基于 `MockManifest` 构造的 `RegionApiMockLayer`），而不是直接在构建阶段重写业务 `import`。esbuild 插件更多用于重写通用工具库 / UI 库到 Spy/Mock，实现业务代码的「无侵入沙箱化」。

### 4.2 实施步骤（建议顺序）

1. 抽取或新写一版最小 RegionSelector 场景（`ModuleImpl + Logic`），放入 examples 或专用目录。  
2. 按 [15-protocol-and-schema.md](../15-protocol-and-schema.md) 落地 `@logixjs/sandbox` 的协议类型与 Worker 端骨架。  
3. 在 Worker 端实现 Kernel 预注入 + 编译链路，只针对 RegionSelector 场景做一条 happy path。  
4. 组合 Sandbox RuntimeEnv：ConsoleProxy + HttpProxy（仅支持地区接口）+ Tracer + DebugSinkLayer。  
5. Host 侧实现一个最小页面/组件：固定绑定 RegionSelector 场景，提供 Run 按钮与三块输出视图。  
6. 针对“选择省份 → 城市列表刷新”这一条交互，验证：  
   - Worker 能执行完整逻辑，无报错；  
   - Host 能收到预期的 DebugSink 事件、至少一棵 TraceSpan 树和正确的 stateSnapshot。  
7. 将踩坑与约束回写到本 README 与 `00-overview.md`，评估是否扩展到更多场景或进入 P1。

## 5. 出界与后续

- 本 MVP 明确不覆盖：  
  - Intent 覆盖统计与 AI 诊断输出；  
  - 基于 Spec/IntentRule 的自动化对齐评分与诊断报告；  
  - Deno 逃生舱与生产 Flow Runtime 漏斗视图；  
  - 多次 run 的 Session 时间轴与自动 Diff 视图。  
- 当且仅当：  
  - 省市区联动场景在 Sandbox 中可稳定运行，  
  - 输出的日志/Trace/stateSnapshot 能被平台/AI 实际消费（至少能作为 Spec 场景的手动验证依据），  
  再在 Playground 视图上叠加 Spec/IntentRule 视角，演进为完整的 **Runtime Alignment Lab**。

## 6. Spec 导航视图草案（多列 Finder 模式）

> 本小节只记录产品/信息架构思路，不要求在 MVP 阶段完全实现。目标是：让 PM/开发/AI 能在一个页面里沿着「需求 → 故事 → 场景 → 步骤 → 运行结果」这条链路自由切换视角。

### 6.1 概念层级回顾

为避免直接在 UI 中暴露太多 runtime 细节，这里先收敛 Spec 侧的几层概念：

- 需求（Feature）：业务需求卡片，回答“为什么、为谁、要达成什么业务结果”；  
- 用户故事（Story）：在该需求下的具体用户价值叙述（As/Want/So that）；  
- 场景（Scenario）：在某个上下文/入口下的具体用例，例如“新增地址”“编辑已有地址”；  
- 步骤（Step）：场景中 PM 在意的关键节点（打开页面、选择省份、选择城市、点击保存）；  
- 验收条件 / 意图单元：挂在 Step 下面的「Given/When/Then + 预期 UI_INTENT / 状态变化」，是将自然语言 Spec 与协议/运行时对上的桥。

对应关系可以粗略理解为：

> Feature → 多个 Story → 多个 Scenario → 多个 Step → 每个 Step 绑定若干「验收条件 / 意图单元」。

### 6.2 多列 Finder 式导航（Spec 作为左侧“骨架”）

为了让这些层级在交互上“轻量可切换”，建议在 Playground 首页采用类似 macOS Finder 的多列列表视图：

- 第 1 列：Story 列表（后续可以再往上抽象到 Feature）  
  - 展示当前需求下的用户故事集合；  
  - 选中某个 Story 后，第 2 列显示其下属的场景列表。
- 第 2 列：Scenario 列表  
  - 列出该 Story 下的所有场景（如「新增地址」「编辑地址」）；  
  - 选中某个 Scenario 后，第 3 列显示其 Step 列表，下方 Runner 也切换到这个 Scenario。
- 第 3 列：Step 列表  
  - 展示该 Scenario 的关键步骤（Step1 打开页面、Step2 选择省份：广东、Step3 选择城市：深圳等）；  
  - 选中某个 Step 时，右侧详情区域展示该 Step 的 Given/When/Then 文案和预期意图/断言。

右侧和下方区域则保持 Runtime 视角：

- 右侧 Step 详情：  
  - Tab 形式展示：  
    - `描述`：Given/When/Then 文案、补充说明；  
    - `意图`：该 Step 期望出现的 UI_INTENT 形状、关键状态字段/HTTP 断言（只读或可编辑）；  
    - `规则`：关联 IntentRule / R-S-T（给开发/平台看）。
- 下方 Runner（当前 MVP 已有）：  
  - 使用 `@logixjs/sandbox` 在 Worker 中运行当前 Scenario 的 Logix/Effect 程序；  
  - 展示 Logs / Trace / HTTP / stateSnapshot；  
  - 基于 UI_INTENT 的 `meta.storyId/stepId` 计算 Step 的 covered/pending，并在 UI 中高亮“本次运行命中了哪些 Step”。

### 6.3 为什么先做 3 列，而不是把所有层级一次摊开

考虑到 MVP 仍以 RegionSelector 为实验场，本阶段推荐只在 UI 中明确三层：

- Story 列：先固定为 1–2 个故事，用于区分“新增地址”“编辑地址”等；  
- Scenario 列：RegionSelector 相关的若干场景（新增时的首次选择、编辑时的回填等）；  
- Step 列：每个场景下 3–7 个关键步骤。

更深的层级（Feature、IntentRule/规则集、AI 诊断）暂时收敛到右侧 Step 详情和后台数据模型中，通过文档与类型对齐，不在 MVP UI 中再增加额外列数。

这样可以在不增加太多交互负担的前提下，让 Playground 首页成为一个「Spec 导航 + Runtime Runner 的合页」：

- 左侧多列是 SPECIFY/PLAN：沿着需求→故事→场景→步骤浏览、编辑 Spec；  
- 右下角 Runner 是 IMPLEMENT：对当前场景/步骤进行一次“沙箱运行”，用 UI_INTENT/Trace/HTTP 对齐 Spec；  
- 将来再在此基础上挂接 IntentRule、AlignmentReport、AI Patch 等能力，而不需要推翻导航结构。
