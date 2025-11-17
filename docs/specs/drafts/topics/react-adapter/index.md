---
title: Logix React Adapter Specs
status: draft
version: 2025-11-28
related: []
---

# Logix React Adapter Specs (L3 Draft)

本目录包含 Logix React Adapter 的详细设计草案。这些文档原计划位于 `.codex/skills/project-guide/references/runtime-logix/logix-react`，现根据 Drafts Tiered System 迁移至此进行孵化。

## 目录索引

- **[01-hooks-api.md](./01-hooks-api.md)**: 核心 Hooks 定义 (`useModule`, `useSelector`)。
- **[02-context-injection.md](./02-context-injection.md)**: 依赖注入与 `RuntimeProvider` 设计。
- **[03-concurrent-rendering.md](./03-concurrent-rendering.md)**: 并发渲染与防撕裂 (Tearing) 策略。
- **[04-ssr-and-testing.md](./04-ssr-and-testing.md)**: SSR Hydration 与 Mock 测试策略。
- **[05-runtime-config-overrides.md](./05-runtime-config-overrides.md)**: runtime 级 React 配置覆盖（Snapshot 方案）与边界约束。
- **[06-no-useeffect-gaps.md](./06-no-useeffect-gaps.md)**: 业务组件“无 useEffect/useRef”目标下的能力覆盖与缺口分类。
- **[README.md](./README.md)**: 原始概述文档。
