# Platform UI & Interaction Design

> **Status**: Draft
> **Focus**: 聚焦于 **L2 编排视图**。确立“配置优于连线，代码优于图形”的交互原则。

## 1. 核心设计哲学

### 1.1 架构即视图 (Architecture as View)
画布的首要职责是展示 **Topology (拓扑关系)** —— 也就是 Pattern 之间的连接。对于 Pattern 内部的微观逻辑，代码编辑器是更好的交互界面。

### 1.2 上下文优先 (Context First)
*   **领域聚合**: 逻辑不应散落在独立的“小画布”中。相关的逻辑必须聚合在同一个 **Logic Module** 容器内。
*   **双向导航**: 选中 UI 必见 Logic，选中 Logic 必见 UI。

## 2. 界面布局 (The Workbench)

### 2.1 语义化缩放 (Semantic Zoom)

*   **L1: Universe (模块视图)**
    *   **内容**: 业务域 (Zones) 和模块依赖。
    *   **连线**: 模块间依赖 (e.g. Order Module -> User Module)。
    *   **操作**: 架构规划，划分边界。

*   **L2: Galaxy (编排视图) —— 核心层**
    *   **内容**: Pattern 实例 (积木块)、Logic Modules、State Atoms。
    *   **连线**: 信号流 (Signal Flow)。
    *   **操作**:
        *   **拖拽编排**: 调整积木顺序。
        *   **向导配置**: 点击积木，在右侧面板填写表单。
        *   **槽位识别**: 自动高亮可插入逻辑的 Trigger 端口。

*   **L3: Planet (实现视图) —— 降级层**
    *   **默认**: **Code Editor**。双击积木，直接在浮层中查看/编辑源码。这是最清晰的逻辑展示。
    *   **可选**: **Flow Graph**。仅对纯 DSL 构建的简单逻辑提供图形化展开。但这不再是强制要求。

## 3. 关键交互模式

### 3.1 向导式配置 (Wizard First)
绝大多数逻辑调整（如修改超时时间、重试次数）都应通过右侧的 **Configuration Panel** 完成，而不是去修改图或代码。

*   **识别**: 点击 UI 组件的 Trigger 端口。
*   **推荐**: AI 推荐 Pattern 列表。
*   **配置**: 填写 Schema 驱动的表单。
*   **生成**: 平台生成 DSL Patch。

### 3.2 快速导航 (Quick Nav)
*   **Jump to Code**: 选中任意节点，按 `Cmd+Click` 直接跳转到 IDE 中的对应源码行。
*   **Peek Definition**: 悬停在 Pattern 节点上，浮层显示其 TypeScript 类型定义和文档注释。

### 3.3 治理模式

*   **Managed Mode**: 节点显示为“锁定”状态，属性面板仅展示 Pattern 配置表单。
*   **Eject Mode**: 用户点击“脱离 Pattern”，节点解锁，转换为自由编辑的 DSL 节点（此时才允许手动连线）。

## 4. Pattern Studio (架构师工作台)

这是一个独立于业务画布的 IDE 环境，专供架构师开发和验证 Pattern。

### 4.1 界面分区
*   **Code Editor (Left)**: 全功能的 Monaco Editor，支持 `definePattern` 的类型提示和补全。
*   **Live Wizard (Center)**: 实时渲染当前 Config Schema 对应的表单。架构师修改 Schema，表单即时更新。
*   **Simulation Console (Right)**:
    *   **Trace Log**: 展示服务调用 (`Effect.gen`) 与动作派发 (`dispatch`) 的执行轨迹。
    *   **State Tree**: 展示 `dsl.set` 导致的虚拟状态变化。

### 4.2 交互流程
1.  **Define**: 在左侧编写 Pattern 代码。
2.  **Config**: 在中间测试表单交互（如联动显隐）。
3.  **Run**: 点击 "Simulate"，在右侧观察逻辑执行结果。
4.  **Publish**: 验证通过后，点击 "Publish to Registry"。

## 5. 总结

当前主线的 UI 设计不再追求“全图形化编程”，而是致力于打造一个 **“图形增强的 IDE”**。图形负责宏观编排，代码负责微观实现，两者各司其职，互不干扰。

## 6. 产品侧意图语言与 IntentRule 映射

为了让产品 / 设计 / 架构角色也能在平台侧直接表达业务意图，同时与 Logix / Effect Runtime 严格对齐，本平台在「画布视图 → 规则 IR → TypeScript Intent API」之间引入了统一的中间表示 `IntentRule`（见 `.codex/skills/project-guide/references/runtime-logix/logix-core/platform/06-platform-integration.md`）。

### 6.1 业务积木 → IntentRule → Intent API

平台 UI 不直接暴露任何 TS 级 API（包括历史上的 `Intent.andUpdate*` / `Intent.Coordinate`），而是通过业务化的“积木”表达意图，内部统一映射为 `IntentRule`，再由代码生成器产出标准的 Fluent 代码（`$.onState` / `$.onAction` / `$.on` + `$.state` / `dispatch` 等）。

几个典型对照示例：

| 画布上的业务构件 | IntentRule（概念上） | 生成的 TS Intent API |
| --- | --- | --- |
| 字段联动卡片：“当字段 A 变化时，清空字段 B” | `source: { context: self, type: state, selector: A }`；`pipeline: []`；`sink: { context: self, type: mutate }` | `yield* $.onState((s) => s.A).mutate((draft) => { draft.B = '' })` |
| 模块联动连线：“Search 结果变化 → 初始化 Detail” | `source: { context: SearchStoreId, type: state, selector: results }`；`pipeline: []`；`sink: { context: DetailStoreId, type: dispatch }` | `yield* $.on($Search.changes((s) => s.results)).run((results) => $Detail.dispatch({ _tag: 'detail/initialize', payload: results[0] }))` |
| 审批流 Pattern：“点击提交 → 调用审批服务 → 更新状态” | 多条 `IntentRule`（Action 触发、Service 调用、状态更新）+ 一个 Pattern 资产 ID | `flow.fromAction(...).pipe(flow.run(runApprovalPattern(config)))` |

从平台视角看：

- 产品经理在画布上只需要选择合适的业务积木（字段联动卡片、模块连线、审批流 Pattern），并通过右侧表单配置参数；
- 这些操作由 UI 生成或更新一组 `IntentRule`；
- Codegen 层再将 `IntentRule` 转换为标准化的 Fluent TypeScript 调用（首选 `$.onState` / `$.onAction` / `$.on` + `$.state/dispatch` 组合，其次是 Flow 封装 + Effect 原生结构化控制流）。

### 6.2 统一 IR，允许多种代码风格

借助 `IntentRule` 这一 IR，平台可以做到：

- **代码 → 图**：解析现有 TS 代码中的 Fluent DSL / Flow 组合，尽量还原为一组 `IntentRule`，在画布上展示为可编辑的规则节点；
- **图 → 代码**：当用户在画布上调整规则或配置参数时，仅修改 `IntentRule` 集合，再由 Generator 生成/更新 TS 代码；
- **DSL 演进不锁死**：未来如需引入新的 Intent API（例如 `Intent.react`），只要能映射到同一套 `IntentRule`，画布与历史资产都不需要大改。

这意味着：**PM 层的“意图语言”可以完全围绕业务构件 + 规则表单设计，而不需要直接面对 TypeScript API；而 Runtime/代码生成层则通过 `IntentRule` 与 Logix / Effect-Native API 精确对齐，避免语义漂移。**
