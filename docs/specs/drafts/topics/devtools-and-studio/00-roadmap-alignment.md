---
title: Builder & Studio Roadmap Alignment
status: draft
version: 0.1.0
value: vision
priority: 200
related:
  - docs/specs/sdd-platform/ssot/roadmap-logix-platform.md
  - .codex/skills/project-guide/references/runtime-logix/logix-core/README.md
  - ../platform-vision/00-generative-language-server.md
---

# Builder & Studio Roadmap Alignment

> 核心想法：在 `implementation-status.md` 中给 Builder/@logixjs/builder 一段“可执行的小路线图”，把 Generative Language Server / Spec Studio / Platform Vision 中的远景拆成 2–3 个近期可落地的能力。

## 1. 现状

- `implementation-status.md` 中将 Builder 标记为 🛑 Not Started；
- `platform-vision` / `spec-studio` Topic 中已经有大量关于终局形态的讨论，但缺少与当前实现状态的对齐。

## 2. 草案建议

- 在实现状态文档中增加一节 “Builder & Studio Roadmap”，建议包含：
  - **Rule-level 能力**：解析单条 Fluent 规则为 IntentRule，支持读懂/改写/回放；
  - **Use-case-level 能力**：从 Use Case Blueprint → IntentRule 集 → Logic 模板的最小链路；
  - **可视化基础设施**：基于 Execution Trace 或 IntentRule 拓扑的简单图视图（不做完整 Studio）。

## 3. 后续整合

- 待这些能力中任一项开始实现时：
  - 在相关 Topic 中标注 `status: active` 或 `merged`；
  - 在 `implementation-status.md` 对应条目下增加链接，作为 SSoT 的一部分。
