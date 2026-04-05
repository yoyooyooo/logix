---
title: AI Native Core · Topic Overview
status: draft
version: 2025-12-03
value: vision
priority: later
related: []
---

# AI Native Core · Topic Overview

本 Topic 聚焦「AI 能力如何融入 Logix v3 内核」，以 `@effect/ai` 为主要依托，讨论 Prompt/Tool/Service 在 Intent & Runtime 体系中的落点。

核心关注点：

- 将 Effect AI 的原语映射到 v3 的资产体系（Prompt Intent、AiServiceTag、Tool Registry、State Schema 等）；
- 抽象出 `LogixAiRuntime` / Ai Service Tag 层，避免直接泄漏底层 Provider 细节；
- 规划 AI 集成在 Logix/平台中的长期演进路径（错误语义、观测性、流式处理等）。

## 文档索引

- [00-architecture.md](./00-architecture.md) · Logix AI Native 架构设计（Effect AI 与 v3 Intent/Runtime 的整体映射关系）  
- [10-effect-integration.md](./10-effect-integration.md) · Effect AI 集成策略（Provider 抽象、Schema 驱动输入、并发与观测性等）
