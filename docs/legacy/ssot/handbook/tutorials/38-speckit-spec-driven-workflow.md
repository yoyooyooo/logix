---
title: SpecKit 教程 · spec→plan→tasks→implement→acceptance 的可交接闭环（从 0 到 1）
status: draft
version: 1
---

# SpecKit 教程 · spec→plan→tasks→implement→acceptance 的可交接闭环（从 0 到 1）

> **定位**：本文把本仓的 Spec-Driven Development（SpecKit）当成“工程闭环工具”来讲：它不是写文档的仪式，而是把关键裁决落到可执行产物里，避免代码/规范漂移。  
> **裁决来源**：SpecKit 的阶段路由与产物结构以 `.codex/skills/speckit/SKILL.md` 与 `.specify/*` 为准；本文负责给新成员一条“从 0 到 1 的使用路线 + 剧本集”。

## 0. 最短阅读路径（10 分钟上手）

1. 读 `.codex/skills/speckit/SKILL.md` 的「什么时候触发 / 什么时候保持沉默」：理解 speckit 是“裁决回写器”。  
2. 读 `docs/ssot/handbook/cheatsheets/project-architecture.md`：理解哪些裁决写进 SSoT，哪些写进 specs。  
3. 读任意一个已成形的 spec 目录结构（例如 `specs/075-workflow-codegen-ir/`）：对齐 `spec.md/plan.md/tasks.md/contracts/*` 的落点。

## 1. 心智模型（为什么要有 speckit）

### 1.1 speckit 的核心价值：把“对话中的裁决”变成“可执行真相源”

没有 speckit 的世界，最常见的漂移是：

- 你在对话里改了约束，但 SSoT 没改；  
- 你在 plan 里定了落点，但 tasks 没拆；  
- 你实现了代码，但 acceptance 没覆盖 coded points；  
- 下一位维护者只看到代码，不知道“为什么这样做”。

speckit 的目标是把这条链路收口：

`spec.md`（需求/验收） → `plan.md`（方案/落点/质量门） → `tasks.md`（可执行任务） → 实现 → `acceptance`（逐条覆盖）

### 1.2 三类真相源的分工（避免 handbook/SSoT/specs 混写）

强建议在脑中保持三分法：

1. **SSoT（裁决层）**：`docs/ssot/platform/**`、`docs/ssot/runtime/**`  
   - 放不变量、协议、术语、边界（MUST）。  
2. **specs（交付层）**：`specs/<NNN-*>/**`  
   - 放一个可交付特性的 spec/plan/tasks/contracts/migration。  
3. **handbook（教程层）**：`docs/ssot/handbook/**`  
   - 放“如何理解/如何实现/如何排障”的长文教程（不做最终裁决）。

speckit 主要写的是第 2 类（specs），并在必要时提醒你回写第 1 类（SSoT）。

## 2. 核心链路（从 0 到 1：阶段路由与产物落点）

### 2.1 `$speckit <stage> <feature> ...`：路由器的基本用法

入口：

- `.codex/skills/speckit/SKILL.md`

最重要的约定：

- **只有当用户做了“影响产物的决定/变更”时才触发**。  
- 纯解释/头脑风暴不回写（避免无意义 churn）。  

feature 选择建议：

- 把 feature id 放在 `<stage>` 后第一个 token：`$speckit plan 075 ...`  
- 或用 `SPECIFY_FEATURE=075` 显式覆盖（避免误选“最新 spec”）。

### 2.2 产物结构（spec 目录最小集合）

以 `specs/<NNN-*>/` 为单位，一般包含：

- `spec.md`：需求、验收（FR/NFR/SC）、用户故事、边界条件  
- `plan.md`：实现方案、落点目录、Constitution Check（性能/诊断/IR/迁移）  
- `tasks.md`：任务分解与勾选  
- `contracts/*`：协议/Schema/迁移说明（forward-only）  
- （可选）`review.md`、`research.md`、`quickstart.md`

这一结构也在 `docs/ssot/handbook/cheatsheets/project-architecture.md` 有导航说明。

### 2.3 acceptance 阶段的关键：按编码点覆盖（不是“我觉得差不多了”）

speckit 提供了“抽取编码点”的只读脚本（无需盲搜）：

- `.codex/skills/speckit/scripts/bash/extract-coded-points.sh`（从 spec.md 提取 FR/NFR/SC）  
- `.codex/skills/speckit/scripts/bash/extract-tasks.sh`（从 tasks.md 提取任务与完成状态）

正确的 acceptance 心智模型：

- 逐条覆盖编码点：每条 FR/NFR/SC 都要有对应的实现证据或明确未覆盖原因。  
- 证据优先是：测试/类型检查/可复现的运行路径/诊断事件与 perf baseline。  

## 3. 剧本集（你会遇到的真实场景）

### 3.1 剧本 A：我有一个新想法，怎么从 0 建一个 spec 并避免漂移

推荐顺序：

1. `$speckit specify <id>`：把需求写进 `spec.md`（先有验收再谈实现）。  
2. `$speckit plan <id>`：把落点目录/质量门/迁移策略写进 `plan.md`（尤其 Constitution Check）。  
3. `$speckit tasks <id>`：拆任务并标注优先级/依赖，形成可执行队列。  
4. `$speckit implement <id>`：进入实现，并在实现过程中持续勾 tasks（避免“实现完才想起 tasks”）。  

### 3.2 剧本 B：实现卡住了，发现 spec 里有歧义/缺边界怎么办

正确动作：回到 `clarify`（而不是在代码里“自行脑补”）。

- `$speckit clarify <id> ...`：把歧义、决策点、缺失边界回写到 `spec.md`。  
- 如果涉及术语/协议层裁决：同步更新 `docs/ssot/platform/**` 或 `docs/ssot/runtime/**`（避免 specs 成为并行真相源）。

### 3.3 剧本 C：需要外部审查（review），如何回灌到计划与任务

speckit 支持两种回灌：

- 你已有 `review.md`：用 `plan-from-review` 消化到 plan/tasks。  
- 你只有问题清单：用 `plan-from-questions` 把问题转成需要补齐的计划/任务。

关键原则：

- review 的价值在于“让计划更可执行/更可验收”，不是生成另一份漂移文档。

### 3.4 剧本 D：并行开发安全（仓库里有未提交改动）

仓库约束（见 AGENTS）要求：

- 不要为了“diff 干净”去丢改动（禁止 restore/clean/stash/reset）。  
- speckit 的脚本默认不做 VCS 操作（不会自动 commit）。  

因此在多人/多 worktree 并行时，speckit 更像“写入 specs 事实源”的工具，不是分支管理工具。

## 4. 代码锚点（Code Anchors）

1. `.codex/skills/speckit/SKILL.md`：阶段路由与触发规则（权威）。  
2. `.codex/skills/speckit/references/*.md`：各 stage 的阶段提示词（权威）。  
3. `.codex/skills/speckit/scripts/bash/*.sh`：只读抽取脚本与 setup 脚本（产物生成/检查）。  
4. `.specify/memory/constitution.md`：宪法/硬约束（裁决优先级）。  
5. `specs/<NNN-*>/spec.md`、`specs/<NNN-*>/plan.md`、`specs/<NNN-*>/tasks.md`：每个特性单元的可执行事实源。  

## 5. 验证方式（Evidence）

对 speckit 工作流本身，最小验证是“产物一致性”：

- `plan.md` 的落点目录与 tasks 的实现落点一致（不漂移）。  
- `acceptance` 覆盖了 spec 的 FR/NFR/SC（逐条）。  
- 若引入 breaking：必须有 `contracts/migration.md`（forward-only，无兼容层）。  

## 6. 常见坑（Anti-patterns）

- 只写 spec 不写 plan：实现必然跑偏，后续难以验收。  
- plan 写了但 tasks 不拆：执行变成“拍脑袋”，无法并行/无法交接。  
- acceptance 只写结论不写证据：下一位维护者无法复现/无法对齐。  
- specs 里写了裁决性术语但 SSoT 没同步：形成并行真相源。  
