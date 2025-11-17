---
description: 为 speckit 的单个 feature 做外部 Review，但只输出“问题清单”（不生成 review.md），用于后续 `$speckit plan-from-questions` 回灌到 plan/spec/tasks。
---

# Workflow: speckit review-questions（外部提问式审查）→ Questions List

对齐声明：本 workflow 的“回灌落点与处理方式”以 `.codex/skills/speckit/references/plan-from-questions.md` 为准；若不一致，以 speckit 体系为准（避免漂移）。

目标：站在“提问者/审查者”的视角，对 `specs/<feature>/` 下的 `spec.md` + `plan.md` 做一次外部审查，但**不产出建议列表/实现方案/`review.md`**；只产出一份高质量的“问题清单”，让规划维护者（或后续 speckit 会话）用这些问题逼出关键裁决，并回写到正确的产物中。

## 0) 输入与定位（支持直接输入编号）

支持的输入（用户给你其一即可）：
- `042` / `042-xxx`
- `specs/042-xxx`
- 或直接粘贴：`spec.md`、`plan.md`（至少要有这两个）

定位规则：
- 若输入是编号或前缀（如 `042`），在 `specs/` 下寻找匹配目录（例如 `specs/042-react-runtime-boot-dx`）。
- 若命中多个候选，停止并让用户明确选择。
- 若你无法读取仓库文件：停止并要求用户粘贴 `spec.md` 与 `plan.md` 的完整内容（或至少关键章节）。

## 1) 读取上下文（仅提问，不做实现）

优先读取（不存在则标注 Missing，不要猜）：
- 必读：
  - `spec.md`
  - `plan.md`
  - `.specify/memory/constitution.md`
- 选读（存在则读；不存在不阻塞）：
  - `tasks.md`（如果已生成）
  - `research.md`、`data-model.md`
  - `contracts/*`（仅当 plan/spec 声称有对外契约，或你需要审查 API/协议/版本化）

约束：
- 你只输出“问题清单”，不要输出实现代码、不要跑命令、不要指导用户做 Git 操作。
- 默认使用简体中文（除非用户明确要求英文）。

## 2) 提问范围（按 speckit 产物边界对齐）

你的问题必须落到以下三类之一（否则视为低质量问题）：

1) `spec.md`（WHAT/WHY）：需求范围、验收口径、成功指标、边界条件、错误语义、角色与流程、NFR（性能/可诊断性/安全等）。
2) `plan.md`（HOW）：架构裁决、落点目录、关键不变量、质量门/证据、迁移策略、风险缓解、对齐 SSoT。
3) `tasks.md`（Task List）：可执行拆分、依赖/顺序、验证步骤、与 plan/spec 的一致性。

提醒：`tasks.md` 是任务清单唯一落点；不要把“任务列表”塞回 `plan.md`。

## 3) 问题生成规则（强约束）

- 只输出 **8–12 个**问题（除非 spec/plan 极短：可降到 5 个；但必须说明原因）。
- 优先级从高到低排序：`BLOCKER`（不答会卡住）→ `MAJOR`（不答会高风险返工）→ `MINOR`（锦上添花）。
- 每个问题必须同时满足：
  - **可回答**：要求回答者给出明确裁决（不是泛泛而谈）。
  - **可回写**：回答后能明确写进 `spec.md` 或 `plan.md`（或变成 `tasks.md` 任务）。
  - **低成本**：优先多选（2–5 项）或“≤10 字短答”，避免开放式长文。
- 避免“正确但无用”的问题（如“这个方案有没有风险？”）。

## 4) 高优先级检查点（不会问到这里就说明你漏了）

如果改动涉及 Logix Runtime 核心路径/诊断协议/对外 API，你的问题必须覆盖（按需）：
- 性能证据：是否有可复现 baseline、测量口径与预算（off/light/full 诊断成本）？
- 可诊断性：诊断事件是否 Slim 且可序列化？Devtools 的可解释链路是否明确？
- 统一最小 IR：是否引入并行真相源/锚点漂移点？
- 稳定标识：`instanceId/txnSeq/opSeq` 等是否稳定、去随机化？
- 事务窗口：是否禁止 IO/async？是否有“事务外”边界与验证方式？
- 破坏性变更：是否有迁移说明（以迁移文档替代兼容层）？

如果不涉及上述内容，你需要显式标注 “N/A（原因：…）”，并把问题转向该特性的核心风险点。

## 5) 输出契约（必须遵守，便于直接回灌）

只输出一个“问题清单”，按下面格式逐行输出（建议一行一个问题，方便直接粘贴到 speckit）：

```text
Q001 [BLOCKER] [Target: plan.md] [Location: plan.md#Constitution Check] 问题：... — 目的：... — 期望回答：A/B/C（选一）
Q002 [MAJOR]  [Target: spec.md] [Location: spec.md#Non-Functional Requirements] 问题：... — 目的：... — 期望回答：≤10 字
...
```

字段约束：
- `Qxxx`：从 `Q001` 开始递增。
- `Target`：必须是 `spec.md` / `plan.md` / `tasks.md` / `data-model.md` / `contracts/*` 之一。
- `Location`：用“文件#章节标题”表达即可（不要求行号）。

## 6) 交付与下一步

在问题清单末尾追加一行（固定文案）：

```text
Next: 把以上问题清单粘贴回 speckit 会话，执行：$speckit plan-from-questions <feature-id> <paste>
```
