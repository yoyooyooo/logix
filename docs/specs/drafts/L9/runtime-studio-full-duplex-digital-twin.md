---
title: Runtime · Studio · 全双工数字孪生
status: draft
version: 2025-12-03T00:00:00.000Z
value: core
priority: 100
---

# 背景与动机

Logix 的命运很大程度取决于 **Runtime（运行时）** 和 **Studio（编辑器/平台）** 的关系：

- 如果 Runtime 只是一个“高级状态管理库”，Studio 只是“可视化皮肤”，最终会沦为又一个封闭的低代码平台（玩具）；
- 如果 Runtime 与 Studio 之间形成真正的 **全双工数字孪生关系 (Full-Duplex Digital Twin)**，Logix 才有机会成为下一代开发范式的基础设施（生产力工具）。

本草稿尝试：

- 把“Runtime 成就 Studio / Studio 成就 Runtime”的双向关系讲清楚；
- 衔接当前 PoC（浏览器侧解析）与未来生产形态（Language Server / Dev Server）之间的演进路径；
- 为后续 v3 规范与 Runtime/Studio 实现提供一个可以拆解落地的蓝图。

> 关系定位：  
> - **Runtime** 负责“把事情做对”：健壮、高性能、可回放、可观测；  
> - **Studio** 负责“把事情做简单”：可视化、AI 辅助、资产流通；  
> - 两者通过“**可解析的标准代码** + 可观测运行时事件”紧紧耦合，形成双向同步的数字孪生。

---

# 1. Runtime 成就 Studio：物理定律 + 骨架

没有 Runtime 的 Studio，只是一个画图工具；  
有了 Logix Runtime，Studio 就拥有了“物理引擎”和“世界骨架”。

## 1.1 元数据驱动 UI (Metadata-Driven UI)

**目标**：Studio 不自造一套数据建模语言，而是直接消费 Runtime 的强类型定义。

- Runtime 侧：
  - 开发者通过 `Logix.Module("Order", { state: Schema.Struct(...), actions: { ... } })` 定义 Module；
  - 所有 State/Action 形状都由 `effect/Schema` 描述，天然是“可序列化元数据”。
- Studio 侧：
  - 解析 Module 定义，自动生成“数据模型视图”：字段列表、枚举、嵌套结构；
  - 为 State/Action 生成表单配置面板（字段编辑、默认值、校验规则等）；
  - 后续可以基于 Schema 推导 UI 组件候选（表单、表格、过滤器等）。

**互惠点**：

- Studio 的数据建模成本大幅下降：不需要再维护第二套 Schema 系统；
- 只要 Runtime 的 Schema 演进，Studio 的 UI/配置面板可以“跟随变形”，避免 Studio 过时。

> 落地接口（草案）：  
> - `RuntimeIntrospect.listModules(): ModuleMeta[]`  
> - `ModuleMeta` 内嵌 `stateSchema`, `actionSchema`, `actionMap` 等信息，供 Studio 渲染。

## 1.2 逻辑的可解析性 (Parsability as a Feature)

Logix v3 有意收敛 Logic 的写法到 **Fluent DSL + Bound API**：

```ts
yield* $.onAction("submit")
  .debounce(500)
  .run(handleSubmit)
```

这种“**刻意的写法约束**”并不是为了束缚开发者，而是为了让 Studio 能够可靠地“看懂代码”：

- Runtime / API 设计层：
  - 推荐/约束使用 `$.onAction / $.onState / $.on` + `.run* / .update / .mutate` 这套 Fluent 形态；
  - 对“逃生舱”写法（任意 `Stream` / `Effect` 编排）进行明确标注（Gray/Black Box）。
- Studio / Parser 层：
  - 通过 AST + 简单 Pattern 匹配，就能识别出 **IntentRule IR**：source / pipeline / sink；
  - 可视化成“逻辑流程图”：节点代表 Source/Effect，边代表 Flow Operator（debounce / filter / runLatest 等）。

**互惠点**：

- Studio 获得“白盒”能力：可以精准修改某个 debounce 的参数、切换 run→runLatest，而不是把逻辑当成不可见的黑盒；
- Runtime/API 通过“**可解析性**”获得更强的长期可维护性（Studio 反向约束代码质量）。

> 对应规范落点（未来）：  
> - `docs/specs/intent-driven-ai-coding/v3/03-assets-and-schemas.md`：补充“Parsable Logic Pattern”一节；  
> - `docs/specs/runtime-logix/core/03-logic-and-flow.md`：把“推荐 Fluent 写法 + Parsable 子集”写死。

## 1.3 可观测性即调试器 (Observability as Debugger)

Logix Runtime 基于 Effect，天然具备强大的 Tracing / Crash Report 能力。  
如果把这些能力整理成稳定事件流，Studio 就可以变成“时光倒流调试器”。

- Runtime 侧：
  - 在 ModuleRuntime / LogicMiddleware 层输出结构化事件，例如：
    - `module:init / module:destroy`
    - `action:dispatch`
    - `state:update`
    - `effect:start / effect:success / effect:failure`
  - 事件携带 moduleId / logicId / correlationId 等上下文，便于串起完整调用链。
- Studio 侧：
  - 消费这些事件，渲染：
    - 时间轴视图（时序瀑布图）；
    - Logic Graph 上的“线路发光”（某条联动链每次被触发时高亮）；
    - 时光倒流视图（回看某一次 Action 之后 state 如何层层变化）。

**互惠点**：

- Studio 拥有“上帝视角”：用户不是在瞎写代码，而是在“看电影”般回放逻辑执行；
- Runtime 的调试/诊断能力由此产品化，成为日常开发体验的一部分。

> 已有草稿关联：  
> - `docs/specs/drafts/L9/runtime-logix-devtools-and-runtime-tree.md`  
> - `docs/specs/drafts/L9/logix-instrumentation-overhaul.md`

---

# 2. Studio 成就 Runtime：降维入口 + 治理熵增

Effect / Stream / 并发控制非常强大，但对普通工程师门槛极高。  
Studio 的意义，在于把 Runtime 的能力“降维包装”，同时防止代码库熵增。

## 2.1 可视化的“降维打击”

例如处理并发策略：

- Runtime 侧：
  - 提供 `run / runParallel / runLatest / runExhaust` 等 Flow API；
  - 每个 API 有清晰的语义：串行 / 并行 / 最新优先 / 阻塞防重。
- Studio 侧：
  - 把这些策略映射到 UI 上的简单选择：
    - 下拉框：“串行 / 并行 / 最新优先 / 阻塞防重”；
    - 或右键菜单：“此联动改为 最新优先 (Latest)”。
  - Studio 根据选择自动生成 / 修改对应的 `.runLatest(...)` 代码片段。

**互惠点**：

- 初级工程师不必理解复杂的 Effect 组合子，也能写出正确的并发逻辑；
- Runtime 的强大能力被 Studio 普及，而不是被复杂度锁死在少数专家手里。

## 2.2 意图锚点保护 (Anchor Protection)

纯代码世界里，很容易出现“面条逻辑”：  
跨模块联动散落在多个文件中，难以可视化，也难以治理。

Studio 可以通过 IntentRule / Pattern 的“锚点”来约束这种熵增：

- 对“符合 Parsable 模式”的联动，Studio 能够画出清晰的 Intent Graph；
- 当某段代码过于混乱/逃生舱过多，Studio 可以给出反馈：
  - “当前逻辑无法完整可视化，请拆分为更小的 Intent/Pattern”；
  - 或提示“该文件超出推荐复杂度，建议引入 Pattern/Service 抽象”。

**互惠点**：

- Studio 充当“架构师辅助工具”：  
  - 鼓励代码向“可视化/可解析的模式”靠拢；  
  - 在源头阻止随意拼接 Effect 造成的结构退化。

## 2.3 资产的流通与复用

Runtime 提供 Module / Pattern / Service 的封装能力，Studio 则负责把它们变成“商品”：

- Runtime 侧：
  - Pattern 使用统一的定义形式（如 `Pattern.make("id", { configSchema }, impl)`）；
  - ModuleImpl 携带完整的 Env/Layer 信息，可作为可部署单元。
- Studio 侧：
  - 提供 Pattern / ModuleImpl 的“资产市场”：搜索、预览、拖拽到画布、配置参数；
  - 支持“复制到项目”或“引用远程资产”的两种模式。

**互惠点**：

- 没有 Studio，Pattern 只是躺在 `patterns/` 目录里的代码片段；
- 有了 Studio，Pattern 变成可发现、可配置、可重用的生产力倍增器。

---

# 3. 全双工数字孪生：Code ↔ Studio ↔ Runtime

要实现“互相成就”，必须打通三个方向：

1. **Code → Studio（逆向）**：源码改动能实时反映到 Studio 画布；
2. **Studio → Code（正向）**：画布上的操作能精确落回源码（AST 级别修改）；
3. **Runtime → Studio（运行态）**：运行时事件能“点亮”画布上的逻辑线路。

## 3.1 Code → Studio：源码到画布

示例场景：

- 开发者在 VSCode 中手写：

```ts
yield* $.onAction("submit")
  .debounce(500)
  .run(handleSubmit)
```

- 解析链路：
  - File Watcher 捕获 `features/order/logic.ts` 变化；
  - Parser 使用 TypeScript Compiler / ts-morph，将上述 Fluent 链还原为 IntentRule：
    - source: `onAction("submit")`
    - pipeline: `debounce(500)`
    - sink: `run(handleSubmit)`
  - Studio 收到增量更新消息，将画布上对应联动的“时钟图标”显示为 500ms。

## 3.2 Studio → Code：画布到源码

反向场景：

- PM 在 Studio 画布上，将防抖参数从 `500ms` 拖拽改为 `1000ms`；
- Studio 发送一个“修改 debounce 参数”的意图给后端 Codegen：
  - 通过 AST 修改 `.debounce(500)` → `.debounce(1000)`；
  - 保持代码风格（Prettier / ESLint）和注释位置不变；
  - 回写文件并触发 LSP/IDE 刷新。

关键要求：

- 必须以 **代码为单一事实源 (Code is Truth)**：
  - 不把逻辑“存成 JSON 再生代码”，避免双写；
  - Studio 只是代码的投影仪和编辑器，不自创一套并行真相。

## 3.3 Runtime → Studio：运行时高亮

运行时链路：

- 代码在浏览器中运行，触发 `submit`；
- Runtime 发出 Trace 事件序列（dispatch → debounce → effect start/end → state update）；
- Studio 将这些事件映射到 Logic Graph：
  - 某一条联动线被触发时高亮闪烁；
  - 节点上展示“最近一次 payload / 状态变化内容”；
  - 支持在时间轴上回放某次操作。

这三条链路共同构成了“全双工数字孪生”：

- 源码和画布始终一致；
- 设计/实现/运行态在同一张图上统一。

---

# 4. 解析在哪儿跑？从浏览器 PoC 到 Language Server

关于“正逆向解析是在浏览器还是后端进行”的问题，可以分阶段看：

## 4.1 阶段一：浏览器端解析（当前 PoC）

特征：

- 所有解析逻辑跑在浏览器内存中（例如解析 Tiptap JSON、简单的 AST 模拟）；
- 优点：
  - 零部署：静态页面即可运行；
  - 零网络：本地操作延迟极低。
- 缺点：
  - 无法直接访问本地文件系统，不能真正修改 `src/` 源码；
  - 很难完整承载 TypeScript Compiler API，复杂 AST 操作性能/内存压力大。

适用场景：  
**在线 Playground / Demo / 单页面实验**。

## 4.2 阶段二：混合架构（浏览器 + WASM）

过渡方案：

- 在浏览器使用 WASM 版解析器（如 swc-wasm / oxc-wasm），对 TS/JS 源码做较完整解析；
- 仍然不直接改本地文件，而是用于 Code → Studio 方向的“逆向可视化”。

适用场景：

- 纯线上编辑器（代码暂存于远程仓库或浏览器本地存储）；
- 提前验证解析规则与 IR 设计。

## 4.3 阶段三：Language Server / Dev Server（推荐终局形态）

生产形态建议采用 **本地开发服务器 / 语言服务器** 模式：

- 开发者在本机运行 `npx logix dev` 或 `logix lsp`：
  - 启动一个常驻的 Node/Rust 进程；
  - 负责文件监听、AST 解析、IR 生成、代码修改与格式化。
- Studio 前端通过 WebSocket / LSP 扩展协议与该服务通信：
  - Code → Studio：File Watcher + Parser 推送 IntentRule / LogicGraph 更新；
  - Studio → Code：Studio 发送“修改 IR 的意图”，Server 负责 AST 变更 + 回写文件；
  - Runtime → Studio：浏览器 Runtime 把 Trace 事件发给 Server，再由 Server 转发给 Studio UI。

为什么“必须”有后端：

- **访问文件系统**：只有本地服务才能真正读写 `src/` 和 `docs/`，并与 Git/CI 集成；
- **全项目上下文**：跨文件引用、tsconfig、类型推导等都需要完整工程视角；
- **AST 操作复杂度**：大规模 AST/IR 处理在 Node/Rust 环境更稳定，易调优。

> 心智模型：  
> - 浏览器 Studio 是“视图层 + 交互层”；  
> - 本地 Language Server 是“脑干”：维护代码真相、解析逻辑、执行变更。

---

# 5. 与现有规范/草稿的关系

本草稿与以下规范/草稿直接相关（后续应作为它们之间的“桥梁”而不是平行体系）：

- Intent / 平台规划：
  - `docs/specs/intent-driven-ai-coding/v3/01-overview.md`：整体 Intent-Driven 平台蓝图；
  - `docs/specs/intent-driven-ai-coding/v3/03-assets-and-schemas.md`：IntentRule / LogicNode IR 与 R-S-T 链路；
  - `docs/specs/intent-driven-ai-coding/v3/platform/README.md`：Universe / Galaxy / UI & Module Studio / Pattern Studio / IntentRule Explorer 等平台视图，以及 Level 0–3 资产链路（业务需求 → 需求意图 → 开发意图 → 实现）的规划；
  - `docs/specs/drafts/topics/spec-studio/*`（如存在）：Spec Studio / Galaxy Canvas 相关草稿。
- Runtime / 观测性与 DevTools：
  - `docs/specs/runtime-logix/core/03-logic-and-flow.md`：Flow / Logic API 形态与 Parsable 子集约定，是“代码 ↔ IR”往返的硬边界；
  - `docs/specs/runtime-logix/core/07-react-integration.md`：`LogixRuntime.make` / `RuntimeProvider` 等 Composition Root 约定，是 Runtime↔Studio 连接的自然挂载点；
  - `docs/specs/drafts/L5/runtime-core-evolution.md`：Runtime 观测性（Supervisor/Debug 事件流）、规范边界与 RuntimeAdapter 能力的演进路线图，为 Runtime → Studio 的事件模型和“远程 DevTools/Studio 附着点”提供技术基础；
  - `docs/specs/drafts/L9/runtime-logix-devtools-and-runtime-tree.md`：Runtime Tree / TagIndex / DevTools 挂载面规划；
  - `docs/specs/drafts/L9/logix-instrumentation-overhaul.md`（已并入 L5）：早期关于从 `Logic.secure` 迁移到 Effect-Native 观测体系的思考。

从规划关系上看：

- 本草稿主要回答“**Runtime · Studio 如何形成全双工数字孪生**”，  
  需要与 v3 平台规范中的 Universe/Galaxy/Studio 视图串联起来，确保 Studio 的各个视图（Universe、Galaxy、IntentRule Explorer 等）都能通过统一的 IR & Trace 体系挂在 Runtime 和源码之上；
- `runtime-core-evolution` / `runtime-logix-devtools-and-runtime-tree` 提供了 Runtime 侧的“接线端口”（Debug 事件流、RuntimeAdapter、Runtime Tree），本草稿应在后续演进中把这些能力明确映射到 Studio 的视图和交互（例如：Runtime Tree 视图如何与 Galaxy 视图联动、高亮某条 IntentRule 的实际运行路径）。

后续若方向稳定，应：

1. 在 `runtime-logix` 规范中补充“Runtime Introspection & Observability”章节，明确 Debug 事件模型（事件类型、字段、订阅方式）与 RuntimeAdapter/ManagedRuntime 如何暴露这些事件给外部 Studio / DevTools；
2. 在 Intent v3 / 平台规范中完善“Parsable Logic Subset & Code ↔ IntentRule Roundtrip”约束，并给出 Code→IR→Code 的简单示例（例如 debounce 参数修改回写代码）；
3. 为 Spec Studio / Runtime Studio 建立统一 Topic（如 `docs/specs/drafts/topics/spec-studio/`），将本草稿与 Runtime DevTools / Galaxy Canvas 相关 L9/L5 草稿收编，形成“平台视角 + Runtime 视角”的集中事实源。

---

# 6. 待决问题与下一步

## 6.1 待决问题

- IR 形状：
  - IntentRule / LogicNode 的最终结构需同时满足：  
    - 可从 Fluent 代码中稳定提取；  
    - 能支撑 Studio 画布编辑；  
    - 能在必要时完整回写为代码。
- 逃生舱策略：
  - 如何在规范层定义“不可解析代码片段”的边界与标记方式？  
  - Studio 遇到大量逃生舱时，给出怎样的 UX 提示/约束？
- Language Server 协议：
  - 采用 LSP 扩展还是自定义 WebSocket 协议？  
  - 如何设计增量更新（例如逻辑文件中的某一条规则被修改）？
- 安全与多端协作：
  - 本地 Language Server 只为单个开发者服务，还是支持多人协同？  
  - 云端 Studio / 本地仓库之间的权限与同步策略？

## 6.2 下一步建议

1. 在 `runtime-logix` 中先确定一版 **Debug/Trace 事件模型 PoC**，并接到现有 `DebugSink` 上；
2. 在小范围（单 Feature 目录）内实现“Fluent DSL → IR → 画布”的单向链路 PoC（Code → Studio）；
3. 设计一组最小可用的 AST 变更操作（例如“修改 debounce 参数”、“切换 run → runLatest”），做一个 Studio → Code 回写 PoC；
4. 在 CLI 中预留 `logix dev` / `logix lsp` 命令入口，即便暂时只打印日志，为后续 Language Server 演进留钩子；
5. 将本草稿与相关 L9 草稿的重叠部分梳理到一个 Topic 下（例如 `topics/spec-studio/`），作为 Runtime·Studio 双向设计的集中事实源。
