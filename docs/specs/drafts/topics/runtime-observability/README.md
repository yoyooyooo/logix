---
title: Runtime Observability & Debug · 概览
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ../devtools-and-studio/01-cli-and-dev-server.md
  - ../devtools-and-studio/02-full-duplex-digital-twin.md
  - ../../runtime-logix/impl/README.md
  - ../../runtime-logix/core/03-logic-and-flow.md
  - ../../runtime-logix/core/09-debugging.md
---

# Runtime Observability & Debug · 概览

> 主题定位：本 Topic 聚焦 Logix Runtime 的“可观测性与调试”能力，作为 Effect-Native 黑盒执行与 Studio/DevTools 可视化之间的桥梁。
> 目标：明确 **Tracer / TraceBus（内核）** 与 **Observability/Track 能力插件（Platform-Grade）** 的边界与协作方式。

## 1. 范围（Scope）

本主题收敛以下方面的草案与规范：

- Runtime 内核观测能力：  
  - Effect 自带 `Tracer` 的使用方式；  
  - Runtime 级 TraceBus / Debug 事件流；  
  - ModuleRuntime / Flow / Capability 调用的统一打点约定。
- 平台级 Debug & Track 能力：  
  - `$` 上的 Track/Debug API（业务埋点、调试标记等）；  
  - Observability CapabilityPlugin 与 Track/Analytics 插件的关系；  
  - 与 DevTools / Studio 的事件协议。
- 工具链与 DevTools：  
  - `logix dev` / Dev Server 如何消费 Debug 事件流；  
  - Studio Galaxy / Timeline / IntentRule Explorer 在运行时视角下的联动。

## 2. 与其他 Topic 的关系

- `devtools-and-studio`  
  - 关注 Studio / CLI / Dev Server 的整体架构与双向桥接；  
  - 本 Topic 专注 Runtime 侧的观测与 Debug 能力，两者在 Debug 事件模型上需对齐。
- `trait-system`  
  - 007 之后的 Trait/回放/诊断口径是观测与调试的事实源之一；  
  - 本 Topic 只在“观测如何解释这些事实源并对外输出”的层面补充。
- `runtime-readiness`  
  - 关注生产可用性（性能、稳定性、部署）；  
  - Observability 能力是 Runtime Readiness 的重要支撑，本 Topic 主要从“观测与调试”视角展开。

## 3. 计划文档

- `01-observability-kernel-and-tracebus.md`（待补）：  
  - 描述 Runtime 内置的 Tracer 集成与 TraceBus 抽象；  
  - 明确哪些事件是“无插件也一定存在”的基础观测信号。
- `02-observability-plugin-blueprint.md`（本次草案）：  
  - 定义 Observability/Track 能力插件在 CapabilityPlugin 体系中的位置；  
  - 描述 `$track` / `$debug` 等 API 与 TraceBus 之间的关系。
- `03-devtools-integration-contract.md`（待补）：  
  - 整理 Runtime Debug 事件流与 Dev Server / Studio 之间的协议约束；  
  - 对齐 `devtools-and-studio` Topic 中的数字孪生方案。
