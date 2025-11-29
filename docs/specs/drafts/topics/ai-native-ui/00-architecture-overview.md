---
title: The Grand Bidirectional Architecture
status: draft
version: 1.0
---

# The Grand Bidirectional Architecture: Intent <-> Code

> **Status**: Consolidated (Architecture Overview)
> **Context**: `v3/ai-native`
> **Previous**: `L7/grand-bidirectional-architecture.md`

本文档定义 Logix 的宏观架构图景：**从模糊需求到精确代码，再回归意图的全双工链路**。

## 1. The Four States of Matter

软件在 Logix 体系中存在四种形态：

1.  **Vapor (Requirements)**: 自然语言，模糊，高熵。
2.  **Liquid (Intent)**: Skeleton/Schema，结构化，高压缩比，语义丰富。
3.  **Solid (Code)**: Flesh/Soul，具体实现，低压缩比，细节繁杂。
4.  **Plasma (Runtime)**: Live Component，动态，瞬时，交互态。

## 2. The Grand Map of Transitions

我们定义了 6 种核心流转（Transitions）：

| ID | Transition | Direction | Nature | Protocol / Artifact | AI Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T1** | **De-fuzzing** | Vapor -> Liquid | **Lossless** (Creative) | `S.AISlot` (Prompt) | **Creator** (生成骨架) |
| **T2** | **Locking** | Liquid -> Liquid | **Validation** | `Schema Freeze` (Contract) | **Assistant** (Review/Refine) |
| **T3** | **Expansion** | Liquid -> Solid | **Deterministic** | `Compiler Config` (Build) | **None** (Strictly Forbidden) |
| **T4** | **Activation** | Solid -> Plasma | **Runtime** | `Logix Runtime` (Memory) | **None** |
| **T5** | **Reverse Eng** | Solid -> Liquid | **Lossy** | `AST Analysis` | **Repairman** (补全丢失的语义) |
| **T6** | **Extraction** | Plasma -> Liquid | **Lossy** | `Session Replay` | **Observer** (从交互中提取意图) |
| **T7** | **Evolution** | Config -> Solid | **Deterministic** | `Design System Update` | **None** (Re-compile) |

## 3. Detailed Protocol Analysis

### T1: De-fuzzing (Requirement -> Intent)
*   **Artifact**: `S.AISlot`
*   **Protocol**: AI Slot Protocol
*   **AI Action**: "Contextual Filling". AI 根据上下文（Context）和约束（Constraints），将自然语言填充为 TSX Skeleton。
*   **Lossiness**: 无损（因为是从无到有）。

### T3: Expansion (Intent -> Code)
*   **Artifact**: `Build Bundle`
*   **Protocol**: Universal AI Toolchain (Build Pass)
*   **AI Action**: **Strictly Forbidden**. 必须是纯确定性的规则映射。
*   **Lossiness**: 无损。

### T3.5: AI Flesh Pass (Optional Dev Tool)
*   **Artifact**: `Preview Code` / `Live Component`
*   **Context**: 仅在开发阶段 (Local/IDE) 或运行时动态预览 (Runtime) 触发。
*   **AI Action**: 允许 AI 介入生成 Flesh，但**不进入 CI/CD 构建流**。

### T5: Reverse Engineering (Code -> Intent)
*   **Artifact**: `Refactored Skeleton`
*   **Protocol**: **"Semantic Repair Protocol"**
*   **The Problem**: 从 `<div class="p-4 bg-white">` 还原回 `<S.Card>` 是有损的。
*   **AI Repair**:
    1.  **Analysis**: AI 分析 DOM 结构和类名。
    2.  **Context**: AI 读取周围的业务代码（变量名、注释）。
    3.  **Inference**: AI 推断 "这是一个用户信息卡片"。
    4.  **Reconstruction**: 生成 `<S.Card intent="user-info">`。
*   **Verdict**: **AI 可以抹平 80% 的损失**，但仍需人工确认。

### T6: Extraction (Runtime -> Intent)
*   **Artifact**: `User Session Intent`
*   **Protocol**: **"Interaction Mining Protocol"** (Future)
*   **Scenario**: 用户在界面上操作了一通（Plasma），系统自动生成一个 "自动化测试用例" (Liquid)。
*   **AI Role**: 观察者。从点击流中提取业务意图。

## 4. The "Silk Road" (丝滑链路)

我们的目标是打造一条 **"Silk Road"**：

*   **Forward (T1 -> T2 -> T3)**: 必须是 **100% 丝滑** 的。这是日常开发的主干道。
*   **Backward (T5)**: 允许 **"Bumpy but Safe"** (颠簸但安全)。
    *   不追求自动同步。
    *   定义为 **"AI Migration Task"**：开发者显式触发 "Refactor to Skeleton"，AI 进行有损修复，人来兜底。

## 5. Summary

Logix 不仅仅是一个 UI 库，它是一个 **"State Transformation Engine"**。
我们通过定义清晰的 **Artifacts (Vapor/Liquid/Solid)** 和 **Protocols (T1-T6)**，让 AI 在合适的地方发挥创造力（T1），在合适的地方进行修复（T5），而在工程化环节（T3）保持绝对的严谨。
