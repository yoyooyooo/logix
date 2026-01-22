---
title: handbook 导航摘要（project-guide）
status: living
version: 1
---

# handbook 导航摘要（project-guide）

> **定位**：当 `SKILL.md` 不够用时，从这里按需加载更长的参考文档（避免把细节塞回 SKILL）。

## 0) TL;DR（先开哪一个）

- Runtime SSoT 导览：`docs/ssot/runtime/README.md`
- 仓库示例场景索引：`cheatsheets/examples-logix-index.md`
- 源码入口压缩包：`cheatsheets/codebase-playbook.md`
- 教程索引（面向开发者）：`tutorials/README.md`
- Digest/Diff/Anchors 教程（剧本集）：`tutorials/01-digest-diff-anchors.md`
- Runtime 生命周期与 Scope 教程（剧本集）：`tutorials/02-runtime-lifecycle-and-scope.md`
- 事务窗口与 Tick 参考系 教程（剧本集）：`tutorials/03-transactions-and-tick-reference-frame.md`
- 观测 / 证据 / 回放 教程（剧本集）：`tutorials/04-observability-evidence-replay.md`
- Sandbox / Runtime Alignment Lab 教程（剧本集）：`tutorials/05-sandbox-runtime-alignment-lab.md`
- 平台 Root IR 与出码流水线 教程（剧本集）：`tutorials/06-root-ir-and-codegen-pipeline.md`
- 模块图谱与跨模块协作 教程（剧本集）：`tutorials/07-module-graph-and-collaboration.md`
- EffectOp Pipeline 与 Platform Bridge 教程（剧本集）：`tutorials/08-effectop-pipeline-and-platform-bridge.md`
- StateTrait / ReadQuery / DeclarativeLink 约束闭包 教程（剧本集）：`tutorials/09-state-trait-readquery-closure.md`
- Runtime 组合根与装配闭环 教程（剧本集）：`tutorials/10-runtime-make-and-composition-root.md`
- React 集成：RuntimeStore/tickSeq/no-tearing 教程（剧本集）：`tutorials/11-react-runtime-store-no-tearing.md`
- Process / Link / Scheduling 教程（剧本集）：`tutorials/12-process-and-scheduling.md`
- FieldPath / DirtySet / Patch Recording / RowId 教程（剧本集）：`tutorials/13-fieldpath-dirtyset-rowid.md`
- 平台跑道：Anchors / Parser / Rewriter / 最小补丁回写 教程（剧本集）：`tutorials/14-platform-parser-rewriter-anchors.md`
- 性能证据闭环：PerfReport / PerfDiff / perf matrix / comparability / 诊断成本门控 教程（剧本集）：`tutorials/15-perf-evidence-and-diagnostics-budgets.md`
- Reflection / Manifest / TrialRun：把 runtime 暴露给平台/CI 的方式 教程（剧本集）：`tutorials/16-reflection-manifest-and-trial-run.md`
- 测试与可运行教程：@effect/vitest / deterministic scheduler / fixture 设计 教程（剧本集）：`tutorials/17-testing-and-fixtures.md`
- Env/Layer 注入与 override 陷阱：build-time capture、root singletons、分层 patch 教程（剧本集）：`tutorials/18-env-layer-injection-and-overrides.md`
- 并发与批处理：txn lanes / concurrency policy / scheduling budget 教程（剧本集）：`tutorials/19-concurrency-batching-txn-lanes.md`
- Source / ExternalStore / Module-as-Source：边界绑定能力的终态写法 教程（剧本集）：`tutorials/20-source-and-externalstore-boundaries.md`
- ReadQuery / SelectorGraph / Topics：选择器的稳定性、成本与可解释性 教程（剧本集）：`tutorials/21-readquery-selectors-topics.md`
- Source 深水区：keyHash gating / replay / query engine 接线 教程（剧本集）：`tutorials/22-source-query-replay-keyhash.md`
- DeclarativeLink：跨模块链路的 IR、执行与诊断 教程（剧本集）：`tutorials/23-declarative-link-ir-execution.md`
- RuntimeStore / RuntimeExternalStore：no-tearing 的工程闭环 教程（剧本集）：`tutorials/24-runtime-store-topics-no-tearing.md`
- 诊断协议：Slim 事件、预算与“可解释链路” 教程（剧本集）：`tutorials/25-diagnostics-slim-events-explainability.md`
- DebugSink 事件模型：Event → RuntimeDebugEventRef → 投影/降级 教程（剧本集）：`tutorials/26-debugsink-event-model-and-projection.md`
- DevtoolsHub：SnapshotToken、RingBuffer 与 no-tearing 订阅 教程（剧本集）：`tutorials/27-devtoolshub-snapshot-and-subscription.md`
- EvidenceCollector 与 TrialRun：把“结构 + 动态证据”做成构建产物 教程（剧本集）：`tutorials/28-evidence-collector-and-trialrun.md`
- ReplayLog / ReplayEventRef：把动态链路变成“可重放输入” 教程（剧本集）：`tutorials/29-replaylog-and-replayeventref.md`
- 稳定标识与去随机化：instanceId/tickSeq/txnSeq/opSeq/eventSeq/stepKey 教程（剧本集）：`tutorials/30-stable-identities-and-determinism.md`
- IR 版本化与迁移（forward-only）：如何“敢破坏”但不失控 教程（剧本集）：`tutorials/31-ir-versioning-and-migrations.md`
- 事务窗口禁止 IO：runWithStateTransaction / TaskRunner guard / multi-entry 模式 教程（剧本集）：`tutorials/32-transaction-window-no-io.md`
- Static Governance：Trait Provenance / 冲突门禁 / 可解释快照 教程（剧本集）：`tutorials/33-static-governance-and-contract-gates.md`
- Manifest 家族：ModuleManifest / ManifestDiff / 预算裁剪 / 影响面分析 教程（剧本集）：`tutorials/34-surface-manifests-and-impact-analysis.md`
- Anchors / stepKey：稳定锚点协议与保守回写（最小 diff）教程（剧本集）：`tutorials/35-anchors-stepkey-and-rewriter-safety.md`
- Parser / Rewriter：Platform-Grade 子集与正确性路线图 教程（剧本集）：`tutorials/36-parser-rewriter-correctness-roadmap.md`
- FlowProgram vs Workflow：命名收敛、分层边界与 forward-only 改名路线 教程（剧本集）：`tutorials/37-flowprogram-vs-workflow-naming.md`
- SpecKit：spec→plan→tasks→implement→acceptance 的可交接闭环 教程（剧本集）：`tutorials/38-speckit-spec-driven-workflow.md`
- logix-core 分层：src/*.ts 与 internal/** 的依赖拓扑铁律 教程（剧本集）：`tutorials/39-logix-core-layering-and-dependency-topology.md`
- Effect v3：Tag/Layer/Scope/错误通道在本仓的标准姿势 教程（剧本集）：`tutorials/40-effect-v3-patterns-in-logix.md`
- 错误语义：Cause / SerializableErrorSummary / 诊断投影 教程（剧本集）：`tutorials/41-error-model-cause-and-diagnostics.md`
- 测试策略：确定性、Fixtures 与“证据不漂” 教程（剧本集）：`tutorials/42-testing-strategy-determinism-and-fixtures.md`
- 性能证据框架：PerfReport/PerfDiff/perf matrix 的可比性门禁 教程（剧本集）：`tutorials/43-perf-evidence-framework-deep-dive.md`
- Sandbox：Universal Spy / Semantic UI Mock / Alignment 教程（剧本集）：`tutorials/44-sandbox-universal-spy-and-semantic-mock.md`
- Playground-as-Executable-Spec：把教程变成可运行的合同 教程（剧本集）：`tutorials/45-playground-as-executable-spec.md`
- auggie 检索模板：`cheatsheets/auggie-playbook.md`
- 质量门与验证：`playbooks/quality-gates.md`
- 排错清单：`playbooks/troubleshooting.md`
- 长链路总索引（A–K）：`cheatsheets/long-chain/long-chain-index.md` → `cheatsheets/long-chain/long-chain-cheatsheet.md` → `reading-room/long-chain/*`

分层入口（按用途挑一个）：

- Cheatsheets（小抄/导航/速查）：`cheatsheets/README.md`
- Playbooks（流程/排障/质量门）：`playbooks/README.md`
- Reading Room（背景/原理/评审/实现备忘）：`reading-room/README.md`

## 1) 导航与索引

- 仓库目录地图与落点裁决：`cheatsheets/project-architecture.md`
- Public Submodules 与导入约定：`cheatsheets/public-submodules.md`
- 子包用法速查（用户视角）：`cheatsheets/packages-user-view/README.md`

## 2) 长链路（A–K）

- 索引：`cheatsheets/long-chain/long-chain-index.md`
- 小抄：`cheatsheets/long-chain/long-chain-cheatsheet.md`
- A 数据面：`reading-room/long-chain/long-chain-a-data-plane.md`
- B 执行面：`reading-room/long-chain/long-chain-b-execution-plane.md`
- C 模块图谱：`reading-room/long-chain/long-chain-c-module-graph-plane.md`
- D 副作用总线：`reading-room/long-chain/long-chain-d-effect-plane.md`
- E/F/G 观测/证据/回放：`reading-room/long-chain/long-chain-efg-observability-evidence-replay.md`
- H 宿主生命周期：`reading-room/long-chain/long-chain-h-program-runner.md`
- I Sandbox / Alignment Lab：`reading-room/long-chain/long-chain-i-sandbox-alignment-lab.md`
- J 测试面：`reading-room/long-chain/long-chain-j-test-plane.md`
- K 业务能力包：`reading-room/long-chain/long-chain-k-feature-kits.md`

## 3) 诊断与性能

- 最小基线闭环：`playbooks/diagnostics-perf-baseline.md`
- 事故复盘：`reading-room/incidents/incident-I-001-async-fiber-exception.md`
