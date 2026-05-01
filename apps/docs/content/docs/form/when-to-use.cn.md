---
title: When to use
description: 当你需要结构化输入状态和 submit gate 时，再用 Form。
---

当下面这些点都重要时，用 Form：

- 用户可编辑的输入状态
- 按 path 寻址的变更
- 可解释的校验
- 会阻塞的 submit gate
- 数组 locality 与 cleanup 语义

如果你只需要下面这些，优先回到更简单的 core module：

- 没有 submit 语义的局部 UI state
- 只读 projection
- 没有表单边界的工作流状态

Form 最适合解决 input domain 问题，不适合作为泛用状态容器。

## 延伸阅读

- [Introduction](/cn/docs/form/introduction)
- [Quick start](/cn/docs/form/quick-start)
- [Instances](/cn/docs/form/instances)
