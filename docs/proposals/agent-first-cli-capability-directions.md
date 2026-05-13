---
title: Agent First CLI Capability Directions
status: active-proposal
owner: runtime-control-plane
target-candidates:
  - docs/ssot/runtime/15-cli-agent-first-control-plane.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/ssot/runtime/14-dvtools-internal-workbench.md
  - docs/ssot/runtime/17-playground-product-workbench.md
last-updated: 2026-05-03
---

# Agent First CLI Capability Directions

## Purpose

梳理几条可行但尚未裁决优先级的 Agent First CLI 上限方向。

本提案不裁决唯一主线。它只把痛点、核心特性、可行性边界和候选试点收口，供后续拆成 specs 或升格到 runtime SSoT。

## Current Baseline

当前已经具备的基础：

- `logix live <task>` 可通过 daemon/browser attachment 读取 active runtime context。
- live data plane 的隔离坐标是 `attachmentId + connectionId + requestId + target`；`runId` 是 CLI 命令与 artifact 坐标。
- `Runtime.check / Runtime.trial / runtime.compare` 提供 verification control-plane evidence。
- browser live bridge 能返回 owner-backed inspect artifact 或 structured gap。
- evidence export 已能把 live artifact 交给 canonical evidence package。

当前不足：

- Agent 的 live 查询历史、任务链路、源码链路和 QA 复现场景仍主要散落在对话、terminal 输出和临时命令中。
- active runtime fact、control-plane report、source map、AST、route registry、QA session timeline 之间还没有统一的可查询索引。
- 高频 live 查询缺少 daemon-side queue、coalescing、budget 与 stale-cache 策略。

## Direction A - Daemon Queue And Agent Task History

### Pain

Agent 高频调用 `live state/actions/snapshot` 时，可能给 browser runtime 带来不必要负担。多个 Agent 或多次命令也难以看清当前排队、执行和失败状态。

### Core Feature

在 daemon 侧建立请求队列和任务历史：

- per attachment / per target queue
- request coalescing，例如同一 target/path 的高频 state 查询合并
- heavy operation budget，例如 snapshot、timeline、field graph
- mutation operation 排他和 admission 前置
- task history，记录 `runId / command / target / artifactRef / status / failure`

### Killer Feature

Agent Task Console：

- 查看后台 Agent 正在执行什么 CLI 命令
- 查看 pending/running/done/failed live request
- 解释哪些请求被合并、限流、降级或命中缓存
- 为后续 Chrome extension 或 DVTools panel 提供只读数据源

### Boundary

daemon queue 不成为 runtime fact authority。它只负责调度、缓存、lineage 和 structured gap。

### Trial Candidate

先做 daemon-internal queue metadata，不急着做 Chrome extension。

## Direction B - Runtime Target To Source Chain

### Pain

维护已有模块时，开发者或 Agent 可能只知道 route，不知道 route 背后的 page、lazy boundary、Program、Module、Logic、action 和 service 文件在哪里。

### Core Feature

通过运行时与源码信息合流，恢复 route 背后的源码链路：

1. CLI 读取 live target、module id、runtime id、state/action/reflection facts。
2. browser capture 记录 route 打开和用户操作后实际 loaded modules。
3. SourceMap 将 loaded module、stack frame、dynamic import 映射回源码文件。
4. 轻量源码匹配或 AST 将 `Module.make / Program.make / RuntimeProvider / useModule` 关联起来。

### Killer Feature

Open Route, Find Source：

- 输入一个 URL 或当前 attachment
- 输出 route owner、page component、lazy feature、RuntimeProvider、Program、Module、Logic/action 和相关 service 文件
- 每个文件带 evidence：loaded-module、source-map、runtime-target、reflection-manifest、ast-match、user-action
- 给出 confidence，而不是伪造唯一答案

### Boundary

SourceMap 是定位证据，不是业务 owner authority。AST 是语义索引，不是 runtime truth。

### Trial Candidate

第一版只做：

- loaded module capture
- SourceMap resolve
- live target join
- `Module.make("<moduleId>")` 轻量匹配

AST semantic graph 放到第二阶段。

## Direction C - Agent Work Session Index

### Pain

当功能是 Agent 自己刚写的，Agent 已经知道改了哪些文件。此时再用 AST/SourceMap 反查是绕路。更缺的是把“改动、验证、证据、结论”结构化留存。

### Core Feature

记录一次 Agent work session：

- changed files
- declared intent
- related live targets
- commands and runIds
- produced artifacts
- failed checks and fixes
- final proof commands
- unresolved follow-ups

### Killer Feature

Change Evidence Bundle：

- 自动生成本次改动的证据包
- 后续 Agent 可以直接查询“这个模块上次为什么改、用什么命令验证、关联了哪个 route/target”
- 为 code review、debug、regression replay 提供最短上下文

### Boundary

work session 是开发过程 evidence，不是源码语义 truth。它可以辅助 source-chain 和 compare，但不能替代 check/trial/live artifact。

### Trial Candidate

从 CLI 输出和 git diff 生成 session summary，先不依赖 browser。

## Direction D - Runtime-Centered Session Recording

### Pain

QA 报告常常只有自然语言、截图或录屏。开发和 Agent 难以稳定复现，尤其是涉及 route、弹窗、异步加载和 runtime state 的问题。

### Core Feature

以 Logix runtime 时间轴为中心录制：

- route / url / viewport
- host user events，如 click、input、navigation、modal open
- live target and attachment
- action tag and payload summary
- state digest and selected state path snapshots
- runtime event / structured gap / failure
- console and bounded stack source refs
- optional screenshots/video

### Killer Feature

QA Evidence Replay：

- QA 点击右下角按钮或浏览器插件开始录制
- 导出 evidence package 给开发
- 开发把包交给 Agent，Agent 自动生成复现步骤、定位责任层并生成候选 regression test
- 支持 host replay 和 runtime replay 双层降级

### Boundary

录制包是 evidence input，不是 runtime truth。它可以进入 compare、trial scenario 或 host harness，不能直接铸造 verification verdict。

### Trial Candidate

dev-only floating recorder：

- Start / Stop / Export Evidence
- light mode 默认记录 route、user event、action tag、state digest、failure screenshot
- 后续再接 Chrome extension 与 daemon SQLite

## Direction E - Local Semantic Memory

### Pain

每次 Agent 接手陌生代码都要重新 grep、打开文件、跑命令。成功调试路径不能自动复用。

### Core Feature

daemon 侧持久化本地语义索引：

- runtime target to source refs
- route to module chain
- action manifest to source symbol
- source digest to evidence artifacts
- command history and runId lineage
- QA session package index

### Killer Feature

Ask The Local Runtime Memory：

- “这个 route 相关文件有哪些？”
- “上次这个 target 为什么失败？”
- “哪个测试最能复现这个 action？”
- “这个 source digest 对应哪些 evidence artifact？”
- “这个 runtime target 最近有哪些 state/action timeline？”

### Boundary

SQLite 更适合放 daemon 侧。Chrome extension 和 UI 面板只读消费 daemon query API，避免把 storage authority 分裂到浏览器 lifecycle。

### Trial Candidate

先持久化 artifact metadata、target、source digest 和 command history，再扩展 AST/source-chain 索引。

## Cross-Cutting Constraints

- 任何 live observation 都默认是 drilldown/evidence input，不直接成为 `runtime.check` 或 `runtime.trial(mode="startup")` verdict。
- CLI、daemon、browser adapter、Chrome extension 不能成为 fact authority。
- source map、AST、loaded module、work session、QA recording 都必须带 evidence reason 和 confidence。
- 需要明确 budget、redaction、retention、cache invalidation 和 source digest。
- Mutation-capable replay 必须经过 admission，失败是 `operation.denied` 且 no mutation。
- raw trace、full video、large state snapshot 只能作为 opt-in full/debug mode，不能成为默认比较面。

## Candidate Capability Map

| Direction | Primary Pain | First Killer Feature | Best Owner | First Trial |
| --- | --- | --- | --- | --- |
| Daemon queue/history | 高频 live 查询干扰 runtime | Agent Task Console | daemon/control plane | queue metadata + task history |
| Runtime target to source chain | 只知道 route，不知道源码链路 | Open Route, Find Source | daemon + browser capture | SourceMap + live target join |
| Agent work session index | Agent 已知改动但证据散落 | Change Evidence Bundle | CLI/control plane | git diff + runId + commands |
| Runtime-centered session recording | QA 难复现 | QA Evidence Replay | live bridge + evidence | dev-only recorder |
| Local semantic memory | 跨 session 重复探索 | Ask Local Runtime Memory | daemon storage | artifact/target/source index |

## Open Questions

- 哪个方向最先进入 spec：daemon queue、source chain、work session index、session recording，还是 semantic memory？
- evidence package 的最小 schema 是否应复用现有 canonical evidence envelope，还是先作为 repo-internal extension artifact？
- Chrome extension 是第一批 UI 消费者，还是先由 Playground/DVTools panel 消费？
- SourceMap resolver 是否只支持 Vite dev，还是一开始就考虑 production sourcemap？
- AST semantic index 是否直接基于 TypeScript compiler API，还是先用轻量 symbol extraction？

## Suggested Decomposition

不建议一次做成平台。建议拆成五个可独立验证的 spec：

1. daemon queue and task history
2. route/runtime source-chain capture
3. agent work session evidence bundle
4. runtime-centered QA recording and replay package
5. daemon local semantic memory

每个 spec 都必须定义：

- owner
- machine output
- evidence boundary
- retention/redaction
- source digest or runtime target coordinate
- minimal proof command

## Non-Goals For This Proposal

- 不裁决 Chrome extension 是否必须做。
- 不定义最终 SQLite schema。
- 不新增 public authoring API。
- 不把 live bridge observation 升级成 verification verdict。
- 不承诺 AST/SourceMap 是所有路径的默认主线。

