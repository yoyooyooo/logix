---
title: Philosophy & Workflow
status: draft
version: 1.0
---

# Philosophy & Workflow: The "Intent-Driven" Way

> **Status**: Consolidated (Philosophy)
> **Context**: `v3/ai-native`
> **Previous**: `L6/value-proposition-and-workflow.md`, `L6/bidirectional-flow-analysis.md`

本文档阐述 Logix AI-Native UI 的核心哲学与工作流。

## 1. The "Compression" Philosophy

**"Skeleton 就是对 UI 信息的极致压缩。"**

*   **Compression (压缩)**: 在源码 (`src`) 中，我们只保留最核心的业务意图。
    *   `<S.Input>` = "这里需要用户输入" (100% Signal, 0% Noise)
*   **Decompression (解压)**: 在构建/运行时，Compiler 将其展开为复杂的实现细节。
    *   `<AntdInput className="w-full border-gray-300..." />` (10% Signal, 90% Noise)

### 1.1 The "No-Eject" Guarantee
传统脚手架 (CRA) 的 "Eject" 是不可逆的熵增。Logix 的目标是 **"Zero Eject"**：
*   只要业务意图不变，你就永远不需要离开 Skeleton 层。
*   如果需要定制 UI 细节，通过 **Theme Config** 或 **Custom Flesh Component** 来解决。

## 2. The Grand Flow: Fuzzy to Precise

我们将整个软件工程看作一个 **"从模糊到精确，从压缩到解压"** 的流：

| Stage | State | Nature | Action |
| :--- | :--- | :--- | :--- |
| **1. Requirement** | **Fuzzy** (Natural Language) | High Entropy | **AI Analysis** (De-fuzzing) |
| **2. Intent** | **Compressed** (Skeleton / Schema) | **High Signal / Low Noise** | **Human Review** (Locking) |
| **3. Code** | **Decompressed** (Flesh / Soul) | Low Signal / High Noise | **Compiler/Runtime** (Expansion) |

**Logix 的核心使命，就是守住 "Intent" 这一层，不让它过早地坍缩为 "Code"。**

## 3. Bidirectional Flow Analysis

我们能否从下游（Code/Flesh）反向推导回上游（Intent/Skeleton）？

### 3.1 The Three Layers of Reversibility

| Layer Transition | Direction | Nature | Feasibility |
| :--- | :--- | :--- | :--- |
| **Requirement <-> Intent** | Fuzzy <-> Compressed | Semantic | **High (AI)** |
| **Intent <-> Code (Build)** | Compressed <-> Decompressed | Deterministic | **High (Rule)** |
| **Code -> Intent** | Decompressed -> Compressed | **Lossy** | **Low (Reverse Eng)** |

### 3.2 The "Zero Eject" Strategy

为了保持架构的纯洁性，我们**不追求完全的 Code -> Intent 自动化同步**。
相反，我们提供 **"Escape Hatches" (逃生舱)** 来处理 Skeleton 无法覆盖的场景，而不是鼓励 Eject。

#### Escape Hatch 1: `S.Raw`
允许在 Skeleton 中嵌入原生代码。
```tsx
<S.Container>
  <S.Input bind="model:name" />
  <S.Raw>
    <div className="my-hacky-div">...</div>
  </S.Raw>
</S.Container>
```

#### Escape Hatch 2: Custom Primitives
允许开发者扩展 `S` 命名空间。
```tsx
<S.Custom component={MyComplexWidget} ... />
```

## 4. The Developer Workflow

### Phase 1: Prototyping (AI 唱主角)
1.  **Prompt**: "帮我生成一个用户详情页..."
2.  **AI Action**: 生成 Skeleton + Draft Schema + Flesh Preview。
3.  **Dev Action**: 确认业务字段和交互流程。

### Phase 2: Refinement (Human 锁定义)
1.  **Dev Action**: 手动调整 **Skeleton 代码** (TSX)。
2.  **AI Action**: 实时重新编译 Flesh。

### Phase 3: Implementation (Runtime 注入灵魂)
1.  **Dev Action**: 在 Logic 层定义 `UserDraft`，绑定 API。
2.  **Dev Action**: 在 Skeleton 上绑定 `bind="model:user"`。
3.  **Result**: 页面瞬间具备了加载、校验、提交能力。

### Phase 4: Evolution (Design System 升级)
1.  **Scenario**: 从 AntD 迁移到 MUI。
2.  **Action**: 更新 Logix Compiler 配置。
3.  **Result**: **Skeleton 代码零修改**，全站 UI 自动焕然一新。
