---
title: 'Runtime Logix · DevTools, Runtime Tree & TagIndex (Draft)'
status: draft
version: 0.1.0
layer: L9
value: extension
priority: 2200
related:
  - ../../runtime-logix/core/02-module-and-logic-api.md
  - ../../runtime-logix/core/05-runtime-implementation.md
  - ./runtime-logix-core-gaps-and-production-readiness.md
  - ./runtime-logix-fractal-tagindex-and-universe-tree.md
---

# Runtime Logix · DevTools, Runtime Tree & TagIndex (Draft)

> 草稿目的：专门承载与 Runtime Tree 可视化、DevTools 集成、TagIndex 观测面相关的设计思考，与分形 Runtime 架构草案解耦。
> 
> 本草案当前只占位，不对具体 API 做结论。待分形 Runtime / Tag 冲突检测等基础能力稳定后，再集中补充。

## 1. 初步范围

- 定义每颗 Runtime 的最小可观测元信息（RuntimeMeta）；
- 基于 TagIndex 构建 Env 拓扑视图（Module / Service / Tag 关系）：
  - v3 核心实现中，AppRuntime 已维护一份内部 TagIndex（`TagInfo` / `TagCollision` / `TagCollisionError`），在构建阶段用于 Tag 冲突检测（见 `runtime-logix/impl/app-runtime-and-modules.md` 与 `AppRuntime.makeApp` 实现）；
  - 本草案关注如何在不影响核心运行时行为的前提下，将这份 TagIndex 暴露为 DevTools / Universe 可消费的观测面（例如只读查询 API 或事件流），并在后续 ModuleDef / 分形 Module 树 flatten 时扩展其覆盖范围。
- 提供 Debug API 或 DevTools Hook，以便在浏览器/CLI 中查看 Runtime Tree；
- 不直接影响 Runtime 核心行为，仅作为观测与调试层。

## 2. 暂缓事项

以下议题将暂缓到本草案完善阶段讨论，不在分形 Runtime 架构草案中展开：

- Runtime Tree / Module Tree / Link/Process 视图的具体 UI 形态；
- RuntimeMeta / TagIndex 的精确数据结构与导出方式；
- 与 React DevTools / 浏览器扩展的集成方式；
- 对 DebugSink / Lifecycle / App 级 events$ 的统一整合。

当分形 Runtime 架构与 Tag 冲突检测机制落地后，再围绕本草案补全 DevTools 相关设计。
