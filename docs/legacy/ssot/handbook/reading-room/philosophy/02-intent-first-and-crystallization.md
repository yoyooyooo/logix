# 意图优先与结晶过程 (Intent First & Crystallization)

> "Code is the projection of intent, not the intent itself."
> "Software development is a process of crystallization, not translation."

Logix 的核心世界观建立在两个隐喻之上：**投影 (Projection)** 与 **结晶 (Crystallization)**。

## 1. 代码只是投影

在传统开发中，代码被视为“单一事实源 (SSoT)”。但代码往往是不完美的：它混合了“我想做什么 (What/Intent)”和“在这个技术栈下怎么做 (How/Implementation)”。

Logix 认为，**Intent (意图)** 才是本体。

- **Intent**: "点击按钮时，如果库存充足则下单。"
- **Code (React/Redux)**: `const handleClick = () => { dispatch({ type: 'SUBMIT' }); if (state.inventory > 0) ... }`
- **Code (Vue/Pinia)**: `function submit() { if (store.inventory > 0) ... }`

这些不同的代码只是同一个 Intent 在不同技术平面的**投影**。因此，Logix 致力于捕获、存储和演进 Intent 本身，而不是仅仅管理代码文件。

## 2. 从翻译到结晶

目前的 AI 编程助手（如 Copilot）大多扮演“翻译官”的角色：你给它一段模糊的自然语言（Prompt），它翻译成一段代码。这种模式的缺陷在于：**模糊的输入只能得到模糊的输出**，且难以维护。

Logix 提倡**结晶 (Crystallization)** 隐喻：
软件开发是从“模糊”到“精确”的过程。平台不应只是一个单向的翻译器，而应是一个帮助思维沉淀的**结晶器**。

### 液态与固态 (Liquid vs Solid)

- **液态意图 (Liquid Intent)**:
  - 自然语言描述、草图、会议记录。
  - 特征：模糊、易变、高语义密度。
  - 对应角色：PM / Designer / human thought。
- **固态资产 (Solid Assets)**:
  - Schema、Logic Flow、Component Tree。
  - 特征：精确、结构化、机器可读、可编译。
  - 对应角色：Compiler / Runtime / SSoT。

Logix 平台的职责不是“替代人类写代码”，而是**维护液态意图与固态资产之间的双向映射**。
当人类输入模糊的想法时，AI 辅助将其“结晶”为精确的结构；当人类修改这些结构时，系统反向更新意图的描述。

## 3. 为什么这对 AI 至关重要？

如果 AI 只能操作代码（Text），它就永远被困在字符层面的概率预测中，容易产生幻觉。
当 AI 操作的是 **Intent (结构化数据)** 时：

1.  **校验成本极低**：意图结构（如 JSON Schema）通过校验即由“概率正确”坍缩为“逻辑正确”。
2.  **上下文窗口更高效**：Intent 是高浓缩的，比包含大量样板代码的源码更适合作为 Prompt。
3.  **可推理**：Intent 之间的依赖关系（Graph）是显式的，AI 可以进行因果推理，而不是文本补全。
