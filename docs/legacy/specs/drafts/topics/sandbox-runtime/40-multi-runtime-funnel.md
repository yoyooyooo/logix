---
title: Multi-Runtime Funnel (Sandbox ↔ Deno ↔ Flow Runtime)
status: draft
version: 2025-12-06
value: core
priority: later
---

> 占位：待基础沙箱稳定后启动，用于描述前端 Sandbox、后端 Deno 逃生舱、生产 Flow Runtime 之间的漏斗与 Trace 对齐。

## 1. 目标（概要）

- 让同一 Intent/Trace Schema 在三种运行环境中可比对：前端 Mock、后端沙箱、生产流程。  
- 在 Studio/DevTools 里提供“同一 Intent 在不同运行层的表现差异”视图。

## 2. 关键关注

- Trace Schema 复用与脱敏；  
- MockManifest 在后端的兼容/禁用策略；  
- 切换策略：何时从 Sandbox 切到后端 / Flow Runtime。

## 3. 前置依赖

- Sandbox 基线与 Spy/Mock 机制稳定；  
- Deno 运行时与模块解析的同构策略明确；  
- Flow Runtime Trace 与 Intent ID 的映射方案。

