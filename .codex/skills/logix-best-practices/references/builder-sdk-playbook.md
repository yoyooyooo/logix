---
title: Builder SDK 手册
---

# Builder SDK 手册

## 1) 定位

- Builder SDK 是“静态分析契约”，不是第二套 runtime。
- 代码是唯一事实源，parser 负责读取结构，generator 负责输出可维护代码。
- Builder 与 Runtime 使用同一套目标语言（Store/Logic/Flow + Effect 结构化控制流）。

## 2) 核心原则

- `Code is Truth`：业务代码优先，平台不靠执行代码来反推结构。
- `Parser is Viewer`：parser 只做静态理解，不承担运行时语义执行。
- `Unified Language`：builder 只围绕 runtime API 做解析/生成，不发明并行 DSL。

## 3) 编写范式

- 基础范式：在模块逻辑中用 `Effect.gen` + Bound API 表达状态与流程。
- 模式封装：把长逻辑沉淀为 `(input) => Effect` 的 pattern-style 函数。
- 混合写法：允许白盒（可解析）与黑盒（不可解析）并存，但黑盒必须可降级、可标注。

## 4) 解析策略

1. 识别导入与符号别名。
2. 追踪逻辑上下文（模块、Bound API、flow 链）。
3. 匹配关键调用表达式（触发源、控制流、并发与错误边界）。
4. 无法识别片段降级为灰盒/代码块，并输出稳定标记。

## 5) 责任边界

- Core/Runtime：定义并执行语义。
- Builder：静态分析 + 代码生成 + 资产映射。
- Studio/Tooling：消费 Builder 产物做可视化与编辑，不替代 runtime 执行。

## 6) 交付清单

- 同一输入在同版本下生成结果稳定（digest/snapshot 可比）。
- 失败路径可解释（能指向源代码位置与规则）。
- 黑盒降级不破坏整体图结构。
- 不引入“builder 专用运行时”或“并行 DSL 真相源”。
