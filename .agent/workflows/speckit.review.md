---
description: 为 speckit 的单个 feature 产出可回灌的 review.md（对应 speckit `review-plan`，用于后续 `$speckit plan-from-review` 消化）
---

# Workflow: speckit review-plan（外部审查）→ `review.md`

对齐声明：本 workflow 的输出契约与条目结构以 `.codex/skills/speckit/references/review-plan.md` 为准；若两者不一致，以 speckit 体系内的 `review-plan` 为准（避免漂移）。

目标：对 `specs/<feature>/` 下的规格与计划做一次“外部审查”，输出结构化 `review.md`，让后续会话可以通过 `$speckit plan-from-review` 逐条消化并回灌到 `plan.md`（必要时同步 `tasks.md`/`spec.md`/`data-model.md`/`contracts/*`）。

## 0. 输入与定位（支持直接输入编号）

- 支持的输入（用户给你其一即可）：
  - `042` / `042-xxx`
  - `specs/042-xxx`
- 定位规则：
  - 若输入是编号或前缀（如 `042`），在 `specs/` 下寻找匹配目录（例如 `specs/042-react-runtime-boot-dx`）。
  - 若命中多个候选，停止并让用户明确选择。
  - 若无法定位，停止并让用户提供 `specs/<feature>/` 的完整路径或粘贴文件内容。

## 1. 读取上下文（仅做审查，不做实现）

在目标目录下读取（不存在则标注为 Missing，不要猜）：

- 必读：
  - `spec.md`
  - `plan.md`
  - `.specify/memory/constitution.md`
- 选读（存在则读；不存在不阻塞）：
  - `tasks.md`（如果已生成）
  - `review.md`（若已存在，说明这是第 N 次审查：请在新报告里显式写清“覆盖/替代关系”）
  - `research.md`、`data-model.md`
  - `contracts/*`（仅当 plan/spec 声称有对外契约，或你需要审查 API/协议）

说明：
- 如果你具备代码库读取能力，可以抽样核对 `plan.md` 引用到的真实路径/符号是否存在；如果不具备，必须把“未验证”写进报告的 Assumptions。
- 你只输出审查结论与可执行修改建议；不要输出实现代码、不要执行任何 Git/系统命令。

## 2. 审查维度（按 speckit 产物边界对齐）

你需要覆盖下面这些问题（可按重要性排序；不相关的标注 N/A）：

1) **Spec ↔ Plan 对齐**
- `plan.md` 是否忠实实现 `spec.md`（有没有漏掉 FR/NFR/SC、成功标准、边界条件、错误语义）？
- 是否出现“plan 里新增了 spec 未声明的行为/范围”（Scope creep）？

2) **Constitution / 质量门**
- `plan.md` 的 Constitution Check 是否完整、可执行、且无明显违例？
- 若涉及 Logix Runtime 核心路径/诊断协议/对外 API：是否给出可复现的性能基线/测量与诊断成本口径？

3) **任务与落点一致性（tasks.md 是任务清单的唯一落点）**
- 如果 `tasks.md` 已存在：任务是否可执行（路径明确、依赖顺序/并行标记合理、验收/验证步骤清晰）？
- 如果 `tasks.md` 不存在：不要在 `plan.md` 里“凭空塞一份 Phase 2 tasks”；改为在报告里要求后续运行 `$speckit tasks`，或在 `review.md` 里列出“需要补进 tasks.md 的任务建议”。

4) **风险识别（以可落地的 Mitigation 为准）**
- 性能回退风险、诊断不可用/成本不可控风险、破坏性变更与迁移缺失、IR/锚点漂移、标识不稳定（随机/时间默认）、事务窗口 IO、可写 SubscriptionRef 等。
- 每个风险必须给出明确缓解措施（落到哪个文件/哪个章节、怎么验证）。

## 3. `review.md` 输出契约（必须遵守）

产出一个完整的 `review.md`（Markdown 文档），用于保存到 `specs/<feature>/review.md`。默认用**简体中文**（除非用户明确要求英文）。

要求：
- 必须包含可被 “plan-from-review 消化” 的结构化条目（见模板）。
- 必须把建议分流到正确的落点：`spec.md` / `plan.md` / `tasks.md` / `data-model.md` / `contracts/*`。
- 必须区分严重度：`BLOCKER` / `MAJOR` / `MINOR`。
- 必须给出“验证方式/验收标准”（否则视为不可执行建议）。
- 不要让建议停留在抽象口号（例如“提高可维护性”）；要具体到改哪里、改成什么、如何验证。

模板（直接照抄并填写）：

```markdown
# Review Report: [FEATURE_ID - Feature Name]

**Status**: [REQUEST_CHANGES / APPROVED_WITH_SUGGESTIONS / APPROVED]
**Digest**: PENDING
**Reviewer**: [name]
**Date**: YYYY-MM-DD

## 0. Assumptions

- [If any, e.g. “No codebase access; referenced paths not verified.”]

## 1. 执行摘要 (Executive Summary)

- 一句话裁决：[…]
- Top 3 issues（若有）：[…]

## 2. 必须修改 (Blockers)

> 只列会阻塞进入实现/拆任务的点

- R001 [BLOCKER] [Target: plan.md] [Location: plan.md#…] 问题：… 建议：… 验收：…
- R002 [BLOCKER] [Target: spec.md] [Location: spec.md#…] 问题：… 建议：… 验收：…

## 3. 风险与建议 (Risks & Recommendations)

- R101 [MAJOR] [Risk] … 缓解：… 验证：…
- R102 [MINOR] [Suggestion] … 验证：…

## 4. 技术分析 (Technical Analysis)

- 架构合理性：…
- 与仓库既有约定对齐点/偏离点：…
- 可实施性与复杂度：…

## 5. 宪法与质量门检查 (Constitution Check)

- 性能与可诊断性：PASS/CONCERN/N/A — 证据：… 下一步：…
- IR/锚点漂移风险：PASS/CONCERN/N/A — …
- 稳定标识（instanceId/txnSeq/opSeq）：PASS/CONCERN/N/A — …
- 事务窗口（禁止 IO）：PASS/CONCERN/N/A — …
- 破坏性变更与迁移说明：PASS/CONCERN/N/A — …
- （如涉及 packages/*）public submodules / internal 分层：PASS/CONCERN/N/A — …

## 6. 覆盖与漂移 (Coverage & Drift)

- 未覆盖的 FR/NFR/SC（只列缺口）：…
- plan ↔ tasks（如存在 tasks.md）的漂移点：…

## 7. Next Actions

- 把本文件保存为 `specs/<feature>/review.md`。
- 回到 speckit 会话，执行：`$speckit plan-from-review <feature-id>`（必要时再跑 `$speckit tasks` 刷新任务清单）。
```

## 4. 完成标准

- 你已生成满足上述模板的 `review.md` 内容（或已写入目标目录下的 `review.md`）。
- 你在回复末尾给出：`review.md` 路径 + 推荐下一步命令（通常是 `$speckit plan-from-review <id>`）。
