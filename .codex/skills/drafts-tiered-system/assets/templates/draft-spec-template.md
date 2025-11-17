---
# 3 位 SpecID（必填）：用于稳定引用同一草案 spec（移动/重命名不变）
id: {{ID}}
title: {{ID}} · {{TITLE}}
status: {{STATUS}}
version: {{DATE}}
value: {{VALUE}}
priority: {{PRIORITY}}

# 文档级依赖/关联（可选，推荐用 SpecID；路径仅用于同 Topic 内文件）
depends_on: []
related: []
---

# {{ID}} · {{TITLE}}

## 1. 背景 / 问题

- 为什么要做：…
- 当前痛点：…
- 约束/边界：…

## 2. 目标 / 非目标

### 2.1 目标

- …

### 2.2 非目标

- …

## 3. User Stories（US）

> 规则：每条以 `- US-205-###:` 开头（必须有冒号）；后续可用缩进子项表达依赖与联系。

- US-{{ID}}-001: …
  - Depends:
  - Relates:
  - Supports:

## 4. Functional Requirements（FR）

> 规则：每条以 `- FR-205-###:` 开头（必须有冒号）。

- FR-{{ID}}-001: …
  - Depends:
  - Supports: US-{{ID}}-001

## 5. Non-Functional Requirements（NFR）

- NFR-{{ID}}-001: …
  - Depends:

## 6. Success Criteria（SC）

- SC-{{ID}}-001: …
  - Supports: US-{{ID}}-001

## 7. Notes / Evolution

- 发现与变更记录（保持短、可追溯，避免堆叠无决策信息的长段落）
