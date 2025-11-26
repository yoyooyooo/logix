# Platform UI & Interaction Design (v3)

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

v3 的 UI 设计不再追求“全图形化编程”，而是致力于打造一个 **“图形增强的 IDE”**。图形负责宏观编排，代码负责微观实现，两者各司其职，互不干扰。
