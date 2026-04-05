---
title: Skeleton Storage Strategy
status: draft
version: 1.0
related: []
---

# Skeleton Storage Strategy: Source vs Artifact

> **Status**: Consolidated (Storage Spec)
> **Context**: `v3/ai-native`
> **Previous**: `L6/skeleton-storage-strategy.md`

本文档回答：**Skeleton 代码到底存在哪里？**

## 1. The Core Decision: Skeleton IS Source Code

我们明确区分 **Source Code (源码)** 和 **Build Artifact (产物)**。

| Layer | Storage Location | Format | Persistence |
| :--- | :--- | :--- | :--- |
| **Skeleton** | `src/**/*.tsx` | **TSX** (Abstract) | **Persistent (Git)** |
| **Flesh** | `.logix/cache/**` or Memory | **JS/CSS** (Concrete) | **Ephemeral (Build/Runtime)** |
| **Soul** | `src/logic/**/*.ts` | **TS** (Logic) | **Persistent (Git)** |

**结论**: 开发者在 IDE 里看到、编辑、提交到 Git 的，永远是 **Skeleton 代码**。

## 2. Why Not Store Flesh?

1.  **Noise**: 具体的 UI 实现包含大量噪音（类名、布局嵌套），掩盖了业务意图。
2.  **Lock-in**: 一旦存为具体的 AntD 代码，就很难迁移到 MUI 了。
3.  **Drift**: 如果允许开发者直接修改 Flesh，那么 Skeleton 和 Flesh 就会不同步，导致“意图漂移”。

## 3. The Compilation Process

Logix Compiler (Webpack/Vite Plugin) 负责在构建时将 Skeleton 转换为 Flesh。

### 3.1 Input (Source)
```tsx
// src/pages/User.tsx
export default () => (
  <S.Container>
    <S.Input bind="model:name" />
  </S.Container>
);
```

### 3.2 Transformation (Deterministic & Rule-Based)
**Critical**: 这个过程是**绝对确定性**的，**完全不依赖 AI**。
Compiler 读取项目配置 (Design System Config)，基于预定义的映射规则，将 `<S.Input>` 替换为 `<AntdInput>`。

### 3.3 Output (Bundle)
```js
// dist/assets/index.js
createElement(AntdInput, { value: model.name, ... });
```

## 4. The AI Boundary

我们必须严格划清 **AI Generation** 与 **Engineering Compilation** 的界限。

| Stage | Action | Actor | Determinism |
| :--- | :--- | :--- | :--- |
| **Coding** | 生成 Skeleton 代码 | **AI (Copilot)** | Probabilistic (概率性) |
| **Build** | Skeleton -> Flesh | **Compiler (Webpack)** | **Deterministic (确定性)** |
| **Runtime** | 动态生成 Live Component | **AI (Runtime)** | Probabilistic (概率性) |

**原则**:
*   **CI/CD 流水线中严禁调用 LLM**。构建过程必须是稳定、快速、可复现的。
*   AI 的作用是辅助人写出正确的 Skeleton 源码。一旦源码落盘（进 Git），后续的构建流程就是传统的工程化逻辑。

## 5. Handling `S.AISlot`

### 5.1 Mode A (One-off Generation)
如果用于 **Copilot** 模式，AI 生成的代码会**替换**掉 Slot。
此时，生成的代码**必须是 Skeleton 代码**，而不是 Flesh 代码。

### 5.2 Mode B (Dynamic Generation)
如果用于 **Runtime** 模式，Slot 保留在源码中，Flesh 在运行时生成并挂载到 DOM。

## 6. Summary

*   **Skeleton 存在 `src` 目录，进 Git。**
*   **Flesh 存在 `.logix` 缓存或内存，不进 Git。**
*   **AI 生成的代码，如果是为了写入源码，必须生成 Skeleton 格式。**

这样，我们保证了代码库永远处于 **"High Intent"** 的状态。
