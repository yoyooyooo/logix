# Docs Alignment Stages Implementation Plan

> **For agentic workers:** Default to lead-only execution with `.context/` kept current. When execution environment allows委派且文件集合可独立拆分时，可选启用 `@long-running-subagent-harness`、`@subagent-mode-router` 与 `superpowers:subagent-driven-development`。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为下一轮 docs 收敛建立一份可执行、可分波次推进、可由 subagent 接棒的阶段计划，避免新 docs 根骨架再次出现路由漂移与真相源分叉。

**Architecture:** 先收紧根路由和治理协议，再按 runtime core cluster 与 boundary cluster 两个文档包推进，最后把未决项稳定沉淀到 `docs/next/` 或 `docs/proposals/`，并回写根入口与 standards。每一波都保持 lead 持有全局真相，worker 只产出 finding，reviewer 只做只读质量门与判定，正文落盘仍由 lead 或被授权 worker 负责。

**Tech Stack:** Markdown、仓库内 `docs/**`、`.context/**` harness、`rg`、`sed`、只读 `git diff`/`git status`

## Harness Relation

- `.context/**` 是外层控制面，负责 spec、task board、progress、decisions、findings、eval 与 handoff。
- 本文档是内层执行合同，负责定义 docs 规划的 chunk、task、文件范围、验证门与 reopen 条件。
- 当前阶段先用 harness 把本文档收口到可执行状态。
- 后续若开始实际 docs 落盘，默认继续沿用同一套 harness 推进本文档，不切成脱离 `.context/**` 的孤立执行。

---

## Chunk 1: Root Routing And Governance

### Task 1: 收紧 docs 根入口与 README 网格

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/ssot/README.md`
- Modify: `docs/adr/README.md`
- Modify: `docs/standards/README.md`
- Modify: `docs/ssot/runtime/README.md`
- Modify: `docs/ssot/platform/README.md`
- Review Context: `.context/findings/docs-route-audit.md`

- [ ] **Step 1: 先跑根路由盘点命令，确认当前 README 网格缺口**

Run:

```bash
rg -n 'docs/(proposals|ssot|adr|standards|next|archive)|\]\(' docs/README.md docs/proposals/README.md docs/ssot/README.md docs/adr/README.md docs/standards/README.md docs/next/README.md docs/ssot/runtime/README.md docs/ssot/platform/README.md
```

Expected:
- 输出每个根 README 的现有路由与链接
- 能看出哪些入口缺少“相关裁决 / 推荐来源 / 升格路径 / 关联子树”说明

- [ ] **Step 2: 先读 worker finding，并把根入口改成统一信息架构**

写入要求：

```md
## 当前入口
- 子目录链接

## 相关裁决 / 相关规范
- 指向 ADR / standards / SSoT 的最短路径
```

Expected:
- 根 README 与根索引页的导航结构趋于一致
- 根 README 能把人导到正确子树
- `docs/README.md` 保持导航入口角色，`docs/standards/docs-governance.md` 保持路由与写入规则权威角色

- [ ] **Step 3: 把 runtime / platform 根 README 补成可执行导航**

补写重点：

```md
## 当前优先入口
- 哪几个页面先读

## 相关裁决
- 指向当前 charter / standards

## 导航说明
- 新事实默认去哪收口
- 旧树只作背景
- 直链到 `docs/standards/docs-governance.md`
- 若存在待升格沉淀，直链到 `docs/next/README.md`
```

Expected:
- `docs/ssot/runtime/README.md`
- `docs/ssot/platform/README.md`
- 二者都能自解释“先看哪里、再写哪里”
- runtime/platform 根 README 都能直达治理页，runtime 根 README 还能直达 next 入口

- [ ] **Step 4: 复跑路由检查，确认 README 网格已收口**

Run:

```bash
rg -n '当前入口|当前优先入口|相关裁决|相关规范|导航说明' docs/README.md docs/ssot/README.md docs/adr/README.md docs/standards/README.md docs/ssot/runtime/README.md docs/ssot/platform/README.md
```

Expected:
- 每个目标 README 都含有本任务要求的路由段落

- [ ] **Step 5: 如用户要求提交，按 README 网格粒度提交**

Run:

```bash
git status --short docs/README.md docs/ssot/README.md docs/adr/README.md docs/standards/README.md docs/ssot/runtime/README.md docs/ssot/platform/README.md
```

Expected:
- 只看到本任务涉及的 README 变更
- 未获用户明确要求前，不执行 commit

### Task 2: 收紧 docs governance 与升格规则

**Files:**
- Modify: `docs/standards/docs-governance.md`
- Modify: `docs/proposals/README.md`
- Modify: `docs/next/README.md`
- Review Context: `.context/findings/docs-route-audit.md`

- [ ] **Step 1: 先验证 governance 当前只覆盖路由，尚未覆盖升格与回写闭环**

Run:

```bash
rg -n '默认写入顺序|proposal|next|ssot|adr|standards|archive|升格|回写|交叉引用' docs/standards/docs-governance.md docs/README.md docs/proposals/README.md docs/next/README.md
```

Expected:
- 能看到现有写入顺序
- 看不到完整的升格门槛、回写动作、根入口回刷规则

- [ ] **Step 2: 在 governance 中补一段固定执行协议**

建议新增骨架：

```md
## 单一权威
- `docs/standards/docs-governance.md` 负责路由与写入规则
- `docs/README.md` 只负责导航，不重复定义执行细则

## 升格门槛
- 什么时候从 proposal/next 进入 ssot/adr/standards

## 回写动作
- 修改事实源正文
- 回刷对应 README 索引
- 补相关 ADR / standards / next 链接

## 禁止事项
- 不在 archive 增量维护
- 不让 proposal 长期代替事实源
```

Expected:
- `docs/standards/docs-governance.md` 从“目录规则”升级成“执行规则”
- 根 README 与 governance 的职责分层固定

- [ ] **Step 3: 在 proposal README 与 next README 上补回 governance 的落点**

写入要点：

```md
- proposal 被采纳后回写到哪里
- next 什么时候升格
- 路由细则统一回指 `docs/standards/docs-governance.md`
```

Expected:
- `docs/proposals/README.md`、`docs/next/README.md` 读完后可以直接知道升级路径

- [ ] **Step 4: 用只读命令验证“proposal 不冒充事实源，next 不悬空”**

Run:

```bash
rg -n '不作为事实源|升格|回写|默认写入顺序|archive' docs/standards/docs-governance.md docs/proposals/README.md docs/next/README.md
```

Expected:
- 3 个文件都能对齐“proposal / next / ssot / adr / standards”的角色

- [ ] **Step 5: 加一轮语义门，确认角色边界与单一权威真实成立**

人工判定清单：

```md
- 单一权威门：`docs/README.md` 只做导航，并回指 `docs/standards/docs-governance.md`
- 角色边界门：proposal / next / ssot / adr / standards 都写清进入条件与回写动作
- cross-link 门：proposal README、next README 至少具备“来源规则 / 当前去向 / 升格后动作”
```

Expected:
- 不靠关键词堆叠也能判定治理页是否真正可执行

- [ ] **Step 6: 如用户要求提交，按 governance 粒度提交**

Run:

```bash
git status --short docs/standards/docs-governance.md docs/proposals/README.md docs/next/README.md
```

Expected:
- 只看到本任务目标文件
- 未获用户明确要求前，不执行 commit

## Chunk 2: Runtime Core Cluster

### Task 3: 收口 runtime core spine 文档包

**Files:**
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/02-hot-path-direction.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify: `docs/ssot/runtime/05-logic-composition-and-override.md`
- Reopen after Task 1: `docs/ssot/runtime/README.md` only when 01-05 改变默认优先入口，且只允许更新“当前优先入口”条目与对应链接顺序
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/standards/effect-v4-baseline.md`
- Modify: `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- Modify: `docs/adr/2026-04-04-logix-api-next-charter.md`

- [ ] **Step 1: 先跑术语一致性检查，找出 core pack 里必须统一的主链词**

Run:

```bash
rg -n 'Effect V4|Module|Logic|Program|Runtime|RuntimeProvider|Program.make|Runtime.make|runtime\\.check|runtime\\.trial|runtime\\.compare|process|logics: \\[\\]' docs/ssot/runtime/01-public-api-spine.md docs/ssot/runtime/02-hot-path-direction.md docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md docs/ssot/runtime/05-logic-composition-and-override.md docs/standards/logix-api-next-guardrails.md docs/standards/effect-v4-baseline.md docs/adr/2026-04-05-ai-native-runtime-first-charter.md docs/adr/2026-04-04-logix-api-next-charter.md
```

Expected:
- 术语都能找到
- 能识别哪些页面还缺“相关页面”或“边界说明”
- 同步确认 `docs/standards/effect-v4-baseline.md` 是否仍与这些页面的 Effect V4 表述一致

- [ ] **Step 2: 给 core pack 每页补最小三元组**

建议统一补写：

```md
## 来源裁决
- 指向直接约束该页的 ADR / SSoT

## 相关规范
- 指向相邻 runtime 页面与相关 standards

## 待升格回写
- 若该页仍有后续收尾，指向 `docs/next/**` 或对应 proposal
```

Expected:
- 01 到 05 都具备“来源裁决 / 相关规范 / 待升格回写”
- standards 与 ADR 不再只陈述总原则，也能回指核心 SSoT 页面

- [ ] **Step 3: 给 ADR 改动加边界，只允许补导航与勘误元信息**

写入限制：

```md
- accepted ADR 只允许补“相关页面 / 相关规范 / 勘误元信息”
- 若要改变决策结论，新增 ADR，不直接改原 accepted 正文
```

Expected:
- ADR 继续保持决策日志角色
- 本阶段不会把“补链接”扩成“改裁决”

- [ ] **Step 4: 收紧边界描述，避免相邻页面重复定义同一规则**

处理规则：

```md
- 01 定义公开主链
- 02 定义热路径方向
- 03 定义 canonical authoring
- 04 定义 capabilities 与 runtime control plane
- 05 定义 logic 组合与 override 边界
```

Expected:
- 每页只承接自己的事实
- 重复内容改成交叉引用

- [ ] **Step 5: 验证 core pack 的关键约束在整包内都能闭环**

Run:

```bash
rg -n '唯一公开装配入口|唯一公开运行入口|control plane|canonical|fail-fast|expert|第二套' docs/ssot/runtime/01-public-api-spine.md docs/ssot/runtime/02-hot-path-direction.md docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md docs/ssot/runtime/05-logic-composition-and-override.md docs/standards/logix-api-next-guardrails.md
```

Expected:
- 关键规则在 pack 内完整出现
- 没有把 expert 能力重新写回 canonical 主链
- `docs/standards/effect-v4-baseline.md` 与 runtime core pack 没有口径漂移

- [ ] **Step 6: 加一轮语义门，确认 core pack 可按页面职责独立解释**

人工判定清单：

```md
- 01 只讲公开主链
- 02 只讲热路径方向
- 03 只讲 canonical authoring
- 04 只讲 capabilities 与 control plane
- 05 只讲 logic composition / override
- ADR 只记录裁决，不承接细节事实
```

Expected:
- reviewer 可以按页面职责判断是否串位

- [ ] **Step 7: 如用户要求提交，按 runtime core pack 粒度提交**

Run:

```bash
git status --short docs/ssot/runtime/01-public-api-spine.md docs/ssot/runtime/02-hot-path-direction.md docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md docs/ssot/runtime/05-logic-composition-and-override.md docs/standards/logix-api-next-guardrails.md docs/standards/effect-v4-baseline.md docs/adr/2026-04-05-ai-native-runtime-first-charter.md docs/adr/2026-04-04-logix-api-next-charter.md
```

Expected:
- 只看到本任务涉及的 runtime core pack 文件
- 未获用户明确要求前，不执行 commit

### Task 4: 收口 runtime boundary 文档包

**Files:**
- Modify: `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/platform/01-layered-map.md`
- Modify: `docs/ssot/platform/02-anchor-profile-and-instantiation.md`
- Reopen after Task 1: `docs/ssot/runtime/README.md` only when 06-09 改变 runtime 优先入口，且只允许更新“当前优先入口”条目与对应链接顺序
- Reopen after Task 1: `docs/ssot/platform/README.md` only when platform 优先入口需要重排，且只允许更新入口列表与链接顺序
- Modify: `docs/standards/logix-api-next-postponed-naming-items.md`

- [ ] **Step 1: 先检查 boundary pack 的交叉边界是否已经可读**

Run:

```bash
rg -n 'field-kernel|logic 家族|scenario|service-first|program-first|runtime\\.check|runtime\\.trial|runtime\\.compare|strict static profile|Workflow|controller|roots' docs/ssot/runtime/06-form-field-kernel-boundary.md docs/ssot/runtime/07-standardized-scenario-patterns.md docs/ssot/runtime/08-domain-packages.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/platform/01-layered-map.md docs/ssot/platform/02-anchor-profile-and-instantiation.md docs/standards/logix-api-next-postponed-naming-items.md
```

Expected:
- 关键边界词都能找到
- 能看出哪些页面缺“名字后判”和“结构已定”的说明

- [ ] **Step 2: 把结构已定与命名后置彻底拆开**

补写原则：

```md
- 结构结论留在 SSoT / standards
- 命名待定只留在 postponed naming items
- SSoT 页面只引用命名待定页，不重复开放结构争论
```

Expected:
- `docs/standards/logix-api-next-postponed-naming-items.md` 成为唯一命名后置桶
- 06 到 09 与 platform 页面维持结构确定性

- [ ] **Step 3: 给 boundary pack 补“输入边界”和“升级路径”**

建议补写：

```md
## 来源裁决
- 指向直接约束该页的 ADR / SSoT

## 相关规范
- 指向相邻 runtime / platform / standards 页面

## 升级路径或边界
- 哪些能力停在 expert
- 哪些能力后续才能升级

## 待升格回写
- 若该页仍有后续收尾，指向 `docs/next/**` 或对应 proposal
```

Expected:
- Form、scenario、domain packages、verification、platform 页面读起来是顺链路的

- [ ] **Step 4: 验证 verification 与 boundary 术语没有漂移**

Run:

```bash
rg -n 'trial\\.scenario|fixtures/env|steps|expect|repairHints|nextRecommendedStage|field-kernel|service-first|program-first' docs/ssot/runtime/06-form-field-kernel-boundary.md docs/ssot/runtime/07-standardized-scenario-patterns.md docs/ssot/runtime/08-domain-packages.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/platform/01-layered-map.md docs/ssot/platform/02-anchor-profile-and-instantiation.md docs/standards/logix-api-next-postponed-naming-items.md
```

Expected:
- verification 术语集中在 09
- naming 延后项集中在 postponed naming items
- 其余页面以引用方式对齐

- [ ] **Step 5: 加一轮语义门，确认每页具备最小三元组**

人工判定清单：

```md
- 来源裁决
- 相关规范
- 去向或升格路径
```

Expected:
- 每个 boundary 页都能回答“从哪来、与谁相邻、后续去哪”

- [ ] **Step 6: 如用户要求提交，按 runtime boundary pack 粒度提交**

Run:

```bash
git status --short docs/ssot/runtime/06-form-field-kernel-boundary.md docs/ssot/runtime/07-standardized-scenario-patterns.md docs/ssot/runtime/08-domain-packages.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/platform/01-layered-map.md docs/ssot/platform/02-anchor-profile-and-instantiation.md docs/standards/logix-api-next-postponed-naming-items.md
```

Expected:
- 只看到本任务目标文件
- 未获用户明确要求前，不执行 commit

## Chunk 3: Promotion Lanes And Review Gates

### Task 5: 建立 next followup 桶

**Files:**
- Create: `docs/next/2026-04-05-runtime-docs-followups.md`
- Reopen after Task 2: `docs/next/README.md` for link insertion only when the bucket is first created

- [ ] **Step 1: 先证明 next 当前没有实际承接桶**

Run:

```bash
rg --files docs/next
```

Expected:
- 若只看到 `docs/next/README.md`，说明还没有实际承接桶
- 若已存在 followup 文档，先复用，再判断是否需要新桶

- [ ] **Step 2: 创建一个受控 followups 文档，只承接本轮执行中的未升格事项**

建议初始骨架：

```md
# Runtime Docs Followups

## 使用规则
- 这里只放已经有方向、尚未升格的事项

## 待升格
- 标题
- 当前结论
- 准备升格到哪里
- 阻塞点
- 最小元数据：status / target / owner / last-updated
```

Expected:
- `docs/next/2026-04-05-runtime-docs-followups.md` 可作为执行阶段的唯一暂存桶

- [ ] **Step 3: 若首次创建 followup 桶，只回写 next README 的具体入口链接**

写入要求：

```md
- 只补当前 followup 桶的入口链接
- 不再重写 proposal / governance 规则
- next 条目至少带 `status / target / owner / last-updated`
```

Expected:
- `docs/next/README.md`
- followup 桶被 next README 显式承认

- [ ] **Step 4: 验证两条承接车道已经可操作**

Run:

```bash
rg -n 'followups|status|target|owner|last-updated' docs/next/README.md docs/next/2026-04-05-runtime-docs-followups.md
```

Expected:
- followups 文档被 next README 显式承认
- proposal / governance 角色边界继续由 Task 2 保持

- [ ] **Step 5: 如用户要求提交，按 promotion lane 粒度提交**

Run:

```bash
git status --short docs/next/README.md docs/next/2026-04-05-runtime-docs-followups.md
```

Expected:
- 只看到本任务目标文件
- 未获用户明确要求前，不执行 commit

### Task 6: 执行独立 review 与 handoff 刷新

**Files:**
- Modify: `.context/task-board.json`
- Modify: `.context/progress.md`
- Modify: `.context/decisions.md`
- Modify: `.context/eval/report.md`
- Review Inputs: `.context/findings/*.md`

- [ ] **Step 1: 先派 reviewer 只检查当前 chunk 或本波落盘包**

Run:

```bash
rg --files .context/findings
```

Expected:
- 能列出本波 worker finding
- reviewer 只基于 finding、目标文档和 spec 判定，不直接修文档

- [ ] **Step 2: 根据 reviewer 结论核对 owner task 是否已经回刷索引**

核对要求：

```md
- 根 README 与各索引页的刷新动作应由对应 owner task 完成
- 若仍缺入口回刷，退回对应 owner task 处理
- 本 task 不直接 reopen docs 文件
```

Expected:
- owner task 的职责边界不会在合流阶段再次混掉

- [ ] **Step 3: 刷新 harness 工件，确保 fresh-context agent 能直接继续**

最低更新：

```md
.context/task-board.json
.context/progress.md
.context/decisions.md
.context/eval/report.md
```

Expected:
- 下一位 agent 打开 `.context/` 就能知道当前阶段、待做项、阻塞点与下一跳

- [ ] **Step 4: 运行最终只读核对**

Run:

```bash
rg -n 'AI Native|runtime-first|Effect V4|Module / Logic / Program|runtime\\.check|runtime\\.trial|runtime\\.compare|service-first|program-first|field-kernel' docs/README.md docs/ssot/runtime/*.md docs/ssot/platform/*.md docs/adr/*.md docs/standards/*.md docs/next/*.md docs/proposals/*.md
```

Expected:
- 当前主旋律和关键边界词都集中在新 docs 根骨架中
- 若出现术语漂移，先回到相应 SSoT 或 standards 修正
- `docs/standards/effect-v4-baseline.md` 已被最终门禁覆盖

- [ ] **Step 5: 加一轮总语义门，确认最终根骨架能自解释**

人工判定清单：

```md
- 根 README 只导航，不与 governance 争权
- governance 是唯一执行规则页
- proposal / next / ssot / adr / standards 都有进入条件与回写动作
- runtime / platform 叶子页都有来源裁决、相关规范、去向或升格路径
```

Expected:
- fresh-context reviewer 不看聊天记录也能判定是否通过

- [ ] **Step 6: 如用户要求提交，按本波合流粒度提交**

Run:

```bash
git status --short .context/task-board.json .context/progress.md .context/decisions.md .context/eval/report.md
```

Expected:
- 只包含本波收口文件
- 未获用户明确要求前，不执行 commit

## 执行顺序

1. 先做 Chunk 1，确保根路由、治理和升格路径清楚。
2. 再做 Chunk 2，把 runtime core pack 与 boundary pack 分两波落盘。
3. 然后做 Chunk 3，把未升格项安放到 `docs/next/`，并通过独立 reviewer 收口。
4. 每完成一个 chunk，都刷新 `.context/`，必要时换 fresh-context agent 继续。

## Optional Subagent Path

- 默认路径：lead 直跑各 task，并持续刷新 `.context/`
- 条件路径：当文件集合可独立拆分且执行环境允许委派时，再启用 subagent
- Optional Wave A：1 个 audit worker，负责文件簇现状审计并写 `.context/findings/<task-id>.md`
- Optional Wave B：lead 落盘目标文件，保持 `.context/task-board.json` 与 `.context/progress.md` 最新
- Optional Wave C：1 个 reviewer，只读 spec、plan、findings 与目标文档，写 `.context/findings/<review-task>.md`，不直接改正文
- Optional Wave D：lead 根据 reviewer 结论修正，并刷新 `.context/eval/report.md`

## Verification Gate

- 根路由与 governance 变更完成后，必须先过 README / route / promotion lane 的 `rg` 检查
- 根路由与 governance 变更完成后，还必须过单一权威门、角色边界门、根入口 cross-link 门
- runtime core pack 完成后，必须核对主链词与 control plane 词是否闭环
- runtime core pack 完成后，还必须过页面职责门与 ADR 边界门
- runtime boundary pack 完成后，必须核对 naming 后置、verification 边界、field-kernel / domain package 边界
- runtime boundary pack 完成后，还必须过“来源裁决 + 相关规范 + 去向或升格路径”的三元组门
- 任一 chunk 完成后，都要更新 `.context/progress.md`

## Task DoD Template

每个 Task 至少满足：

- 目标文件集已经全部核对并落盘或明确标记“不需改正文”
- `rg` 关键词门通过
- 对应语义门通过
- 若涉及 README / governance / next / proposals，已确认进入条件与回写动作成对出现
- 若涉及 accepted ADR，已确认只补导航或勘误元信息，未改裁决结论
- `.context/progress.md` 已刷新到最新阶段
