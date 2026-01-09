# 平台宣言 (Platform Manifesto)

> **Status**: Living

## 1. 意图优先 (Intent First)

代码是意图的**投影**，而非本体。我们致力于捕捉、结构化和演进“意图”，而非仅仅是管理代码文件。

## 2. 资产共建 (Asset Co-Creation)

平台的价值不在于它内置了多少功能，而在于它能承载多少团队的智慧。Pattern 是团队最佳实践的结晶，平台是 Pattern 的流通市场。

## 3. 开发者主权 (Developer Sovereignty)

我们尊重开发者的代码所有权和工具选择权。

*   **零锁定 (No Vendor Lock-in)**：平台生成的代码应当是标准的、可读的、无运行时黑盒的。
*   **随时逃逸 (Always Ejectable)**：提供 **Clean Mode**。开发者可以随时切断与平台的联系，带走纯净的代码，不留任何遗憾。
*   **双向尊重 (Mutual Respect)**：平台尊重人工修改的代码（通过锚点保护），不强行覆盖；开发者尊重平台的结构化约束，以换取自动化红利。

## 4. 结晶而非翻译 (Crystallization, not Translation)

软件开发是从模糊到精确的过程。平台不应只是一个“翻译器”（把需求翻译成代码），而应是一个“结晶器”——帮助模糊的想法在交互中逐渐沉淀为清晰的结构。

## 5. 运行时无关 (Runtime Agnostic)

虽然我们首选 Effect-TS，但意图模型本身应独立于具体的技术栈。Logic Intent 描述的是“做什么”，而非“怎么做”。
