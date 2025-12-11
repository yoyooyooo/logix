---
title: Reactive & Linkage · Topic Overview
status: draft
value: core
priority: next
related: []
---

# 响应式、计算属性与联动 (Reactive, Computed & Linkage)

> **状态**: 草稿 / 孵化中 (Draft / Emerging)
> **层级**: 核心概念与模式 (Core Concept & Patterns)

## 概览 (Overview)

本主题整合了 Logix 响应式数据范式、计算属性以及复杂字段联动相关的规范与模式。旨在为模块内及跨模块的数据流转与更新提供统一的愿景。

在实现层面，本 Topic 默认遵循与 Capability Plugin / SCD 相同的分层：  
- Schema 侧只携带响应式 / 联动的 Blueprint（例如 Reactive Schema, Resource Field, Schema Link）；  
- Logic 侧通过 Bound Helper（`Reactive.*`, `DynamicList.*` 等）承载实际行为；  
- 工程化层（可选）可以像 `L9/logix-state-first-module-codegen.md` 那样，在构建期从 Blueprint 生成部分辅助代码或类型，但不会改变 Runtime 契约本身。

## 文档列表 (Documents)

- **[01-reactive-paradigm.md](./01-reactive-paradigm.md)**
  定义“响应式 Schema”与“同位响应式 (Co-located Reactivity)”的核心概念文档。阐述了如何以类型安全且对平台友好的声明式方式定义计算字段、异步资源和副作用。

- **[02-dynamic-list-and-linkage.md](./02-dynamic-list-and-linkage.md)**
  处理复杂动态列表（如 `useFieldArray`）和字段级联动（例如：字段 A 控制字段 B 的可见性或校验）的模式指南。

- **[03-unified-resource-field.md](./03-unified-resource-field.md)**
  一份具有前瞻性的草案，提议通过统一的“资源字段 (Resource Field)”抽象，以一致的方式处理各种数据源（Query, Socket, AI 等）。
