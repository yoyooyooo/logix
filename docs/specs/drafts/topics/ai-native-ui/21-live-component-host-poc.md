---
title: LiveComponent Host React Adapter 与 AI Native UI 的桥接 PoC
status: draft
version: 0.1.0
value: extension
priority: 1600
related:
  - ./20-live-component-runtime.md
  - ../react-adapter/02-context-injection.md
---

# LiveComponent Host: React Adapter 与 AI Native UI 的桥接 PoC

> 核心想法：在现有 `@logixjs/react` 能力基础上，做一个最小的 `LiveComponent` 宿主 PoC，用来验证 AI Native UI 草案里的运行时接口形状。

## 1. 背景

- `ai-native-ui/20-live-component-runtime.md` 设计了一套 LiveComponent Host：根据 Intent 动态构造 Draft + 编译 Skeleton TSX，再注入 Runtime；
- `@logixjs/react` 已经提供 `RuntimeProvider`、`useLocalModule`、`useSelector`、`useDispatch` 等能力，可以承载一个精简版 Host。

## 2. PoC 思路

- 在 `examples/logix-react` 中新增一个场景：
  - 使用固定的 TSX 组件（不必真正动态编译）模拟 Skeleton；
  - 使用 `useLocalModule` 或未来的 `FormSession` 启动一个局部 Runtime；
  - 将 Skeleton 组件包在一个通用的 `<LiveComponentHost module={...} logic={...} />` 内，验证接口形状和 DX。

## 3. 预期收益

- 为 AI Native UI 里的 LiveComponent 设计提供“落地样本”，收敛接口而不是继续发散；
- 验证 React Adapter 在「组件级 Runtime + 平台注入」场景下是否需要额外能力（例如错误边界、Fallback 策略）。
