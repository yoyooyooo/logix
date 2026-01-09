---
title: Logix Sandbox & Verifiable Intent Architecture
status: superseded
version: 2025-12-06
value: core
priority: next
superseded_by: ../topics/sandbox-runtime/05-architecture-and-boundary.md
---

> [!IMPORTANT]
> **本草案已迁移**：核心内容已下沉到 [topics/sandbox-runtime/05-architecture-and-boundary.md](../topics/sandbox-runtime/05-architecture-and-boundary.md)。
>
> 本文件保留作为历史快照，后续更新请前往 topic 目录。

## 1. 背景与目标

本草案尝试把当前关于「Sandbox Architecture Strategy: The Verifiable Intent Engine」的一组想法，抽象为与 v3 规范兼容的中立方案，用于后续收敛到：

- `docs/specs/sdd-platform/impl/code-runner-and-sandbox.md`（平台层实现规划）；
- `docs/ssot/runtime/logix-core/*` 与相关 impl 文档（前端 Runtime 契约与 Platform 集成）；
- 未来的 `@logixjs/sandbox` 子包实现。

核心问题是：在 intent-flow / Logix 平台内，如何为「Intent → Logix/Effect 代码 → 运行与验证」提供一套 **可回放、可观测、前端优先** 的沙箱运行时，并清晰划定与后端运行时、DevTools、Runtime Readiness 等其他规范的边界。

本草案默认以 v3 的「Frontend First」决策为前提，对原有想法做结构化整理，并刻意保留若干未决问题，避免过早收敛实现细节。

## 2. 核心愿景：Verifiable Intent Engine

1. 平台的目标不是提供通用的「在线代码编辑器」，而是提供一个面向 Intent/Logix 的 **Verifiable Intent Engine**：
   - 输入：用户或 AI 生成的 Logix/Effect 逻辑、Mock 环境与少量运行配置；
   - 输出：执行 Trace、日志与状态演化信息，可用于验证行为意图是否被正确落实。
2. 核心闭环是「Generate → Run → Verify」：
   - Generate：基于 Intent/Pattern 生成 Logix/Effect 代码；
   - Run：在沙箱运行时中以最小代价执行该段逻辑；
   - Verify：通过 Trace/State Diff/Mock 交互等观察面验证行为是否符合 Intent。
3. 「Frontend-First, Backend-Ready」是运行时层面的策略：
   - 首选运行时是浏览器侧 Web Worker（与 `code-runner-and-sandbox.md` 一致），用于覆盖大部分联动/校验/轻量流程场景；
   - 后端运行时（如 Deno）作为「逃生舱」，用于需要内网访问、重算力或长运行任务的 Pro 场景，但应尽量复用前端依赖策略与模块解析方式。

## 3. 架构视角：Host / Sandbox / Backend

在 v3 平台中，可以将与沙箱相关的角色划分为三层：

1. Host（主线程 / Studio / DevTools）：
   - 负责承载编辑器、Waterfall Trace 视图、原型 UI 预览等；
   - 管理 Web Worker 生命周期（创建、终止、超时熔断）；
   - 通过协议向 Worker 发送「代码 + Mock 配置 + 环境变量」，并消费来自 Worker 的日志、Trace、UI 意图信号。
2. Sandbox（Web Worker 运行时）：
   - 通过 `esbuild-wasm` 等工具在浏览器内完成打包与执行；
   - 提供「头less 的 Logix/Effect 运行环境」，不直接触达真实 DOM 或外部 IO；
   - 通过预置 Kernel 与 Mock 插件，将复杂依赖（Effect、Logix 内核、第三方 SDK、UI 库）统一折叠为可观测的逻辑行为与 Trace。
3. Backend（可选的 Deno 运行时）：
   - 当需要访问内网、执行长时间任务或使用特定系统资源时，提供等价的运行环境；
   - 倾向于使用 URL Imports 等方式与前端保持模块解析同构，使 AI 生成的代码尽量在「浏览器秒开 / 后端 Edge 部署」之间无缝切换；
   - 与「Effect Flow Runtime」在职责上区分：前者偏运行沙箱与调试，后者偏流程编排与生产级执行。

本草案只为后端逃生舱提供方向性约束，具体接入 Deno 的实现与 Flow Runtime 的协作留待专门文档处理。

## 4. 依赖治理：Hybrid Dependency Strategy

在浏览器中无法使用 `node_modules` 的前提下，沙箱需要一套兼顾体验与安全性的依赖策略。本草案将原始设想整理为四层：

1. Kernel 层（Effect + Logix 核心）：
   - 包含 `effect`、`@logixjs/core` 等核心运行时代码；
   - 在平台构建时预打包为一个或多个 ESM Bundle，并以 Blob URL 形式注入 Worker；
   - Worker 侧通过 `esbuild` 插件重写对这些模块的 import，到对应的 Blob URL 上，从而避免在沙箱中频繁拉取核心依赖。
2. Utility 层（通用工具库，如 `lodash`、`zod`、`date-fns` 等）：
   - 编译阶段将 import 重写为 `https://esm.sh/...` 或其他稳定 CDN；
   - 利用浏览器缓存与 HTTP 缓存策略降低多次加载的成本；
   - 通过 Allowlist 控制哪些工具包被视为「已验证」，避免任意 npm 包进入沙箱路径。
3. IO / SDK 层（`axios`、`aws-sdk` 等可能触达网络/外部系统的库）：
   - 默认不直接运行这些依赖，而是通过「Universal Spy」代理（见第 6 节）；
   - 编译期拦截至未在 Kernel/Utility Allowlist 中的 IO/SDK import，将调用转换为结构化 Trace 记录，并按 Mock 配置返回模拟结果；
   - 通过这种方式，将「能跑所有 npm 包」的承诺收敛为「能观察所有外部调用意图」。
4. UI 库层（`antd`、`mui` 等 React 组件库）：
   - 在 Worker 中不尝试渲染真实 DOM，也不引入完整 UI 依赖；
   - 编译期将这些 import 重写为 Semantic Mock 实现（见第 6 节），将组件行为降维为 Intent 信号与轻量逻辑。

相较于简单的「全量 CDN + 任意依赖都尝试打包」，这一策略更明确地表达了平台的边界：**沙箱优先服务 Logix/Effect 逻辑验证，而非成为通用 npm 运行环境**。

## 5. 运行模型：Headless Logix Sandbox

在运行时行为上，Logix Sandbox 被视为一个「头less Runtime」：

1. 输入：
   - 一段用户/AI 生成的代码（通常是 Logix Module 或 Effect 程序）；
   - 一份 Mock 配置（如 HTTP 行为、第三方 SDK 返回值、UI 组件行为策略等）；
   - 可选的环境变量或初始状态（例如 Region、User、Feature Flag 等）。
2. 内部执行：
   - Worker 内构造一个基于 Effect Layer 的运行环境 `RuntimeEnv`，用于替换 console、HTTP、Tracer 等基础设施；
   - 通过 Kernel 预加载与插件拦截机制，确保所有导入的依赖要么命中预置 Kernel/Utility，要么被 Universal Spy / Semantic Mock 接管；
   - 用户代码通过 eval/bundle 执行，其产生的日志、Trace、状态变化等被注入到统一的观测管道中。
3. 输出：
   - Execution Trace：面向 Effect/Logix 的执行跨度信息，可映射为 Waterfall 视图；
   - Logs：结构化日志，包括 console 输出与 Mock/Spy 记录；
   - State Diff：针对 Logix Module 或自定义状态的演化快照。
4. 渲染方式：
   - Worker 不负责真实 UI 渲染；
   - 主线程根据 Trace 与 UI 意图信号，绘制「Waterfall 视图」「线框图式原型 UI」等调试界面；
   - 任何需要与用户交互的行为（如点击 Button、确认 Modal）通过协议回传给 Worker，由 Worker 调用对应的回调或触发 Logic。

该运行模型刻意将「逻辑正确性验证」与「视觉渲染」解耦，方便后续同时服务 CLI、Studio、未来的 DevTools 插件等多种宿主。

## 6. Universal Mock & Semantic UI Rendering

为在浏览器 Worker 中安全、可观测地运行 AI 生成代码，本草案整理出两个互补机制。

### 6.1 Universal Spy：未知 IO 的统一代理

1. 设计目标：
   - AI 生成的代码可能引入任意第三方 SDK 或 IO 库（如 `stripe`、`redis`、`aws-sdk`），沙箱不应简单报错或尝试真实调用；
   - 需要一个可以「接受任意方法调用 → 记录结构化信息 → 以 Mock 结果收尾」的统一代理。
2. 实现思路：
   - 编译阶段将未在 Allowlist 中的 import 重写为 `universal-spy` 模块；
   - 该模块导出一个递归的 Proxy 对象，对所有属性访问与函数调用进行拦截；
   - 每次调用会生成一条结构化记录，例如：
     - 目标路径（如 `s3.upload`、`stripe.charges.create`）；
     - 参数摘要与调用时间；
     - 所使用的 Mock 场景标识。
   - 返回值通过 Effect 程序或简单 Promise 包装为 Mock 结果，可由 Mock 配置控制成功/失败/延时等行为。
3. 平台视角：
   - Host 根据 Spy 输出在 Trace 视图中绘制「Mock IO」节点，而非隐藏或忽略；
   - 用户可以在 Studio 中检查这些调用，调整 Mock 策略或决定是否在后端环境中执行真实请求。

### 6.2 Semantic UI Mocking：组件行为的逻辑化降维

1. 设计目标：
   - 允许在不具备 DOM 的 Worker 环境中，跑通包含 React 组件库的业务逻辑闭环；
   - 将 UI 组件的可观察行为转换为 Intent 信号，而不是具体的像素或样式。
2. 实现思路：
   - 编译期将对 UI 库（如 `antd`、`mui`）的 import 重写到 `semantic-ui-mock` 模块；
   - 该模块为常用组件（如 `Modal`、`Button`）提供 Headless Mock 实现：
     - 不渲染 DOM，而是在满足一定条件时发射 UI 意图信号（如「某个 Modal 当前处于 open 状态，具备 onOk/onCancel 触发点」）；
     - 尽可能保留子组件逻辑的执行，以兼容内部包含的业务逻辑。
   - Host 根据这些 UI 意图信号绘制线框图式的预览 UI，并提供「触发 onOk」等操作按钮；
   - 用户在主线程点击这些按钮时，通过协议指令通知 Worker 执行对应回调，从而闭合业务逻辑链路。
3. 与 Logix 的关系：
   - 该机制鼓励开发者与 AI 关注「组件的状态与交互意图」（如打开/关闭、确认/取消、触发某个 Action），减少对具体 UI 库实现的绑定；
   - 有利于未来将 UI 意图统一抽象为 Behavior & Flow Intent 的一种来源，为 Intent → Logix 编译提供更清晰的输入。

## 7. `@logixjs/sandbox` 子包草案

在工程实现上，本草案建议将 Sandbox 能力收敛为独立子包 `@logixjs/sandbox`，以便：

- 在 Studio/DevTools 中复用统一 SDK；
- 便于在不同宿主（Web、Electron、CLI）中复用核心逻辑；
- 为后续 Deno 或其他运行时提供清晰的 Host 接入点。

一个候选的包结构如下（来自原始设想，稍作抽象）：

- `client/`（主线程宿主 SDK）
  - `SandboxClient`：封装 Worker 管理与协议交互，提供 `compile` / `run` / `terminate` 等方法；
  - `protocol`：定义 Host ↔ Worker 的消息结构（命令与事件类型），与 `code-runner-and-sandbox.md` 中的交互协议呼应。
- `worker/`（沙箱内核）
  - `index`：Worker 入口与消息循环；
  - `compiler`：对 `esbuild-wasm` 的封装，负责虚拟文件系统、依赖拦截与 Kernel 注入；
  - `runtime`：构造 Effect/Logix 运行环境（Layer 组合、Tracer/Logger/HTTP 等），执行用户代码；
  - `plugins/`：依赖拦截插件集（Kernel/Utility 重写、Universal Spy、Semantic UI Mock 等）。
- `mocks/`（内置 Mock 库）
  - `universal-spy`：见第 6.1 节；
  - `semantic-ui`：见第 6.2 节。
- `react/`（主线程 React 适配）
  - `useSandbox`：封装 Worker 生命周期管理、状态同步与超时熔断逻辑，以 Hook 形式暴露给 UI 层。

上述结构暂不对具体 API 形态（函数签名、类型参数）做最终结论，但可作为后续在 `docs/ssot/runtime` 与 `apps/docs` 中设计用户级 API 时的参考。

## 8. 风险与边界：Sandbox Risk Assessment 摘要

结合原有「Sandbox Risk Assessment」想法，本草案将关键风险和缓解策略抽象为几类：

1. 依赖复杂度（Dependency Hell）：
   - 风险：CommonJS/ESM 兼容性、循环依赖、非浏览器友好依赖等导致 bundling 或运行失败；
   - 策略：
     - Kernel Lock：核心库在构建阶段预构建为稳定产物；
     - Allowlist：维护已验证的工具包列表，对列表外依赖一律走 Universal Spy；
     - 通过 DevTools 与 Runtime Readiness 相关指标，持续观察并优化沙箱中依赖行为。
2. 浏览器限制（CORS 与资源获取）：
   - 风险：真实 HTTP 请求受到 CORS 限制，类型文件 (.d.ts) 获取缓慢等；
   - 策略：
     - Mock First：在 UX 层强引导使用 Mock 数据，真实请求需显式 Opt-in；
     - Proxy：平台提供具备 CORS 能力的后端代理；
     - ATA/类型缓存：使用 IndexedDB 等手段缓存类型信息，减少重复下载。
3. 运行稳定性（死循环与资源占用）：
   - 风险：用户代码中的 `while(true)` 等 CPU Bound 逻辑阻塞 Worker，导致无法响应指令；
   - 策略：
     - Watchdog：Host 维护超时计时器；
     - Hard Reset：超时时直接 `worker.terminate()` 并重启，而不是尝试软中断；
     - 在 DevTools 中显式标注被 Hard Reset 的运行，方便调试。
4. 安全与责任边界：
   - 平台不承诺「在前端沙箱中运行所有 npm 包」，而是承诺「在受控的 Logix/Effect 运行时中，运行所有被 Intent/Pattern 映射的业务逻辑，并对外部交互提供可观测的 Mock」。
   - 对需要真实副作用的场景，应通过 Flow Runtime 或后端逃生舱处理，并在文档中明确区分这些路径。

## 9. 与现有规范的关系与下一步

1. 与 v3 平台规范：
   - 本草案可视为 `platform/impl/code-runner-and-sandbox.md` 的「细化与补充」，特别是关于依赖治理、Universal Mock 与 Semantic UI Mocking、以及 @logixjs/sandbox 包结构的部分；
   - 后续应在该规范中统一「前端优先」与「后端逃生舱」的术语与例子，避免多处定义分裂。
2. 与 runtime SSoT：
   - Sandbox 本身不改变 Logix Runtime 的核心契约，而是提供一个专门面向 DevTools/Studio 的运行环境；
   - 需要在 `docs/ssot/runtime/logix-core` 或 `docs/ssot/runtime/logix-core/impl` 文档中明确：
     - Sandbox 运行时如何复用 `Platform.Service` / Tracer / Observability 插件；
     - Logix Module 在 Sandbox 中运行时的限制（如禁止使用某些 Tag/Service）。
3. 与 drafts topics 的对接：
  - 风险与观测相关部分可后续收敛到 `runtime-v3-core` 与 `runtime-observability` topics；
   - 与 DevTools 交互相关部分可与 `devtools-and-studio` 主题对齐，统一 Waterfall 视图、UI 意图信号的展示方式。
4. 待决问题（示例）：
   - Trace / UIIntent 的结构化 Schema 应由谁定义、沉淀在哪个 SSoT 文档中；
   - Deno 逃生舱与 Effect Flow Runtime 的职责边界，以及在平台 UI 中如何暴露「在 Sandbox 中只 Mock vs 在后端真实执行」的切换；
   - @logixjs/sandbox 的公开 API 如何与 `@logixjs/react`、CLI/DevTools 插件形成一致的使用体验。

本草案暂不回答上述问题，仅将其显式列出，作为后续推进 Sandbox 相关工作时的对齐清单。
