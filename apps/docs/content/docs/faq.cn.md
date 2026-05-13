---
title: FAQ
description: 关于 Logix 选型、使用和运行方式的常见问题。
---

## 选型

### Logix 和 Redux / Zustand 有什么区别？

| 维度 | Redux / Zustand | Logix |
| --- | --- | --- |
| async | 依赖外部 middleware 或约定 | 内置在 Logic 和 Effect 中 |
| concurrency | 手动管理 | 通过 `runLatest`、`runExhaust` 等显式策略表达 |
| type safety | 需要手动维护 | 从 schema 推导 |
| observability | 依赖外部工具 | 内置事件管道 |

### Logix 和 XState 有什么区别？

XState 更适合严格状态机场景。
Logix 更适合数据驱动状态加显式反应的场景。

### 什么时候用 Form，而不是普通 Module？

当出现下面这些条件时，优先使用普通模块：

- 一两个输入已经足够
- 不需要 submit 语义
- 校验很简单

当出现下面这些条件时，优先使用 `@logixjs/form`：

- 多字段输入
- 校验和错误落点很重要
- 涉及动态数组
- submit gating 很重要

## 使用

### 为什么 watcher 没有触发？

常见原因有三类：

1. 选中的值没有变化
2. watcher 放在了错误的 phase
3. logic 没有装进 program

### 如何取消进行中的请求？

当只应保留最新请求时，使用 `runLatest`。

### 如何查看 Action 历史？

在 runtime 上启用 DevTools，并在 React 应用中挂载 DevTools 组件。

## 生产与宿主

### 运行时开销大吗？

在大多数应用场景里，开销可以忽略。
如果路径对性能高度敏感，使用 advanced performance 和 diagnostics 相关文档。

### 如何在生产环境降低 debug 输出？

使用面向生产的 runtime debug 配置，并在生产构建中关闭 DevTools。

### SSR 和 RSC 呢？

- SSR 可以通过 Runtime 在服务端执行
- RSC 当前不是模块的主要执行路线，优先通过 client boundary 使用

## 进一步阅读

- [Guide Overview](/cn/docs/guide)
- [API Reference](/cn/docs/api)
- [Form](/cn/docs/form)
