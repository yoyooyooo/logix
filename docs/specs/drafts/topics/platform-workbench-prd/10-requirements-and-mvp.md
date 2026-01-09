---
title: 10 · 需求分解与 MVP（Platform Workbench PRD）
status: draft
version: 2025-12-19
value: core
priority: now
related:
  - ./00-overview.md
  - ../sdd-platform/05-intent-pipeline.md
  - ../sdd-platform/09-user-value-routes.md
  - ../sdd-platform/11-spec-to-code-mvp.md
  - ../intent-studio-ux/00-overview.md
  - ../../../sdd-platform/workbench/20-intent-rule-and-ux-planning.md
  - ../../../docs/ssot/platform/roadmap-logix-platform.md
  - ../sandbox-runtime/35-playground-product-view.md
---

# 10 · 需求分解与 MVP（Platform Workbench PRD）

## 1. 北极星（平台侧）

在一个真实业务仓库中，平台需要跑通并可回放一条闭环：

> **Intent（需求/交互/约束） → Blueprint/IntentRule → Code（Logix/Effect） → Run（Sandbox/Runtime） → Alignment（诊断与回流）**

其中关键不在“能生成代码”，而在于：

- 能持续演进（版本化、审计、回放、治理）；
- 能解释（把运行行为映射回 Spec/Rule/Code 的锚点）；
- 能协作（人类与 Agent 都能在同一事实源上工作）。

## 1.1 与 SDD 生命周期 / Intent Pipeline 的对齐（上游裁决映射）

平台侧的“需求/交互/系统设计”必须直接映射到 SDD 四阶段与 Intent Pipeline 的 Stage 0–3，避免产生第二套规划语言：

| SDD Phase | Intent Pipeline | Workbench 主落点 | 关键产物（平台资产） |
| --- | --- | --- | --- |
| SPECIFY | Stage 0 · Raw Requirement | Live Spec（Feature/Scenario） | FeatureSpec / ScenarioSpec / Step（稳定 blockId/stepId） |
| PLAN | Stage 1–2 · Domain→Schema | Blueprint / Rules / Module 图纸 | Blueprint（Screen/Module/Service 占位）、IntentRuleSet、ModuleIntent（含 traits/fields） |
| TASKS | Stage 3 · Logic Generation | Tasks（可选）/ Dev Server | Task（原子化变更单）、Context Pack、AST Patch（可审阅） |
| IMPLEMENT |（运行与回流） | Playground / Runs / Reports | RunResult / AlignmentReport / Diagnostics（可解释锚点） |

对应的产品“纵向承诺”请以 `../sdd-platform/09-user-value-routes.md` 为准；本 Topic 只负责把这些承诺拆到可交付的页面原型与系统契约。

## 2. 角色（Personas）与核心任务（JTBD）

### 2.1 PM / 业务负责人

- 把需求结构化为可验证的 Spec（Feature/Scenario）
- 通过场景运行判断“是否满足需求”，而不是读代码
- 在失败时拿到“可复述、可交接”的诊断与修复建议

### 2.2 架构师 / Tech Lead

- 把 Spec 拆解为模块边界、依赖拓扑与规则骨架（IntentRule / Blueprint）
- 对跨模块联动、循环依赖、竞态风险做治理
- 定义 Pattern/模板资产，减少业务侧重复实现

### 2.3 业务开发者

- 在可解析子集内写出可维护的 Logix/Effect 代码（便于平台理解与可视化）
- 快速定位“哪条规则/哪一步导致跑偏”，并迭代到对齐

### 2.4 QA / 测试

- 维护场景集与回归运行
- 把失败定位到“Spec/Rule/Code/Runtime”哪个层级的问题

### 2.5 解决方案/实施

- 用 Blueprint/Pattern 快速搭可运行原型，少写代码、多复用

### 2.6 AI Agent（平台内置）

- 在每个阶段承担“结构化转换 + patch 生成 + 自愈迭代”的职责
- 必须受限于平台给出的 Context Pack 与可解析子集约束

## 3. 三条主用户旅程（必须端到端跑通）

> 下面每条旅程都要求：产物可版本化、可回放、可解释。

### Journey A：从需求到第一次“绿灯”

1. PM 创建 `FeatureSpec`，补齐 2–5 条 `ScenarioSpec`
2. 架构师/Agent 从 Spec 生成 Blueprint（模块/页面/规则占位）
3. 平台生成最小代码骨架（或生成 IntentRule + 给开发落点）
4. 在 Playground 执行场景，得到 `RunResult + AlignmentReport`
5. 迭代直到“关键场景绿灯”

### Journey B：从失败场景到定位与修复

1. 选择一个失败 Scenario（红灯）
2. 通过 Trace/Rule/StateDiff 定位到“哪条规则/哪段代码/哪个服务 mock”导致偏差
3. 生成修复 patch（开发或 Agent）
4. 再跑场景验证，生成新的对齐报告（版本化留痕）

### Journey C：从现有代码反向显影

1. Dev Server 解析现有代码中的 Fluent 白盒子集，生成 IntentRule 投影
2. 在 Rule Explorer / Galaxy（后续）中呈现，并允许有限编辑
3. 反向把变更生成 AST patch 回写代码，保证双向同步不走样

## 4. MVP 分期（按“闭环能力”拆）

### 样板场景（固定竖切基线）

所有 MVP 分期默认以 `../sdd-platform/11-spec-to-code-mvp.md` 的 RegionSelector 竖切为可运行样板：

- 目的：保证“Spec→Code→Run→Report”的闭环不是纸面推演；
- 策略：先用单场景压实数据模型与锚点，再扩到多模块/多场景。

### MVP‑0：单场景 Playground（Runner 基线）

目标：证明 Sandbox/Runner 可用、观测可用（不追求完整平台形态）。

- 参考：`../sandbox-runtime/35-playground-product-view.md`
- 验收：能在受控环境运行一个场景，看到 State/Logs/Trace，并可恢复（重跑/重置）

### MVP‑1：Spec + Scenario 的最小闭环（Specify → Implement → Run）

目标：PM 能在平台上写“可运行的场景”，并看到绿/红结果。

- 产物：
  - Feature/Scenario 的最小数据模型（版本化）
  - Scenario Step 列表（可编辑/可复用）
  - RunResult 存档与回放
- 验收：
  - 任何一次 run 都能关联到 `scenarioId + revisionId`
  - run 失败能生成最小诊断摘要（错误 + 关键 stateDiff）

### MVP‑2：IntentRule Explorer（Plan → Code 的最小链路）

目标：用“规则表”而不是“画布”先打通平台→出码路径（符合 v3 交互原则）。

- 产物：
  - IntentRule 表格编辑（source/pipeline/sink）
  - 生成标准 Fluent 写法（可解析子集）并回写到仓库
  - 基础静态治理：循环依赖、同一路径多源写入提示（至少 warning）
- 验收：
  - 修改规则后生成代码，Parser 能再解析回等价 IntentRule（结构不漂移）

### MVP‑3：Project/Module 拓扑（Universe）与治理信号

目标：把“跨模块协作”变成一等能力，而不是仅靠开发记忆。

- 产物：
  - Module/依赖拓扑（从代码/IR 聚合）
  - 基础治理信号：循环依赖、跨域联动过多、未建模依赖等
- 验收：
  - 任何一个规则/运行 trace 都能跳回“所属模块/页面/场景”的上下文

### MVP‑4：AI Orchestration（可控的 Agent 管线）

目标：让 Agent 成为“受限的虚拟工程师”，而不是 Chatbot。

- 产物：
  - Context Pack 模板（Spec/Rule/Code/Trace 的最小特权注入）
  - 任务拆解与执行回传（带审计）
- 验收：
  - Agent 的每次变更都有：输入上下文、输出 patch、验证结果、失败原因

## 5. 非功能性需求（NFR / 约束）

> 这些约束不一定都在 MVP‑0/1 一次性实现，但必须在设计阶段就“可落地、可验证”，否则后续会返工。

### 5.1 安全与可控性（默认）

- 平台不自动执行破坏性 git 操作；任何写入都必须以“可审阅的补丁”呈现给用户。
- Dev Server/Agent 的上下文必须最小特权：不注入无关文件、不上传 secrets。
- Sandbox/Worker 必须支持“硬重置”（terminate & restart），避免死循环拖垮 UI。

### 5.2 可解释性（默认）

- 任意“自动生成/自动修复”都必须带可解释锚点：
  - Spec：blockId / scenarioId / stepId
  - Plan：ruleId / traitPath（如适用）
  - Code：file/span/contentHash
  - Runtime：runId/txnSeq/opSeq/spanId
- 对齐报告（AlignmentReport）必须满足“可行动性”：能指向可改的位置（规则/代码/Mock/Spec）。

### 5.3 交互效率（PM/高频用户）

IntentRule/决策表形态默认“键盘优先”，并具备：

- 快速录入：复制粘贴、批量填充、智能联想（字段/动作/策略）
- 实时校验：冲突/循环/遗漏的即时提示（算法优先，AI 只做建议）

> 交互风格对齐：`../intent-studio-ux/00-overview.md`。

## 6. 关键指标（用来衡量平台是否“变强”）

- `time_to_first_green`：从创建 Feature 到首个关键 Scenario 绿灯的耗时
- `scenario_pass_rate`：场景通过率（按版本/分支）
- `parsable_coverage`：代码中落在可解析子集内的规则比例（白盒覆盖率）
- `alignment_actionability`：对齐报告的可行动性（是否能定位到 ruleId/file/handler）
- `iteration_cost`：一次失败到修复再验证的平均迭代成本（时间/操作数）
