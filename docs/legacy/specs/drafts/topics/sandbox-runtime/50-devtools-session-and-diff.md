---
title: DevTools Session & Multi-Run Diff
status: draft
version: 2025-12-06
value: core
priority: later
---

> 占位：待基础与依赖治理完成后推进，聚焦“多次运行的时间轴、Diff、回溯”能力，为人类审核 AI 生成修改提供证据。

## 1. 目标（概要）

- 为 Sandbox 运行建立 Session 概念，记录多次 RUN 的 Trace/State 差异；  
- DevTools/Studio 中可对比 “修改前后” 的关键行为变化，辅助审核。

## 2. 关键设计点

- runId / traceId / sessionId 的标识与存储；  
- Diff 粒度：Trace 结构差异、状态快照差异、Mock 行为差异；  
- 与 runtime-observability 的数据管道复用。

## 3. 前置依赖

- Trace/UI_INTENT Schema 确定；  
- Spy/Mock 记录可稳定产出；  
- DevTools 基础视图（Waterfall、线框 UI）可用。

