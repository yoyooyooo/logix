# Logix Specifications

> **Status**: Living Documentation
> **Context**: `v3/ai-native`

本文档是 Logix 规范体系的总索引。

## 1. Core Specifications (The Truth)

确定性高、已进入实施阶段的核心规范。

- **[Intent-Driven AI Coding](./intent-driven-ai-coding/v3/README.md)**
  - 平台主线：UI/Logic/Domain 三位一体 + Flow/Logix 设计与运行时契约。
- **[Runtime Logix](./runtime-logix/README.md)**
  - 运行时主线：Logix Engine, Behavior & Flow Intent 的统一前端运行时 PoC。

## 2. Drafts & Topics (The Lab)

正在孵化、探讨或作为特定主题参考的草稿文档。

- **[Drafts Index](./drafts/README.md)**
  - 包含按主题分类的草稿 (`topics/`) 和按成熟度分级的草稿 (`L1~L9`)。

---

## Directory Structure

```
docs/specs/
├── intent-driven-ai-coding/  # Platform Specs (v3)
├── runtime-logix/            # Runtime Specs
└── drafts/                   # Drafts & Topics
    ├── topics/               # Consolidated Topics (AI UI, Core API...)
    └── L1~L9/                # Tiered Drafts
```
