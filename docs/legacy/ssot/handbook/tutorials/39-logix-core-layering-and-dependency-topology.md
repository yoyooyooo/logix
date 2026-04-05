---
title: logix-core 分层教程 · src/*.ts 与 internal/** 的依赖拓扑铁律（从 0 到 1）
status: draft
version: 1
---

# logix-core 分层教程 · src/*.ts 与 internal/** 的依赖拓扑铁律（从 0 到 1）

> **定位**：本文是给新维护者的“落点与依赖方向指南”。你改 `packages/logix-core/src` 时，最容易踩的坑不是某个 API，而是 **依赖方向**：一旦形成环或把实现散到顶层，后续所有重构都会变痛苦。  
> **裁决来源**：实现侧的结构铁律以 `docs/ssot/runtime/logix-core/impl/README.03-structure-rules.md` 为准；本文把它讲成“决策树 + 剧本集 + 自检方式”。

## 0. 最短阅读路径（10 分钟上手）

1. 读 `docs/ssot/runtime/logix-core/impl/README.03-structure-rules.md`：先记住两条铁律：顶层子模块要有实现；internal 不得反向 import 顶层。  
2. 打开 `packages/logix-core/src/index.ts`：看对外导出的概念地图（Module/Logic/Flow/Runtime/Debug/Platform/Reflection/Observability…）。  
3. 只要你准备新增/移动文件：先读「2.3 我该把新能力放哪？」（决策树）。

## 1. 心智模型（为什么要这么“死板”）

### 1.1 分层的目标：让实现可重构、可抽包、可验证

logix-core 的长期演进需要同时满足：

- **可重构**：internal 可以随意拆分/重排，不破坏 public API。  
- **可抽包**：runtime core 未来可能拆成更小的内核包；必须保持拓扑单向。  
- **可验证**：一眼能判断“这段代码属于 public 概念”还是“实现细节”。  

所以我们选择“强约束的目录拓扑”，用结构保证演进速度。

### 1.2 两级分层：Top-level 子模块 vs internal；internal 内还有浅/深分层

核心口诀：

1. `packages/logix-core/src/*.ts`：对外概念入口（子模块）。  
2. `packages/logix-core/src/internal/**`：实现细节（可自由重构）。  
3. `packages/logix-core/src/internal/runtime/core/**`：深层内核（最稳定的实现中心）。  

依赖方向必须单向（浅 → 深），禁止回头。

## 2. 核心链路（从 0 到 1：拓扑规则与落点决策）

### 2.1 顶层子模块（src/*.ts）的职责：概念收口 + 薄封装（不能是纯 re-export）

规则（SSoT impl）：

- `src/*.ts` 必须包含实际实现（工厂函数/薄封装/组合根），不能长期维持为纯 re-export。  
- 对外类型与入口应该在这里被命名清楚，让 `src/index.ts` 只做聚合导出。

例：

- `packages/logix-core/src/Flow.ts`：作为对外 Flow API 的入口，内部委托到 `internal/runtime/FlowRuntime`。

### 2.2 internal 的职责：共享实现下沉；禁止反向 import 顶层

规则（强约束）：

- 多个子模块共享的实现必须下沉到 `src/internal/**`。  
- **禁止** `src/internal/**` 反向 import `src/Module.ts`、`src/Logic.ts`、`src/Flow.ts` 等顶层文件（避免环与 API 漂移）。  

### 2.3 internal 内部的浅/深分层：浅层适配 → 深层 core

规则（impl 事实源）：

- 深层实现集中在：`packages/logix-core/src/internal/runtime/core/**`  
- 浅层 internal 文件（`src/internal/*.ts`、`src/internal/runtime/*.ts`）只做 re-export 或薄适配，给顶层子模块一个稳定入口。  
- `runtime/core/**` 不得回头 import 上层 internal。

自检规则（非常好用）：

- `rg \"../\" packages/logix-core/src/internal/runtime` 应为空（core 目录内除外）。

### 2.4 我该把新能力放哪？（决策树）

当你要新增一个能力，按以下顺序决策：

1. **它是对外概念吗？**  
   - 是：新增/修改 `packages/logix-core/src/<Concept>.ts`（子模块），对外命名清楚。  
   - 否：下沉到 `packages/logix-core/src/internal/**`。

2. **它会被多个子模块共享吗？**  
   - 会：优先放 `src/internal/**`，再由多个子模块 import。  
   - 不会：仍可放 internal，但可以更贴近具体实现目录（避免过度抽象）。

3. **它是否属于运行时内核（热路径/核心拓扑）？**  
   - 是：优先放 `src/internal/runtime/core/**`。  
   - 否：可以放在浅层 internal 或 observability/reflection 等子域里。

4. **它是否需要被平台/CI 消费（IR/对齐工件）？**  
   - 是：优先走 `Reflection/Observability` 等既有“工具链入口”，避免新造 public surface。  
   - 否：保持 internal，别泄漏到 public API。

## 3. 剧本集（常见违规与如何修）

### 3.1 剧本 A：我在 internal 里 import 了顶层子模块，TS 没报错但感觉不对

处理方式：

- 把被 import 的实现下沉到 internal（或 runtime/core），让顶层只做薄封装。  
- internal 只依赖 deeper internal；顶层依赖 internal。  

这类“看起来能跑”的 import，长远几乎必然导致环依赖与重构困难。

### 3.2 剧本 B：顶层文件只是 `export * from "./internal/xxx"`，是不是也可以

短期可以作为过渡，但不是长期形态：

- 顶层子模块要承担“概念命名 + 对外边界”的职责；  
- 纯 re-export 会让对外概念地图变成“文件组织的偶然结果”，最终导致 import 口径漂移。

### 3.3 剧本 C：我要改一个 core 文件，但发现它依赖了上层 internal

这是违反“浅 → 深”拓扑的信号。

修复思路：

- 把上层依赖抽成 core 内的 helper（或把 shared helper 下沉到 core）；  
- 上层 internal 负责 re-export/薄适配，不要让 core 回头。

## 4. 代码锚点（Code Anchors）

1. `docs/ssot/runtime/logix-core/impl/README.03-structure-rules.md`：结构铁律（权威）。  
2. `packages/logix-core/src/index.ts`：对外导出地图（public surface）。  
3. `packages/logix-core/src/*.ts`：顶层子模块（Module/Logic/Flow/Runtime/Debug/Platform/MatchBuilder/Reflection/Observability…）。  
4. `packages/logix-core/src/internal/runtime/core/**`：运行时内核实现中心（深层）。  

## 5. 验证方式（Evidence）

最小自检建议（不需要跑全仓）：

- 确认 internal 不反向 import 顶层子模块（用路径检索或依赖图工具）。  
- 跑一遍 `rg \"../\" packages/logix-core/src/internal/runtime`（core 目录内除外应为空）。  
- 若改动触及 core 热路径：同时补齐 perf/diagnostics 证据（见 `docs/ssot/handbook/playbooks/diagnostics-perf-baseline.md`）。  

## 6. 常见坑（Anti-patterns）

- 把“对外概念”藏在 internal：导致 import 口径漂移与 API 不可发现。  
- 顶层只做纯 re-export：让公共 API 变成文件组织的副产物。  
- internal 反向 import 顶层：极易形成环依赖与难以拆分的黑盒。  
- 把复杂实现塞进浅层 internal：让 internal 失去浅/深层次结构，最终难以抽内核。  
