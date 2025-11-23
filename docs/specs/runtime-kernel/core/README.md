# Intent Flow Runtime Kernel · 说明与导航

> 本目录定义了 Intent Flow 平台中「运行时内核 (Runtime Kernel)」的整体方案：从指导思想、架构分工，到 Kernel API 契约、典型场景与示例代码骨架。

## 文档分组概览

为方便不同角色快速找到入口，本目录按三层语义分组：

### 1. 愿景与架构层（Why & 大图）

- `00-manifesto.md`  
  核心背景与长期判断；为什么需要一个 AI-Ready 的标准化运行时。

- `01-architecture.md`  
  Kernel / Form / React 三层的能力分工与依赖关系；Monorepo 结构与各包的角色。

- `03-intent-alignment.md`  
  Intent 模型与 Kernel 概念的映射关系；为何 Kernel 适合作为 Intent-Driven AI Coding 的运行时目标。

- `04-platform-integration.md`  
  Kernel 在 intent-driven 平台中的角色；Intent 各层如何映射到 Schema / Logic / Services / Constraints；  
  与 Effect Flow Runtime 及平台静态分析/竞态治理的协作方式。

- `09-kernel-v2-capabilities.md`  
  为 v2 场景增加的能力扩展：流式编排、意图优先级、统一意图 (Unified Action)、细粒度订阅等。

### 2. 内核契约与实现层（What & How）

- `02-kernel-design.md`  
  Kernel 运行时的完整能力面与 API 契约：`makeStore`、State/Actions/Logic、Path 体系、可观测性等。

- `02-flow-kit-design.md`  
  Flow Operator System 设计：声明式逻辑原语、Flow.define、算子体系 (Source/Task/Sink)。

- `06-implementation-architecture.md`  
  内部实现架构：State/Event 混合模型、Hub/SubscriptionRef/Scope 的组合方式，以及循环防护策略。

- `07-usage-guidelines.md`  
  使用侧规范：State 与 Event 的边界、Logic 编写原则、常见模式与反模式。

- `08-debugging-features.md`  
  调试与观测能力：调试事件、Trace、日志结构等。

- `integration-guide.md`  
  第三方库（React Query / WebSocket / RxJS 等）到 Kernel 的适配模式；  
  如何统一抽象成 `Stream` 并通过 `on` / `mount` / `flow` 接入。

- `05-react-integration.md`  
  从 Kernel 视角出发的 React 适配总览：Adapter 的职责边界、状态同步策略、派生状态分层等。  
  具体 Hooks API 与 React 特性支持的详细规范在 `../react/` 目录中展开。

### 3. 场景与示例层（Examples & Scenarios）

- `scenarios/`  
  - `01-core-scenarios.md`：核心场景压力测试（字段联动、异步、副作用、生命周期等）。  
  - `02-advanced-scenarios.md`：进阶/罕见场景（集合、外部源、多租户、动态逻辑、Intent 优先级等）。  
  - `03-matrix-analysis.md`：以 Matrix 视角汇总各类场景与能力覆盖度。

- `examples/`  
  - 以「表单 / 列表 / 外部集成 / 并发 / 系统能力 / 意图模式」等维度整理的示例代码骨架。  
  - 既用于验证 Kernel API 是否顺手，也可作为 AI / 人类出码的参考蓝本。

## 推荐阅读路径

- 初次接触 / 架构对齐  
  按顺序阅读：`00-manifesto.md` → `01-architecture.md` → `02-kernel-design.md` → `03-intent-alignment.md` / `04-platform-integration.md`。

- 设计/演进内核能力  
  以 `02-kernel-design.md` 为主合同，同时结合 `06-implementation-architecture.md`、`07-usage-guidelines.md`、`08-debugging-features.md`、`09-kernel-v2-capabilities.md` 讨论具体改动。

- 评估场景覆盖度或为 AI/人类准备范例  
  以 `scenarios/` + `examples/` 为入口，先从 `scenarios/01-core-scenarios.md` / `examples/01-basic-form.md` 起步，再根据需要展开到 Matrix/Pattern 系列。

## 使用方式建议

- 讨论方案与做设计决策时：  
  以 `02-kernel-design.md` + `scenarios/` 作为契约与需求空间的事实源，不再区分「阶段版本」，只按能力域与场景频度（常见/进阶/罕见）思考。

- 规划实际实现节奏时：  
  建议在仓库根部维护单独的 `ROADMAP.md`，按「能力域」拆分任务与优先级，避免在本目录里掺入时间线与阶段表述，从而保持设计层长期稳定。  
