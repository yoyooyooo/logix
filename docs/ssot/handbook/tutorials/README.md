---
title: 教程索引（面向开发者）
status: draft
version: 1
---

# 教程索引（面向开发者）

> **定位**：这里放“尽可能详细、面向开发者”的教程/剧本集（用于新成员上手、老成员回味）。  
> **边界**：教程解释 how/why，但不是裁决来源；协议/不变量/边界仍以 `docs/ssot/platform/**` 与 `docs/ssot/runtime/**` 为准。

## 放置规则（避免 handbook 继续变杂）

- **教程（长文）**：放在 `docs/ssot/handbook/tutorials/**`
  - 目标：从 0→1 把一条核心链路讲透（含具体剧本、常见坑、代码锚点、验证方式）。
- **索引/小抄/导航**：继续放在 `docs/ssot/handbook/*.md`（例如 long-chain 索引、codebase-playbook、auggie-playbook）。
- **裁决性内容**：禁止只写在教程里；必须同步到 SSoT（`docs/ssot/platform/**` / `docs/ssot/runtime/**`），教程只引用它们。

## 文件命名与结构约定（建议强约束）

- 文件名使用两位序号前缀：`NN-<kebab>.md`，便于按学习路径排序（例如 `01-xxx.md`）。
- 每篇教程建议固定结构（可裁剪）：
  - `0. 最短阅读路径`（让读者 10 分钟先上手）
  - `1. 心智模型`（统一术语与边界）
  - `2. 核心链路（从 0 到 1）`（主线叙述）
  - `3. 剧本集（用例驱动）`（CI/平台/Devtools/排障/演进）
  - `4. 代码锚点（Code Anchors）`（可点击路径）
  - `5. 验证方式（Evidence）`（命令/测试/最小复现）
  - `6. 常见坑（Anti-patterns）`（避免“知道但忘了”）

## 推荐阅读路径（新成员）

1. `01-digest-diff-anchors.md`：digest/diff/anchors 的统一心智模型与剧本集
2. `02-runtime-lifecycle-and-scope.md`：Runtime 生命周期与 Scope：boot/run/close、timeouts、常驻任务为何不会“自然结束”
3. `03-transactions-and-tick-reference-frame.md`：事务窗口与参考系：tickSeq/txnSeq/opSeq、事务窗口、external store tick
4. `04-observability-evidence-replay.md`：观测/证据/回放：DebugSink → DevtoolsHub/EvidenceCollector → EvidencePackage → ReplayLog
5. `05-sandbox-runtime-alignment-lab.md`：Sandbox / Alignment Lab：编译/运行/Mock、IR pipeline、RunResult grounding
6. `06-root-ir-and-codegen-pipeline.md`：平台 Root IR 与出码：Recipe → Canonical AST → Workflow Static IR → ControlSurfaceManifest → codegen/rewrite
7. `07-module-graph-and-collaboration.md`：模块图谱与协作：Module/Logic/Bound/Link、strict imports、cross-module contracts
8. `08-effectop-pipeline-and-platform-bridge.md`：EffectOp Pipeline 与 Platform Bridge：指令即数据、middleware stack、Slim 事件与平台注入
9. `09-state-trait-readquery-closure.md`：约束闭包（C_T）：dirty-set/readsDigest → converge(in txn window) → selectorGraph（增量订阅与跨模块闭包）
10. `10-runtime-make-and-composition-root.md`：Runtime 组合根与装配闭环：ModuleImpl → Root Provider → Runtime.make（wiring 错误可解释）
11. `11-react-runtime-store-no-tearing.md`：React 集成：RuntimeStore/tickSeq/no-tearing（topic facade + 订阅分片 + perf 门禁）
12. `12-process-and-scheduling.md`：Process / Link / Scheduling：长期进程、触发/并发/错误策略、事务窗口边界与可解释链路
13. `13-fieldpath-dirtyset-rowid.md`：FieldPath / DirtySet / Patch Recording / RowId：状态证据的最小完备集（id-first + 稳定 reason + list 稳定身份）
14. `14-platform-parser-rewriter-anchors.md`：平台跑道：Anchors / Parser / Rewriter / 最小补丁回写（Platform-Grade 子集 + 单一真相源）
15. `15-perf-evidence-and-diagnostics-budgets.md`：性能证据闭环：PerfReport / PerfDiff / perf matrix / comparability / 诊断成本门控
16. `16-reflection-manifest-and-trial-run.md`：Reflection / Manifest / TrialRun：把 runtime 暴露给平台/CI 的方式（Loader Pattern）
17. `17-testing-and-fixtures.md`：测试与可运行教程：@effect/vitest / deterministic scheduler / fixture 设计
18. `18-env-layer-injection-and-overrides.md`：Env/Layer 注入与 override 陷阱：build-time capture、root singletons、分层 patch
19. `19-concurrency-batching-txn-lanes.md`：并发与批处理：txn lanes / concurrency policy / scheduling budget
20. `20-source-and-externalstore-boundaries.md`：Source / ExternalStore / Module-as-Source：边界绑定能力的终态写法
21. `21-readquery-selectors-topics.md`：ReadQuery / SelectorGraph / Topics：选择器的稳定性、成本与可解释性
22. `22-source-query-replay-keyhash.md`：Source 深水区：keyHash gating / replay / query engine 接线
23. `23-declarative-link-ir-execution.md`：DeclarativeLink：跨模块链路的 IR、执行与诊断
24. `24-runtime-store-topics-no-tearing.md`：RuntimeStore / RuntimeExternalStore：no-tearing 的工程闭环
25. `25-diagnostics-slim-events-explainability.md`：诊断协议：Slim 事件、预算与“可解释链路”
26. `26-debugsink-event-model-and-projection.md`：DebugSink 事件模型：Event → RuntimeDebugEventRef → 投影/降级
27. `27-devtoolshub-snapshot-and-subscription.md`：DevtoolsHub：SnapshotToken、RingBuffer 与 no-tearing 订阅
28. `28-evidence-collector-and-trialrun.md`：EvidenceCollector 与 TrialRun：把“结构 + 动态证据”做成构建产物
29. `29-replaylog-and-replayeventref.md`：ReplayLog / ReplayEventRef：把动态链路变成“可重放输入”
30. `30-stable-identities-and-determinism.md`：稳定标识与去随机化：instanceId/tickSeq/txnSeq/opSeq/eventSeq/stepKey
31. `31-ir-versioning-and-migrations.md`：IR 版本化与迁移（forward-only）：如何“敢破坏”但不失控
32. `32-transaction-window-no-io.md`：事务窗口禁止 IO：runWithStateTransaction / TaskRunner guard / multi-entry 模式
33. `33-static-governance-and-contract-gates.md`：Static Governance：Trait Provenance / 冲突门禁 / 可解释快照
34. `34-surface-manifests-and-impact-analysis.md`：Manifest 家族：ModuleManifest / ManifestDiff / 预算裁剪 / 影响面分析
35. `35-anchors-stepkey-and-rewriter-safety.md`：Anchors / stepKey：稳定锚点协议与保守回写（最小 diff）
36. `36-parser-rewriter-correctness-roadmap.md`：Parser / Rewriter：Platform-Grade 子集与正确性路线图
37. `37-flowprogram-vs-workflow-naming.md`：FlowProgram vs Workflow：命名收敛、分层边界与 forward-only 改名路线
38. `38-speckit-spec-driven-workflow.md`：SpecKit：spec→plan→tasks→implement→acceptance 的可交接闭环
39. `39-logix-core-layering-and-dependency-topology.md`：logix-core 分层：src/*.ts 与 internal/** 的依赖拓扑铁律
40. `40-effect-v3-patterns-in-logix.md`：Effect v3：Tag/Layer/Scope/错误通道在本仓的标准姿势
41. `41-error-model-cause-and-diagnostics.md`：错误语义：Cause / SerializableErrorSummary / 诊断投影
42. `42-testing-strategy-determinism-and-fixtures.md`：测试策略：确定性、Fixtures 与“证据不漂”
43. `43-perf-evidence-framework-deep-dive.md`：性能证据框架：PerfReport/PerfDiff/perf matrix 的可比性门禁
44. `44-sandbox-universal-spy-and-semantic-mock.md`：Sandbox：Universal Spy / Semantic UI Mock / Alignment
45. `45-playground-as-executable-spec.md`：Playground-as-Executable-Spec：把教程变成可运行的合同

---

## 后续教程 Backlog（大纲草案）

> 说明：这些是“我现在能想到的、值得写成长文教程”的主题清单，用于排期与占位；顺序可随后续裁决调整。  
> 约定：这里先只写文件名（代码样式）+ 大纲要点，避免产生断链。

（目前 01–45 已覆盖“横切核心链路”，但后续仍建议按两条主线继续长出来：）

### A) 教程可执行化（优先级最高）

- **把每篇教程绑定一个可跑剧本**：Scenario（固定输入）→ RunResult → EvidencePackage/IR → 最小对齐断言（把文字变成合同）。
- **首个样板**：以 `examples/logix-sandbox-mvp` 的 IR Page 跑道为基线，把 `01/04/05/06/14/15/16/34` 这些“链路总览型教程”先各落一条可跑脚本/页面入口。
- **产物约定**：每条剧本至少导出（或能在 UI 里查看）`manifest.digest/staticIr.digest/evidence.summary`，并能指回锚点（moduleId/stepKey/pointer）。

### B) 垂直切片教程（面向业务/Feature Kits 上手）

- `@logixjs/form`：Form API → RulesManifest → Trait/validate/writeback → 性能/诊断门禁（含典型表单场景剧本）。
- `@logixjs/query`：Query 统一形态、缓存/去重/回放、与 Source/ReadQuery 的边界（含关键错误语义与证据链）。
- Router/i18n/domain：各自的“最小可用组合根 + 典型业务剧本 + 与 Root IR/Devtools 的对齐点”。

### C) 平台工作流剧本（面向平台维护者）

- Parser/Autofill/WriteBack 一条龙：AnchorIndex → PatchPlan → 最小回写 → 对齐报告（含 Raw Mode 降级链路）。
- CI 门禁剧本：ManifestDiff / KernelContract / FullCutoverGate / perf evidence（把合同变成自动化门禁）。
