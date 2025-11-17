---
title: Playground & Sandbox · Verifiable Intent Overview
status: draft
version: 2025-12-06
value: core
priority: next
---

## 1. 范围与目标

- 范围：**Intent Playground / Runtime Alignment Lab** 的整体规划，其中 Web Worker Sandbox 只是底层运行时承载。覆盖主线程 Host、Web Worker Sandbox、（可选）Deno 逃生舱，以及与 DevTools/Studio 的交互。
- 目标：先打牢「前端优先沙箱」的可运行基础，再把它升级为面向 **Spec → Intent → Logix → Runtime 行为** 的 Playground/实验室，分阶段扩展 Intent 覆盖率、AI 反馈、漏斗化多运行时对齐、Session Diff 等能力。
- 依赖：以 v3「Frontend First」为前提，沿用 `platform/impl/code-runner-and-sandbox.md` 的决策，并与 runtime-logix 的 Platform/Tracer/Observability 契约对齐。

## 2. 分阶段路线（建议顺序）

1. **基础运行时（当前阶段）**
   - Web Worker + esbuild-wasm 编译/执行链路稳定；
   - Host↔Worker 协议清晰（INIT/COMPILE/RUN/TERMINATE + LOG/TRACE/ERROR/UI_INTENT）；
   - Kernel 预注入、Allowlist + Watchdog/Hard Reset 基础可用；
   - Universal Spy / Semantic UI Mock 的最小版本接入。
2. **依赖与 Mock 治理（短期跟进）**
   - Allowlist、CDN 重写、Mock Manifest 管控，DevTools 可观测；
   - UI Mock → 主线程线框视图闭环。
3. **Intent 覆盖与 AI Feedback（中期）**
   - Trace/UI_INTENT 编码 Intent ID，输出覆盖率/未触达列表；
   - 结构化诊断供 AI 迭代（fix/build 回路）。
4. **多运行时漏斗（中期）**
   - 前端 Sandbox ↔ 后端 Deno ↔ Flow Runtime 共享 Trace Schema，对比视图；
   - 明确“Mock-only”与“真实副作用”切换策略。
5. **DevTools Session & Diff（中后期）**
   - 多次运行的时间轴、Diff、回溯；
   - 供人类审核 AI 生成修改的影响范围。

## 3. 近期工作重心（对齐基础优先）

- 运行时基线：协议、Worker 生命周期、超时熔断、Kernel 预加载、基础 Tracer/Logger/HTTP Proxy 层。
- 依赖治理：Kernel Lock + Allowlist + Universal Spy + UI Mock 的最小集成，并在 DevTools 中能看到拦截/Mock 的 Trace。
- 文档衔接：保持与 `L4/logix-sandbox-verifiable-intent-architecture.md`、`platform/impl/code-runner-and-sandbox.md` 一致，避免平行重复。

## 4. MVP：省市区联动场景（当前阶段的唯一竖切用例）

> 目标：先用一个已经在仓库中存在的真实场景，把「Logix 场景 → 沙箱运行 → 可观测输出」这条链路打通，再引入 **Spec/Intent 视角**，逐步演进为真正的 Playground（Runtime Alignment Lab）。
> 具体的范围、输入输出与实施步骤见 [mvp/README.md](./mvp/README.md)。

## 5. 待决问题（后续阶段才处理）

- Intent ID 与 Trace/UI_INTENT 的 Schema，放在哪个 SSoT；
- Node.js/Deno 逃生舱与 Flow Runtime 的边界，以及在 Studio 的漏斗化展示方式；
- Session/Diff 数据结构如何复用 runtime-observability / devtools-and-studio 的既有方案。

## 6. 与 Spec-Driven / Intent-Driven 平台的关系（Playground 视角）

- 上游：平台在 `/specify` / `/plan` 阶段会产出 **需求意图 (Spec)** 与 **细粒度 IntentRule / R-S-T 规则**。
- 中层：Logix/Effect 代码是这些 IntentRule 的实现载体（见 `.codex/skills/project-guide/references/runtime-logix/logix-core` 与 v3 文档）。
- Playground + Sandbox：
  - Sandbox Runtime 提供隔离的执行环境与统一的 `RunResult`（logs/traces/stateSnapshot）；
  - Playground 负责将 **Spec/IntentRule → Logix 实现 → Runtime 行为** 对齐起来，形成可回放、可验证的闭环。
- 长期定位：本 topic 里的「Sandbox Runtime」是 Playground/Alignment Lab 的基础设施层，产品视角的入口将以「Playground / Lab」命名，避免给人“仅是代码沙箱”的错觉。
