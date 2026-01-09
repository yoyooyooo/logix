# Logix Specifications

> **Status**: Living Documentation
> **Context**: `ai-native`

本文档是 Logix 规范体系的总索引。

## 1. Core Specifications (The Truth)

确定性高、作为事实源（SSoT）使用的核心规范。

- **[SDD Platform](./sdd-platform/README.md)**
  - 平台侧主线：需求→规格→出码→运行证据→对齐回流（含 `docs/ssot/platform/` 与 `docs/specs/sdd-platform/workbench/`）。
- **Runtime SSoT（只读）**
  - `docs/ssot/runtime/**`（以真实类型/实现为裁决；与 `packages/logix-*` 同步）。

## 2. Drafts & Topics (The Lab)

正在孵化、探讨或作为特定主题参考的草稿文档。

- **[Drafts Index](./drafts/index.md)**
  - 包含按主题分类的草稿 (`topics/`) 和按成熟度分级的草稿 (`L1~L9`)。

---

## Directory Structure

```
docs/specs/
├── sdd-platform/       # Platform specs root
└── drafts/                   # Drafts & Topics
    ├── topics/               # Consolidated Topics (AI UI, Core API...)
    └── L1~L9/                # Tiered Drafts
```
