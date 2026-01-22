# 架构即视图与全双工引擎 (Architecture as View & Full-Duplex)

> "We don't parse every line. We parse the architecture."
> "The map is the territory, if the territory is built from the map."

在可视化编程（Visual Programming）的探索中，一直存在一个两难困境：

- **黑盒模式**：代码由平台生成，不可修改。一旦修改（Eject），可视化能力失效。
- **全解析模式**：试图将任意代码解析为图。技术难度极高，且图往往杂乱无章。

Logix 选择了第三条路：**全双工 (Full-Duplex) 架构**。

## 1. 架构即视图 (Architecture as View)

Logix Parser 不试图理解你的每一行 `Effect` 代码、每一句算法细节。它只关心**架构骨架**：

- **Module Definition**: 这是系统的边界。
- **Dependencies (`$.use`)**: 这是系统的拓扑。
- **Fluent Rule Chain（`$.on...` + 显式终端 sink）**: 这是业务的主干流。

Logix 认为：**Bound API (`$`) + Fluent DSL 就是“可视架构”本身。**
我们在代码中写下的 `$.onState(selector).debounce(200).run(handler)`（或 `.update/.mutate`），不仅仅是运行时代码，更是**嵌入在源码中的图结构数据**。

## 2. 三级可视度

基于这个理念，Logix 将代码分为三个可视等级：

1.  **White Box (Platform-Grade)**:
    - 完全符合 Fluent DSL 规范的代码。
    - 平台能完美解析成图，支持拖拽、参数配置。
    - 这是**架构师**和**AI**的主要工作区。
2.  **Gray Box (Runtime-Grade)**:
    - 结构已知（挂在某个节点下），但内部逻辑复杂（手写 Effect/Stream）。
    - 平台能在图上显示为一个“黑盒节点”，但无法展开编辑。
    - 这是**高级开发者**实现复杂算法的地方。
3.  **Black Box (Raw code)**:
    - 超出平台可解析子集的代码（例如拆链、动态组合、任意 Effect/Stream 编排等）。
    - 平台应降级为“代码块节点”：至少保留 loc、所属 Module/Logic 与最小诊断锚点（可追踪、可跳转），但不尝试结构化编辑。

## 3. 全双工的意义

这种设计实现了**图与码的无损双向同步**：

- **Code -> Graph**: Parser 提取骨架，生成架构视图。AI 可以通过阅读骨架快速理解系统全貌，而不需要陷入细节泥潭。
- **Graph -> Code**: 在画布上的修改（如调整防抖时间、增加依赖），通过 AST 变换精准回写到源码。

这使得 Logix 既拥有低代码的“全局视角”和“易操作性”，又完全保留了代码的“灵活性”和“版本管理能力”。
对于 AI 而言，这意味着它可以先生成代码（Text），然后自己验证架构图（Graph）是否符合预期，实现**多模态的自我修正**。

## 对齐与落地

- 原则层 ↔ 证据层对照：`../reviews/08-philosophy-alignment.md`
- 平台全双工与 Alignment Lab 评审：`../reviews/07-platform-full-duplex-and-alignment-lab.md`
