---
title: 06 · 全双工引擎：静态分析与锚点系统 (The Full-Duplex Engine)
status: draft
version: 11 (Comprehensive-Final)
---

> **核心目标**：实现 Intent (图) 与 Code (码) 的**无损双向同步**。确立 **Code is Truth** 原则。Parser 聚焦于提取**架构拓扑**与**配置参数**，而非代码实现的细节。

## 1. 核心理念：架构即视图 (Architecture as View)

在 v3 架构中，我们不再试图将每一行代码都转化为图形。我们认为：

*   **Pattern 内部 (Implementation)**：代码是最佳视图。画布无需解析，仅需展示为黑盒或代码块。
*   **Pattern 之间 (Topology)**：图形是最佳视图。画布负责展示组件间的信号流转与依赖关系。

## 2. 静态分析引擎 (The Static Analysis Engine)

平台内置一个基于 `ts-morph` 或 `Babel` 的高性能 Parser，负责将源码转化为可视化所需的 Memory AST。

### 2.1 解析策略：三级降级 (Tri-Level Degradation)

为了包容现实世界代码的复杂性，Parser 采用“尽力而为”的解析策略：

| 级别 | 模式 | 代码特征 | 画布表现 | AI 能力 |
| :--- | :--- | :--- | :--- | :--- |
| **L1** | **White Box** (白盒) | 使用标准的 `dsl.call`, `dsl.branch` 等算子，且参数为字面量。 | **标准节点**。显示图标、参数表单，支持拖拽连线。 | **完全理解**。可精准修改参数和流程。 |
| **L2** | **Gray Box** (灰盒) | 使用了 DSL 算子，但参数是动态变量 (e.g. `dsl.call(serviceName)`)。 | **受限节点**。显示为流程节点，但无属性面板，仅提供代码弹窗。 | **结构理解**。知道这里有一步操作，但不敢修改内部逻辑。 |
| **L3** | **Black Box** (黑盒) | 原生 TypeScript 代码，或无法识别的第三方库调用。 | **代码块节点** (Raw Code Block)。显示源码片段。 | **文本处理**。将其视为不透明文本块。 |

### 2.2 识别规则 (Recognition Rules)

Parser 通过识别特定的 **AST Pattern** 来提取语义：

1.  **Pattern 实例化**: 
    *   匹配 `yield* SomePattern(config)`。
    *   提取 `config` 对象，用于生成属性面板。
    *   **不解析** `SomePattern` 内部的函数体。

2.  **DSL 骨架**:
    *   匹配 `dsl.branch`, `dsl.on`, `dsl.emit`。
    *   这些决定了图的形状（分支、触发、终点）。

3.  **依赖注入**:
    *   匹配 `yield* _(ServiceTag)`。
    *   仅用于构建**依赖关系图 (Dependency Graph)**，不在流程图中展开为具体节点。

### 2.3 智能白盒化 (Smart Whitening)

为了支持强类型的依赖注入写法，Parser 具备基础的**数据流分析 (Data Flow Analysis)** 能力。

**场景**：Pattern 内部使用 `Context.Tag` 获取服务。

```typescript
// 1. 依赖注入
const audit = yield* _(AuditServiceTag);
// 2. 方法调用
yield* audit.log("Action");
```

**解析逻辑**：
1.  **Trace**: 识别 `yield* _(AuditServiceTag)`，在符号表中记录变量 `audit` 绑定到了 `AuditService`。
2.  **Infer**: 扫描后续代码，当遇到 `audit.log(...)` 时，查表得知 `audit` 是 Service 实例。
3.  **Visualize**: 将该调用解析为标准的 **ServiceCallNode** (White Box)，而非原生代码块。

> **限制**：Parser 仅支持当前作用域内的局部变量追踪。如果变量被传递给其他函数或经过复杂运算，将自动降级为黑盒。

## 3. 锚点系统 (The Anchor System)

虽然静态分析很强大，但它无法存储“非代码信息”（如节点在画布上的 X/Y 坐标，或节点的折叠状态）。因此，我们依然需要锚点系统作为辅助。

### 3.1 锚点职责

1.  **元数据存储**: 存储可视化布局信息 (`x`, `y`, `collapsed`)。
2.  **身份锁定**: 赋予代码块一个持久化的 UUID (`node-id`)，确保重命名变量后图结构不乱。
3.  **黑盒边界**: 显式标记黑盒代码的起止范围，帮助 Parser 确定代码块的边界。

### 3.2 锚点格式

锚点以注释形式存在，不影响代码执行。

```typescript
// @intent-node: node-123 { x: 100, y: 200, type: "service-call" }
yield* dsl.call("OrderService", "create", { amount: 100 });

// @intent-start: node-456 { type: "raw-code", label: "复杂计算" }
const tax = calculateTax(amount);
const total = amount + tax;
// @intent-end: node-456
```

## 4. 全双工工作流 (The Workflow)

### 4.1 Code -> Graph (渲染)
1.  读取 `.ts` 文件。
2.  Parser 提取 DSL 调用链，构建逻辑拓扑。
3.  读取 `@intent` 注释，合并坐标和元数据。
4.  渲染画布。

### 4.2 Graph -> Code (修改)
1.  用户在画布上拖拽节点或修改参数。
2.  Generator 根据 Memory AST 的变更，生成 **CodeMod** 操作。
3.  利用 `ts-morph` 精准定位到源码中的对应节点（通过锚点 ID 或 AST 路径）。
4.  应用修改（如更新字面量、插入语句），并保留原有注释和格式。

## 5. AI 操作协议 (AI Ops Protocol)

为了保证 AI 生成代码的质量和一致性，平台预设了一套 **System Prompt Library**。LLM 不直接生成代码，而是执行特定的“任务”。

### 5.1 Config Assistant (配置助手)
*   **Task**: 将用户的自然语言意图映射为符合 Schema 的 JSON 配置。
*   **Input**: User Intent + Config Schema (JSON Schema)。
*   **Output**: Valid JSON Object。
*   **Constraint**: 严禁臆造 Schema 中不存在的字段。

### 5.2 Code Refiner (代码重构师)
*   **Task**: 根据用户指令修改现有的 TypeScript 代码块。
*   **Input**: Original Code + User Instruction。
*   **Output**: Modified Code Block。
*   **Constraint**: 
    1. 保持原有的 Effect-TS 风格。
    2. 尽量保留原有变量名。
    3. 仅返回代码，不包含 Markdown 标记。

### 5.3 Slot Filler (填空者)
*   **Task**: 为 `aiSlot` 生成具体的实现逻辑。
*   **Input**: Slot Context (Inputs/Outputs) + User Intent。
*   **Output**: Pure Function Body / Effect Generator。
*   **Constraint**: 必须使用 Context 中提供的变量，不得引入未定义的外部依赖。

## 6. 类型投影 (Type Projection)

为了在 Web 画布上实现“强类型”体验，平台必须将 Domain Intent 实时投影为浏览器的类型定义。

### 6.1 虚拟文件系统 (Virtual FS)

浏览器端的编辑器 (Monaco) 挂载一个虚拟文件系统。平台后端负责实时编译：

*   **Input**: Domain Intent (JSON Schema / Database)
*   **Process**: `Schema -> TypeScript AST -> .d.ts String`
*   **Output**: 注入到 Monaco 的 `extraLibs` 中。

### 6.2 开发者体验 (DX)

1.  **自动补全**：在 Builder 中输入 `UserService.` 时，自动列出 `update` 方法。
2.  **实时校验**：参数类型错误时，画布上的代码块直接标红。
3.  **重构支持**：修改 Domain 实体名，所有引用的 Logic Flow 自动报错或重构。

## 7. Future Roadmap: The Perfect Round-trip

为了达到“完美”的工程上限，我们将逐步引入以下高级特性：

### 7.1 Browser LSP (浏览器语言服务)

**目标**：实现零延迟的类型投影。

*   **现状**：依赖后端生成 `.d.ts` 注入 Monaco，存在网络延迟。
*   **未来**：在浏览器 Worker 中运行 **TypeScript Language Service (WASM)**。Builder SDK 直接与内存中的 VFS 通信，实现毫秒级的类型推导和错误检查。
