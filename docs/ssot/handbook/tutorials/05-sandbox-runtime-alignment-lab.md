---
title: Sandbox / Runtime Alignment Lab 教程 · 剧本集（compile/run/trialRunModule/RunResult 从 0 到 1）
status: draft
version: 1
---

# Sandbox / Runtime Alignment Lab 教程 · 剧本集（compile/run/trialRunModule/RunResult 从 0 到 1）

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味与平台/工具开发对齐。  
> **重要**：本文不是裁决来源；凡涉及 MUST/协议/边界的最终口径以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。  
> **一句话**：`@logixjs/sandbox` 不是“代码 runner”，而是 **Executable Spec Lab（可执行规范实验室）** 的运行时底座——它必须产出可对齐的 RunResult（EvidencePackage/Trace/Tape/Anchors），而不仅是“能跑起来”。

## 0. 最短阅读路径（10 分钟上手）

如果你只想快速把“Sandbox 为何存在/如何跑起来/产物如何对齐”塞进脑子：

1. 先读平台术语裁决（避免把 Playground 当 runner）：
   - `docs/ssot/platform/foundation/02-glossary.md` → `docs/ssot/platform/foundation/glossary/04-platform-terms.md`（Playground/Sandbox/Alignment Lab、Universal Spy、Semantic UI Mock、RunResult/Root IR）
2. 再读平台 Grounding 契约（RunResult 的单一事实源）：
   - `docs/ssot/platform/contracts/01-runresult-trace-tape.md`
3. 看 Sandbox topic（为什么是 Executable Spec Lab，MVP 场景是什么）：
   - `docs/specs/drafts/topics/sandbox-runtime/00-overview.md`
   - `docs/specs/drafts/topics/sandbox-runtime/mvp/README.md`
4. 看包 API 设计（Host/Worker/协议/最小入口）：
   - `docs/specs/drafts/topics/sandbox-runtime/25-sandbox-package-api.md`
5. 对照真实代码锚点（实现永远胜过文档想象）：
   - Host SDK：`packages/logix-sandbox/src/Client.ts`
   - Host↔Worker 协议：`packages/logix-sandbox/src/Protocol.ts`
   - DTO（RunResult/MockManifest/Trace/UI_INTENT）：`packages/logix-sandbox/src/Types.ts`
   - Worker 入口：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`
   - compiler：`packages/logix-sandbox/src/internal/compiler/index.ts`
   - Vite 静态资产挂载：`packages/logix-sandbox/src/internal/kernel/vitePlugin.ts`
6. 看可运行样例（“省市区联动”）：`examples/logix-sandbox-mvp`

## 1. 心智模型（Sandbox 的“存在理由”与边界）

### 1.1 Sandbox Runtime vs Playground vs Runtime Alignment Lab

这三个词在平台术语里有明确分工（别混用）：

- **Sandbox Runtime（沙箱运行时）**：隔离执行环境（当前主要是浏览器 Worker），负责“跑 + 限权 + 采集 + 导出”。
- **Playground（意图 Playground）**：面向人类/AI 的交互视图（选择场景、运行、看 RunResult）。
- **Runtime Alignment Lab（运行时对齐实验室）**：Playground 的目标形态：不仅能跑，还要显式回答“行为是否对齐 Spec/Intent”。

因此，Sandbox 的成功标准从来都不只是“compile+run 成功”，而是：

> “同一个 Scenario/Spec 在受控环境中运行后，能产出平台可消费的 RunResult，并能回链到 Root IR 与对齐报告。”

### 1.2 为什么要 Worker + 编译器：不是为了炫技，是为了“可约束执行”

Sandbox 的执行对象往往是：

- 外来代码（第三方/业务仓库/生成代码）
- 生成代码（平台出码/重写后的结果）

它们共同特征是：**你无法假设它们可信**。所以我们需要：

- 隔离（Worker/Deno 等）
- 强约束（allowlist、禁止 internal import、mock/spy）
- 可解释（结构化事件 + 预算裁剪）
- 可回放（Tape，可选；至少要有 EvidencePackage）

### 1.3 统一最小 IR 与“禁止并行真相源”

Sandbox 不能另起一套“自己的观测协议/自己的 identity/自己的时间线”。它必须与 runtime 的最小 IR 链路对齐：

- **静态**：Root IR（ControlSurfaceManifest）+ slices digests（Workflow/Traits/ModuleDescriptors）
- **动态**：EvidencePackage（ObservationEnvelope）+ tickSeq/txnSeq/opSeq/linkId 等锚点

平台契约见：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`

## 2. 核心链路（从 0 到 1：Host → Worker → RunResult）

本节只讲“当前 PoC 的真实链路”，不谈未来幻想。

### 2.1 Host：SandboxClient 负责 worker 生命周期与协议交互

Host 侧入口是 `SandboxClient`：

- `init()`：初始化 worker（拉起编译器、注入 kernel 路径与 @logixjs/core 子路径清单）
- `compile(code, filename?, mockManifest?)`：编译用户代码（并绑定本次 MockManifest）
- `run({ runId, useCompiledCode })`：执行已编译产物
- `trialRunModule(...)`：受控加载模块并导出“结构 + 证据”（对齐平台/CI）
- `uiCallback(...)`：把 UI 侧交互回传 worker（UI_INTENT 的闭环入口）

代码锚点：`packages/logix-sandbox/src/Client.ts`

### 2.2 Worker：四类命令（INIT / COMPILE / RUN / UI_CALLBACK）

worker 入口负责：

- 初始化 esbuild-wasm
- 编译（基于 compiler 插件做 import 重写与安全约束）
- 运行（eval/import bundle → 运行 Effect 程序）
- 采集（LOG/TRACE/UI_INTENT/ERROR/COMPLETE）

代码锚点：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`

### 2.3 compiler：把 import 变成“可约束的依赖图”

真正决定“Sandbox 是实验室还是 runner”的，是 compiler 的约束与重写：

- `@logixjs/core` 与 `@effect/*` 的子路径映射（优先走 sandbox 自带静态资产，减少外网不确定性）
- 禁止 `@logixjs/core/internal/*`（防止绕过公共契约）
- 对非法子路径/点号子路径 fail-fast（避免隐式兼容造成平行真相源）

代码锚点：`packages/logix-sandbox/src/internal/compiler/index.ts`

### 2.4 kernel：静态资产挂载（Vite plugin）

Sandbox 的 worker 需要能按固定 URL 拉到：

- `logix-core.js`（kernel）
- `effect.js` 以及 `effect/*` / `@effect/*` 子路径静态文件
- `logix-core.manifest.json`（@logixjs/core 子路径清单）
- `esbuild.wasm`

Vite 项目通过 `logixSandboxKernelPlugin` 把这些资产在 dev 与 build 阶段挂载出来：

代码锚点：`packages/logix-sandbox/src/internal/kernel/vitePlugin.ts`

### 2.5 输出：RunResult 必须能回链到平台契约（EvidencePackage 为核心）

平台侧对 RunResult 的裁决是：**EvidencePackage 是核心**，并且主时间轴必须以 `tickSeq` 为参考系（wall-clock 只能用于展示）。

当前 `@logixjs/sandbox` 的输出仍处在 PoC 阶段，但教程写作应始终以平台契约为北极星（避免 PoC 漂移变成事实协议）。

契约锚点：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`

## 3. 剧本集（用例驱动：你要做什么 → 走哪条路）

### A) “我只想把一个场景在 Worker 里跑起来并看输出”

推荐从 `examples/logix-sandbox-mvp` 入手（RegionSelector 省市区联动）：

- 它覆盖了最小闭环：Host UI → Worker run → logs/traces/stateSnapshot/UI_INTENT
- 它是后续对齐报告（Alignment Report）与回写链路的唯一竖切样例

文档锚点：`docs/specs/drafts/topics/sandbox-runtime/mvp/README.md`

### B) “我想把外部依赖变成可治理的 Mock/Spy（避免真实 IO）”

目标是把开放系统的 $E_t$ 收口为“可观测的调用 + 可配置的返回”，并把它纳入证据链：

- HTTP：MockManifest → worker 内 fetch 代理（mock/real 两种 mode 都要可解释）
- SDK：Universal Spy（概念层，后续要把调用路径与参数变成 Slim 事件）

术语裁决：`docs/ssot/platform/foundation/glossary/04-platform-terms.md`（Universal Spy）

### C) “我想用 Semantic UI Mock 把 UI 行为也纳入证据链”

目标不是渲染真实 DOM，而是输出语义 UI 行为（UI_INTENT），并把用户交互回传 worker：

- Worker：输出 `UI_INTENT` 事件（带 storyId/stepId/label 等元信息）
- Host：把语义 UI 渲染为线框视图，并把点击/选择等交互转为 `uiCallback(...)`

术语裁决：`docs/ssot/platform/foundation/glossary/04-platform-terms.md`（Semantic UI Mock）

### D) “我想做 kernel 对照（多内核漏斗化）”

多内核的目标不是“能换 kernel”，而是：

- 同一 Scenario 在不同 kernel 下得到的 RunResult 可对比（Diff）
- 差异能被解释为：Static IR 差异 / runtime 行为差异 / mock 差异 / 预算裁剪差异

相关路线占位：`docs/specs/drafts/topics/sandbox-runtime/00-overview.md`（多运行时漏斗）

### E) “我想让 Sandbox 变成真正的 Alignment Lab（输出对齐报告）”

对齐实验室的核心不是“更多日志”，而是“把 Trace/UI_INTENT/StateSnapshot 映射回 Spec/IntentRule”：

- 每条规则/步骤都有 stable id（intentId/ruleId/stepId）
- 事件流能按这些 id 聚合出覆盖率与偏差（Alignment Report）

方法论占位：`docs/specs/drafts/topics/sandbox-runtime/65-playground-as-executable-spec.md`

## 4. 代码锚点（Code Anchors）

- Host SDK：`packages/logix-sandbox/src/Client.ts`
- 协议：`packages/logix-sandbox/src/Protocol.ts`
- DTO：`packages/logix-sandbox/src/Types.ts`
- Effect Service：`packages/logix-sandbox/src/Service.ts`
- Vite plugin：`packages/logix-sandbox/src/internal/kernel/vitePlugin.ts`
- compiler：`packages/logix-sandbox/src/internal/compiler/index.ts`
- worker：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`
- MVP 示例：`examples/logix-sandbox-mvp`

## 5. 验证方式（Evidence）

当你改动 Sandbox 的核心链路（compiler/worker/protocol/RunResult），至少应保证：

1. **可解释**：关键事件（LOG/TRACE/ERROR/COMPLETE）稳定产生，且能被 Host 聚合与展示（不依赖控制台输出）。
2. **可约束**：禁止 internal import/非法子路径的门禁仍成立（fail-fast）。
3. **可对齐**：RunResult 的结构能对齐平台契约（EvidencePackage 为核心；tickSeq 为参考系；静态 digest 能回链 Root IR）。

平台契约锚点：`docs/ssot/platform/contracts/01-runresult-trace-tape.md`

## 6. 常见坑（Anti-patterns）

- 把 Sandbox 做成“能跑任何代码”的通用 runner：缺少约束与证据链，会直接导致平台无法对齐与回放。
- 允许绕过公共契约（例如 internal import）：短期看似方便，长期会制造并行真相源与不可治理面。
- 把 wall-clock 当作主时间轴：时间旅行/对齐必须以 tickSeq 为参考系（否则不可证明）。
- 只记 Trace 不记 Anchors：没有 stable anchors 的 trace 无法回链到 Root IR，也无法成为工具链输入。

