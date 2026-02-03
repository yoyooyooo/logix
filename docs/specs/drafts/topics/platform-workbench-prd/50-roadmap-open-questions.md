---
title: 50 · 路线图与待决问题（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./10-requirements-and-mvp.md
  - docs/ssot/platform/governance/10-roadmap.md
  - ../sdd-platform/11-spec-to-code-mvp.md
  - ../sandbox-runtime/60-vision-runtime-alignment-lab.md
---

# 50 · 路线图与待决问题（Platform Workbench PRD）

## 1. 路线图（把“闭环”拆成可交付件）

### 1.1 近期（对齐 MVP‑1/2）

- Spec/Scenario 的版本化存储 + 回放入口
- Playground 深链（scenarioRevisionId → run → report）
- IntentRule Explorer（规则表）+ 生成标准 Fluent 代码 + 再解析校验
- 最小诊断：失败摘要（error + stateDiff + trace root）

### 1.2 中期（对齐 MVP‑3/4）

- Universe（模块拓扑）与治理信号
- 规则触发统计（ruleId ↔ trace/span ↔ run）
- Agent Orchestration：Spec → Plan → Tasks → Patch → Run 的可控管线（带审计）

## 2. 待决问题（需要尽快拍板/收敛）

### 2.1 SSoT 归属：哪些“事实”存云端、哪些以代码为真？

- Feature/Scenario/RuleSet 作为平台资产，是否允许与代码分离版本演进？
- 规则/代码锚点的稳定性如何保证（人类改代码后如何处理漂移）？

### 2.2 Type Projection / 解析能力部署位置

- Type Projection/Parser 在云端（headless）还是本地 Dev Server（hybrid）？
- 两种模式如何保持同一份“可解析子集”裁决（避免分叉）？

### 2.3 协作与权限模型（MVP 也要有最小形态）

- 谁能 sign‑off？sign‑off 的对象是 Feature/Scenario/RuleSet 还是 Run/Report？
- 多人同时编辑同一资产时的冲突策略（append‑only + explicit diff 足够吗？）

### 2.4 对齐报告（AlignmentReport）的最小“可行动性”定义

- 最小必须包含哪些字段才算“可行动”：ruleId/file/span/intentId/stateDiff？
- 失败时输出给 AI 的 Context Pack 需要哪些最小字段？

### 2.5 从“规则表”升级到“画布”（Galaxy）的门槛

- 哪些场景必须上画布？哪些永远用表格/配置更好？
- Gray/Raw 节点在画布上的交互语义是什么（只读？可折叠？可跳转？）

### 2.6 IntentRule 与 StateTraitGraph 的关系（统一最小 IR）

- 平台是否接受“两套静态 IR”：IntentRule（规则）+ StateTraitGraph（字段依赖）？
- 统一最小 IR 的“SSoT 形态”是什么：一个大 IR（包含 rule/trait 两类节点）还是保持两类 IR 但共享 Anchors/Trace？
- 动态证据（EffectOp/Trace）如何同时映射到 ruleId 与 traitPath（若两者同时存在）？

### 2.7 校验引擎的部署与口径一致性

- 硬校验（冲突/循环/非法写入）放在 Studio、本地 Dev Server、还是 Backend？
- 如何保证多端同口径（版本化的校验规则/策略）而不分叉？
- SAT Solver（或图算法）的输入输出契约如何版本化并可复现？

### 2.8 Run/Report 的“可回放性”定义

- RunResult 是否要求 determinism（同一版本同一输入得到同一输出）？不满足时如何记录“不确定性来源”（随机数/时间/并发）？
- `stateSnapshot` vs `stateDiff` 的取舍：对 PM/QA/AI 的可解释性与存储成本如何平衡？

### 2.9 Dev Server Patch 的标准格式

- 平台与 Dev Server 之间的 `FilePatch` 是统一 diff、结构化 edits、还是 AST Patch？
- Patch 的最小“可审阅性”要求是什么（human readable preview / file‑level summary）？

### 2.10 Live Spec / Scenario 的稳定标识与漂移口径

- `blockId/stepId/intentId` 的生成与稳定性规则是什么（复制/移动/拆分/合并时是否复用或派生新 id）？
- 评论线程绑定 Anchor 的“孤儿策略”是什么（实体删除/重命名后，thread 保留但需要 re-anchor 吗）？
- ScenarioBlock 的 pin/latest/evidence 三段状态灯口径如何定义（见 `23-live-spec-and-scenario-editor.md`）？
- 与 Sandbox 协议的映射口径是否统一：`UI_INTENT.meta.storyId/stepId` 到底承载 `scenarioId` 还是 `featureId`？

## 3. 回写点（稳定后要沉淀到 SSoT 的位置）

当本 Topic 的某些结论稳定后，建议按以下落点回写，避免 drafts 与 SSoT 漂移：

- `docs/specs/sdd-platform/workbench/20-intent-rule-and-ux-planning.md`：Workbench 的信息架构增补（Live Spec / Pipeline / Intent Studio / Playground 的关系）
- `docs/specs/sdd-platform/impl/README.md`：Dev Server 协议面、diagnostics/anchors 的最小形状（不绑定实现细节）
- `docs/specs/sdd-platform/impl/intent-rule-and-codegen.md`：Rule Grid → IntentRule → Fluent 白盒子集 的映射（若收敛出稳定的 GridRow 形状）
- `docs/ssot/runtime/logix-sandbox/15-protocol-and-schema.md`：RunConfig/RunResult 与 scenarioRevisionId/ruleId/stepId 的锚点对齐要求
- `docs/specs/drafts/topics/sandbox-runtime/30-intent-coverage-and-ai-feedback.md`：AlignmentReport/覆盖率/AI Context Pack 的最小结构（保持 Slim + 可序列化）
- `docs/specs/sdd-platform/workbench/05-intent-pipeline.md`：Pipeline 视图的 UI 形态与 traceability 约束（若收敛出明确模板）
- `docs/ssot/platform/assets/00-assets-and-schemas.md`：资产层级的 `derivedFrom/anchors` 约束（若确定为平台通用机制）

## 4. 下一步行动（建议顺序）

1. 以 MVP‑1 为目标，把 Feature/Scenario/Run/Report 的最小数据模型写成可实现的 Schema（对齐 `31-data-model-and-contracts.md`）。
2. 以 MVP‑2 为目标，把 Rule Explorer 的“白盒子集编辑 → 生成代码 → 再解析校验”跑通一次端到端 PoC（以 RegionSelector 或一个最小例子为基线）。
3. 收敛协议面：Dev Server WS 的请求/响应与事件模型先定下来（对齐 `40-protocols-and-apis.md`）。
