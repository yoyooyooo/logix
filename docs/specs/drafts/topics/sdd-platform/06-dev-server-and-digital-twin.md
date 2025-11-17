---
title: 06 · Dev Server 与 Runtime–Studio 全双工通道
status: draft
version: 2025-12-12
value: core
priority: next
related:
  - ../devtools-and-studio/01-cli-and-dev-server.md
  - ../devtools-and-studio/02-full-duplex-digital-twin.md
---

# Dev Server 与 Runtime–Studio 全双工通道

> 本文整合 `topics/devtools-and-studio/01-cli-and-dev-server.md` 与 `02-full-duplex-digital-twin.md` 的平台层思路，在 `sdd-platform` 视角下描述 Runtime、Dev Server 与 Studio 之间的全双工关系。

## 1. Dev Server 的平台角色

在 SDD 平台的大图中，Dev Server（`logix dev`）承担三重职责：

1. **项目感知（Project Awareness）**：识别当前仓库的 Module / Runtime / IntentRule 定义，暴露给 Studio 作为“Universe 清单”；  
2. **Code ↔ IR 双向桥接**：在 Code is Truth 前提下，将 Fluent DSL 解析为 IntentRule / LogicGraph，并支持从 IR 编辑反推 AST Patch；  
3. **Runtime 事件中继**：将运行中的 Logix Runtime 产生的 Debug/Trace 事件中继到 Studio，与 IntentRule / StateTraitGraph 建立锚点。

这三点对应 `00-overview.md` 中 Context Supply Chain 的三类 Context：Spec Context（Why）、Architecture Context（Constraint）、Runtime Context（Grounding）。

## 2. Runtime 成就 Studio：可解析代码 + 可观测运行时

`02-full-duplex-digital-twin.md` 强调了两个约束：

- **Parsability as a Feature**：  
  - Logic 推荐收敛在 `$.onAction / $.onState / $.on` + Fluent `.run / .update / .mutate` 写法，使 Parser 能在 Dev Server 内可靠提取 IntentRule IR；  
  - 对逃生舱（任意 Stream/Effect）明确标记为 Gray/Black Box，Studio 仍可显示但不能细粒度编辑。
- **Observability as a Contract**：  
  - Runtime 通过 EffectOp/DebugSink 统一上报 Action/State/Service/Lifecycle 事件；  
  - Dev Server 将这些事件与模块/逻辑节点关联，Studio 得以在画布上“点亮”真实的执行轨迹。

Dev Server 是这两者的物理承载者：一边连着 TS Compiler / Parser，一边连着 Runtime Debug 通道。

## 3. Studio 成就 Runtime：编辑器即配置面板

在全双工架构下，Studio 不只是“查看器”，而是 Runtime 的“远程配置面板”：

- 对 IntentRule 图上的节点进行修改（例如调整 debounce 时间、切换 run→runLatest），由 Dev Server 翻译成 AST Patch 并写回代码；  
- 对 Module/Schema 的调整（增加字段、变更类型），通过 Dev Server 驱动 TS Compiler，立刻反馈类型/运行时错误；  
- 对 Trait/StateGraph 的修改（参考 `04-module-traits-sdd-roadmap.md` 中的 TraitDelta），由 Studio 驱动 Plan/TASKS 中的后续任务。

这保证了 **Code is Truth 但 Studio 是第一入口**：所有变更都通过 Studio 施加，但最终落在代码与 Intent 资产上。

## 4. 与其他子主题的边界

- 与 `03-spec-studio-l0.md`：Spec Studio 负责 L0/L1 Intent 的捕获与结晶，Dev Server 只在 PLAN/TASKS/IMPLEMENT 阶段参与，将 Intent 转化为代码与运行时。  
- 与 `02-full-duplex-architecture.md`：本节更多聚焦 Dev Server 作为“桥”的物理形态与职责划分；整体 Full-Duplex 架构图仍以 02 为主。  
- 与 `topics/devtools-and-studio/*`：后者保留为 DevTools/Runtime Tree/Time Travel 等细节设计，本文件则作为平台视角的整合与总览。

