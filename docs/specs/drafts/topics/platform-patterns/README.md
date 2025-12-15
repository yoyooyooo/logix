---
title: Platform Patterns · Topic Overview
status: draft
version: 2025-12-03
value: extension
priority: later
related: []
---

# Platform Patterns · Topic Overview

本 Topic 收拢平台侧的 **生成式 Pattern 体系**，关注 Pattern 从定义到运行的全生命周期，以及典型场景下的复用方式。

核心关注点：

- Pattern 的生命周期分段（Definition / Interaction / Synthesis / Runtime）与平台交互钩子设计；
- 典型平台场景中的 Pattern 组合（如 Job Processor、表单/列表生成等）；
- 如何将 Pattern 规范化为可运营资产，与 IntentRule / Studio / Runtime 形成闭环。

## 文档索引

- [generative-patterns-refined.md](./generative-patterns-refined.md) · 对现有 Pattern 设计的进一步收束与精炼
- [05-flow-templates.md](./05-flow-templates.md) · 平台侧 Flow 模板与复用策略
- [06-universal-crud-pattern.md](./06-universal-crud-pattern.md) · One Logic, Any Domain（通用 CRUD 模板）
- [07-config-as-service.md](./07-config-as-service.md) · Config-as-Layer（配置即服务注入）
- [08-fractal-runtime-and-layer-injection.md](./08-fractal-runtime-and-layer-injection.md) · 分形运行时与 Layer 覆盖（Runtime.fork 心智）
