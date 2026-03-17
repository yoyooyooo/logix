# 2026-03-21 · R-2 Gate-A/B trigger scout（docs/evidence-only）

> 后续状态更新（2026-03-22 同日）：`R2-U` 已补齐 dated design package。当前仍缺 `SLA-R2-*` 与 `Gap-R2-*` 工件，见 `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`。

> worktree: `v4-perf.r2-gate-ab-trigger-scout`  
> branch: `agent/v4-perf-r2-gate-ab-trigger-scout`  
> 范围：只落盘 Gate-A/B 的触发口径与“触发后如何开实施线”的可执行流程。  
> 约束：只改 `docs/perf/**` 与 `specs/103-effect-v4-forward-cutover/perf/**`，不进入 `packages/**`。

## 0. 前提与锚点

前提：`R-2 Gate-C` 已通过独立稳定性复核，本轮只关注 `R-2 Gate-A/B`。

证据锚点：
- current-head triage：`docs/perf/06-current-head-triage.md`
- routing 真相源：`docs/perf/07-optimization-backlog-and-routing.md`
- proposal 主口径：`docs/perf/2026-03-20-r2-public-api-proposal.md`
- staging 执行口径：`docs/perf/2026-03-21-r2-public-api-staging-plan.md`
- Gate-C 复核工件：`specs/103-effect-v4-forward-cutover/perf/2026-03-21-r2-gate-c-stability-recheck.probe-next-blocker.r1.json` ~ `r7.json`

本文的输出目标：
1. 什么样的产品级 SLA 足以触发 `Gate-A`。
2. 什么样的内部解释缺口足以触发 `Gate-B`。
3. 一旦 `Gate-A/B` 同时成立，实施线应如何起，如何做单提交收口。

## 1. Gate-A 触发：产品级 SLA 的最低形态

`Gate-A` 的判定对象是“可引用、可落地、可验证”的产品级 SLA。触发需要同时满足以下条件。

### A1. SLA 必须有权威锚点

满足任一即可：
- 平台 SSoT 内存在明确条目与可引用的 stable id。
- 产品 PRD 或对外承诺文档存在 stable id，并明确“由 Runtime policy 负责满足”。

若只有口头目标或临时聊天结论，不判定为可引用 SLA。

### A2. SLA 必须量化并可复测

SLA 需要明确以下字段，缺一则不触发：
- 用户路径：哪类交互或哪条典型流程。
- 指标定义：至少包含一个 percentile 指标，示例 `p95` 或 `p99`，同时给出预算值与单位。
- 采样口径：测量锚点至少要能映射到 native-anchor 分段，避免把页面外注入税与页面内 runtime 税混成一团。
- 负载条件：至少给出关键维度的取值范围，示例 `watchers/steps` 或等价 proxy。

### A3. SLA 必须明确要求“策略语义可配置”

触发 `R-2` 的 SLA 需要显式要求“策略语义按场景可切换”，并满足至少一条：
- 要求把页面外 admission 或 automation 调度窗口纳入正式预算，并把其影响以策略语义向上层暴露，见 `docs/perf/archive/2026-03/2026-03-06-s10-txn-lanes-native-anchor.md` 的 reopen 条件口径。
- 要求对外提供多档策略供业务切换，且档位语义需要进入文档、诊断事件与 SLA 讨论的共同术语，见 `docs/perf/archive/2026-03/2026-03-19-r2-policy-surface-design.md` 的“旋钮集合语义”痛点。

若 SLA 只要求“更快”或“再优化一点”，不触发。

### A4. SLA 必须解释为何需要 public surface

SLA 需要明确一句“为什么必须对外可配置”，满足任一即可：
- 同一产品内存在至少两类互斥场景，需要不同策略语义，且不能靠单一默认值覆盖。
- 需要把“策略选择”交给业务侧按场景决策，并要求可追溯到诊断事件里。

该解释用于阻止“内部 widening 先做做看”的无目标开线。

### Gate-A 合格的 SLA 模板

只要以下模板被填写并具备权威锚点，`Gate-A` 可判定成立：

```md
## SLA-R2-<id>

- owner: <product or platform owner>
- scope: <user journey>
- metric:
  - <metric name>.<p95|p99> <= <budgetMs>ms
- measurement_anchor:
  - <native capture -> handler -> domStable> 或等价分段
- load:
  - watchers: <range or fixed>
  - steps: <range or fixed>
- policy_requirement:
  - need multi-tier semantic selection: <yes>
  - need module overrides: <yes/no>
- why_public_surface:
  - <one sentence>
```

## 2. Gate-B 触发：内部解释缺口的最低形态

`Gate-B` 的判定对象是“解释链路无法承接 `Gate-A` 的 SLA”，并且该缺口指向策略语义层，不是测量噪声与环境问题。

触发需要同时满足以下条件。

### B1. 缺口必须与 `Gate-A` 的 SLA 直接相关

缺口证据需要明确回答两个问题：
- 给定该 SLA，当前控制面能否表达“按场景选择策略语义”。
- 给定该 SLA，当前诊断事件能否回答“为什么这次选择了该策略，以及最终谁生效”。

若缺口证据只描述现有 suite 噪声，或只描述 `edge_gate_noise`，不触发。

### B2. 缺口必须落在“解释与口径”层

以下任一成立即可作为缺口类型，但证据必须可复述且可落盘：
- 现有 `trace:txn-lane` 事件即便满足 `R2-B diagnostics contract` 的问答集，依旧无法把 SLA 的关键语义映射到稳定字段，导致排障只能引用内部实现细节。
- 现有内部 widening 只能扩字段或扩 scope，无法避免对外反复改口，且改口成本可被量化，示例“同类问题复盘反复解释不同版本的旋钮组合语义”。
- 现有对外配置仍以旋钮集合为主语义，无法形成可复用的档位术语，导致同一 SLA 在文档、诊断、配置三处出现多套说法。

对齐基线：
- `R2-B diagnostics contract` 的问答集与字段契约：`docs/perf/archive/2026-03/2026-03-20-r2b-diagnostics-contract.md`
- proposal 对 `tier/resolvedBy/effective` 统一口径的约束：`docs/perf/2026-03-20-r2-public-api-proposal.md`

### B3. 缺口必须排除 environment 与已知 gate noise

缺口证据需要满足：
- `probe_next_blocker` 结果不为 `failure_kind=environment`。
- 若涉及 `probe_next_blocker` 的 `blocked`，阻塞点需要与 `TxnLanePolicy` 的策略语义相关。
- 若阻塞点仍是 `externalStore.ingest.tickNotify / full/off<=1.25`，该样本只能作为 Gate-C 的可比性素材，不计入 Gate-B。

### Gate-B 合格的缺口证据模板

只要以下模板被填写并落盘到 `specs/103-effect-v4-forward-cutover/perf/**`，`Gate-B` 可判定成立：

```md
## Gap-R2-<id>

- related_sla: <SLA-R2-id>
- symptom:
  - <what cannot be explained today>
- why_existing_widening_insufficient:
  - <one sentence>
- evidence:
  - <probe json / perf diff / trace export file>
- exclusion:
  - environment: <passed>
  - edge_gate_noise: <not this case>
- decision:
  - require public semantic tier: <yes>
```

## 3. Gate-A/B 成立后的实施线启动流程

`R-2` 属于架构与 public surface 升级，默认不开线。`Gate-A` 与 `Gate-B` 同时成立后，按以下步骤启动实施线，流程以“单提交收口”为硬门。

### 3.1 先完成 Gate-E 开线裁决

在进入任何实现前，先按模板落盘一次开线裁决，并显式写出 `override=是`：
- 模板：`docs/perf/09-worktree-open-decision-template.md`
- 触发器类型：`new SLA + internal explanation gap`
- Evidence 必须包含：
  - `Gate-A` 的 SLA 锚点引用
  - `Gate-B` 的 Gap-R2 工件引用
  - 最新一次 `python3 fabfile.py probe_next_blocker --json` 的输出文件或摘要

### 3.2 冻结实施线的最小交付物

实施线必须同一提交内完成以下三类交付物：
- 实现：`TxnLanePolicy` public surface 与内部 resolver 的一致性收敛，同时保持 `trace:txn-lane` 口径与字段 Slim 且可序列化。
- 证据：至少一份可复测的 `probe_next_blocker --json` 输出工件，外加与 SLA 相关的 targeted 或 strict diff 工件。
- 文档：回写 proposal 与 staging 的交叉引用核对，并更新 `06/07/README` 的 watchlist 状态。

### 3.3 新 worktree 的固定参数

开线时建议固定以下参数，减少口径漂移：
- Base branch: `v4-perf`
- Success gate: 相对 base 只保留 1 个最终 HEAD commit
- Verify commands: 以 `docs/perf/2026-03-20-r2-public-api-proposal.md` 的最小验证链路为基线，外加 `python3 fabfile.py probe_next_blocker --json`

### 3.4 失败门与收口方式

任何一条成立则按 docs/evidence-only 收口并停止实现：
- `probe_next_blocker` 退化为 `failure_kind=environment`。
- 证据显示主要问题仍在 `edge_gate_noise`，无法与 SLA 建立相关性。
- 诊断事件出现 downgrade，或 payload 体积明显膨胀，破坏“诊断事件 Slim”不变量。

## 4. 本轮结论（2026-03-21）

- Gate-A：未触发，当前没有新的可引用产品级 SLA。
- Gate-B：未触发，当前缺口证据不足以证明“仅靠 widening 无法承接 SLA 解释”。
- 下一步：维持 `R-2` watchlist，只在出现 `SLA-R2-*` 与 `Gap-R2-*` 工件后重评，并按 `09` 完成开线裁决再进入实现线。
