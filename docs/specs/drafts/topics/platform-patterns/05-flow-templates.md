---
title: Platform Patterns as Flow Templates
status: draft
version: 0.1.0
value: extension
priority: 1400
related:
  - ./generative-patterns-refined.md
---

# Platform Patterns as Flow Templates

> 核心想法：收紧 Platform Pattern 的职责，将其视为「BoundApi/Flow 模板 + 元数据」，而不是第二套运行时或 DSL。

## 1. 当前风险

- `platform-patterns` Topic 容易演化出一套独立的 Pattern DSL，与 Logix Runtime 的 Flow/Logic 形成平行体系；
- Pattern Lifecycle/Scenarios 文档中存在不少“运行时行为级”的描述，增加平台实现复杂度。

## 2. 收敛方向

- 将 Pattern 的 Runtime 部分限定为：
  - 一段标准的 Fluent Logic/Flow 程序值（例如 `$.onState(...).debounce().runLatest(...)`）；
  - 一份描述这段逻辑的元数据（名称、描述、适用场景、参数 Schema 等）；
- Studio/平台只负责：
  - 在交互阶段填充/修改元数据和配置；
  - 在合成阶段将配置套用到模板代码，生成普通的 Logic 文件。

## 3. 与 SSoT 的关系

- 若后续确认这一方向，将：
  - 在 `docs/specs/sdd-platform/ssot` 中增加 Pattern 作为资产类型的正式定义；
  - 在 runtime-logix 中明确 Pattern 只是 Logic/Flow 的模板，不引入新的运行时原语。
