---
name: speckit
description: 在采用 `.specify/` + `specs/` 的 Spec-Driven Development（Spec Kit）仓库中，作为“统一路由器”执行 `$speckit <stage>`，把对话里的关键裁决回写到 spec-kit 产物（`spec.md`、`plan.md`、`tasks.md`、`checklists/*`、`.specify/memory/constitution.md`）；仅在用户明确改变需求/架构/原则/澄清时触发，纯闲聊/头脑风暴保持沉默。
---

# speckit（统一阶段路由）

目标：用一个 skill 贯穿 Spec-Driven 流程，把规格产物当作“可执行的单一事实源”（spec → plan → tasks → implement），并在每次对话出现关键裁决时，及时回写到对应产物，避免“代码与规格漂移”。

## 什么时候触发 / 什么时候保持沉默

触发（用户做了会影响产物的**决定/变更**）：

- **技术栈/架构改变**（“换成 React/Go”、“改数据库/协议”、“调整工程结构”）→ 通常先 `clarify`，再 `plan`
- **需求增删改**（“加一个功能/删掉某块/改交互口径/补成功指标”）→ `specify`
- **原则/治理/质量门变更**（“我们必须始终…”、“新增原则”、“调整质量门槛”）→ `constitution`
- **规格含糊导致实现卡住**（“没写清/不确定/有歧义/缺边界条件”）→ `clarify`（回写到 spec）
- **外部审查产出 review.md（偏 plan 评审）**（例如“换个会话在外部 LLM 里审查一遍 spec/plan”）→ `review-plan`
- **外部 Review/审查报告回灌**（例如“用别的 LLM 产出了 `review.md`，要消化进 `plan.md`/`tasks.md`”）→ `plan-from-review`
- **外部审查以问题清单形式回灌（不生成 review.md）**（例如“让另一个 LLM 以提问者视角追问 spec/plan 的缺口”）→ `plan-from-questions`
- **任务拆分/顺序/并行策略要重排** → `tasks`
- **多 spec 联动/总控 spec（Spec Group：一个 spec 调度多个 specs）** → `group`
- **实现前做三件套自洽检查（只读）** → `analyze`
- **需要新增一份领域化规格质量清单**（security/ux/api/performance…）→ `checklist`
- **进入执行阶段并勾任务** → `implement`
- **长链路探索 / 上下文可能见底，需要手动 flush 可交接信息** → `notes`
- **实现后做“上帝视角”验收与漂移评估**（逐条覆盖 `FR-/NFR-/SC-` 等编码点）→ `acceptance`
- **只执行指定 TaskID/下一条任务并勾选**（任务驱动、最小上下文）→ `implement-task`
- **把 tasks 同步到 issue tracker** → `taskstoissues`

保持沉默（不应自动触发）：

- 纯闲聊、头脑风暴、未做裁决的“想一想/聊聊”
- 仅解释概念/回答问题但没有要求更新 spec-kit 产物

## 如何工作（路由器 + 资源包）

- **路由器**：`$speckit <stage> ...` → 选择并执行对应的“阶段提示词”。
- **资源包**：阶段提示词/脚本/模板随本 skill 提供，使“流程约束”与“产物结构”稳定可复用，并减少对宿主侧命令文件/展开提示词的依赖。

## 用法

- 触发格式：`$speckit <stage> <text...>`
- `<stage>` 只能取以下之一：
  - `constitution`
  - `specify`
  - `clarify`
  - `clarify-auto`
  - `clarify-detailed`
  - `plan`
  - `plan-deep`
  - `review-plan`
  - `plan-from-review`
  - `plan-from-questions`
  - `group`
  - `tasks`
  - `analyze`
  - `checklist`
  - `notes`
  - `implement`
  - `acceptance`
  - `implement-task`
  - `taskstoissues`

若 `<stage>` 缺失或不合法：停止并让用户从上述列表中选一个。

## 配套项目：Specs 时间线 Kanban

本仓库提供一个本地配套页面用于浏览与推进 `specs/*`（最新在左、横向滚动、列内纵向滚动、页面整体无滚动条；卡片可点开详情，并通过接口读写文件）。

- 一键启动并打开页面（本仓库）：`pnpm speckit:kanban`
- 作为独立工具运行（推荐，便于分发）：`npx speckit-kit kanban`
  - 指定目标仓库：`npx speckit-kit kanban --repo-root /path/to/repo`
  - 或设置环境变量：`SPECKIT_KIT_REPO_ROOT=/path/to/repo npx speckit-kit kanban`

说明：该看板已迁移为 npm CLI 包 `speckit-kit`（`packages/speckit-kit`），本 skill 目录下不再内置任何前后端项目/构建产物。

feature 选择（可选，但强烈建议明确指定以避免误选“最新 spec”）：

- 推荐：把 feature id 放在 `<stage>` 后的第一个 token：`$speckit plan 025 ...` / `$speckit plan 025-my-feature ...`
- 显式覆盖：在参数里带 `SPECIFY_FEATURE=025`（或 `SPECIFY_FEATURE=025-my-feature`）
- 口语化别名：允许写 `feature=025` / `spec=025` / `feat=025` / `id=025`（本 skill 会把它规范化为 `SPECIFY_FEATURE=...` 再执行）
- 多 spec 验收：仅对 `acceptance` 支持同时指定多个 feature id，例如 `$speckit acceptance 026 027`。

## 核心流程与概念

- 触发形态：用户主动触发一律用 `$speckit <stage>`；若宿主侧提供 slash command，只视为等价别名（本仓文档不再使用该写法）。
- 推荐主流程：`constitution` → `specify` → `clarify` → `plan` → `tasks` → `implement`（可在任意阶段插入 `notes` 做手动 flush；实现前可插入 `checklist` / `analyze` 做自检与收敛）。
- 推荐闭环：在 `implement` 之后，执行一次 `acceptance` 做“上帝视角”验收（以最新源码为准，覆盖 `spec.md` 内每个带编码的点）。
- 产物边界（避免层级混淆）：
  - `constitution`：项目原则与治理（全局约束）
  - `specify`：需求与成功标准（WHAT/WHY，不写 HOW）
  - `clarify`：消除歧义与补齐缺口（把 `[NEEDS CLARIFICATION]` 关掉）
  - `plan`：技术与架构选择（HOW 的全局方案，细节下沉到 `implementation-details/`）
  - `tasks`：可执行任务拆分（顺序/依赖/并行标记/验收检查点）
  - `implement`：按 `tasks.md` 执行并持续勾选进度，必要时回写规格
- feature 上下文：以 `001-xxx` 形式的 feature id 为 key，对应 `specs/<feature-id>/` 下的一组产物；脚本优先读 `SPECIFY_FEATURE`，其次从当前目录推断，再回退到 `specs/` 下最高序号。

## 路由执行规则（关键，避免语义漂移）

0. 确定 `SKILL_DIR`：从本次注入块里的 `<path>` 取到 `SKILL.md` 的绝对路径；`SKILL_DIR = dirname(path)`。
   - 重要：`SKILL_DIR/...` 在 reference 里是**占位写法**；真正运行 shell 命令时，必须把 `SKILL_DIR` 替换成上面推导出的真实绝对路径（不要原样交给 shell）。
1. 从用户消息中解析：
   - `stage`：`$speckit` 后的第一个词
   - `stage_args`：剩余文本（可能为空）
   - 若 `stage_args` 含 `SPECIFY_FEATURE=<feature-id>`（如 `SPECIFY_FEATURE=026-xxx` 或 `SPECIFY_FEATURE=026`）：将其视为本次执行的环境覆盖（后续所有 shell 命令都应带上该环境变量），并从 `stage_args` 中剥离该 token 后再继续执行。
   - 若 `stage_args` 的**第一个 token** 形如 `026` 或 `026-xxx`：将其视为 feature 选择，等价于设置 `SPECIFY_FEATURE=<token>`（后续所有 shell 命令都应带上该环境变量），并从 `stage_args` 中剥离该 token 后再继续执行。
   - 若 `stage_args` 含 `feature=<id>` / `spec=<id>` / `feat=<id>` / `id=<id>`（其中 `<id>` 形如 `026` 或 `026-xxx`）：将其视为 feature 选择，等价于设置 `SPECIFY_FEATURE=<id>`（后续所有 shell 命令都应带上该环境变量），并从 `stage_args` 中剥离该 token 后再继续执行。
   - 若同时出现（例如既有 `SPECIFY_FEATURE=` 又以 `026` 开头），以显式的 `SPECIFY_FEATURE=` 为准。
   - 稳定性建议：一旦本次执行明确选择了 feature（任何一种写法都算），后续调用脚本时**优先**使用脚本参数 `--feature <id>`（例如 `--feature 029`），避免依赖隐式推断或环境变量前缀。
2. **在做任何动作之前**，必须先读取并理解 `SKILL_DIR/references/<stage>.md` 的全文。
3. 严格按 `references/<stage>.md` 中的流程执行；不要在本 skill 里“凭记忆复述一遍同义流程”。
4. `references/<stage>.md` 内出现的 `$ARGUMENTS`，一律解释为 `stage_args`（即 `$speckit <stage>` 后的剩余文本）。

## 阶段提示词来源（权威）

根据 `<stage>` 加载并执行对应 reference 文件（相对本 skill 目录）：

- `constitution` → `SKILL_DIR/references/constitution.md`
- `specify` → `SKILL_DIR/references/specify.md`
- `clarify` → `SKILL_DIR/references/clarify.md`
- `clarify-auto` → `SKILL_DIR/references/clarify-auto.md`
- `clarify-detailed` → `SKILL_DIR/references/clarify-detailed.md`
- `plan` → `SKILL_DIR/references/plan.md`
- `plan-deep` → `SKILL_DIR/references/plan-deep.md`
- `review-plan` → `SKILL_DIR/references/review-plan.md`
- `plan-from-review` → `SKILL_DIR/references/plan-from-review.md`
- `plan-from-questions` → `SKILL_DIR/references/plan-from-questions.md`
- `group` → `SKILL_DIR/references/group.md`
- `tasks` → `SKILL_DIR/references/tasks.md`
- `analyze` → `SKILL_DIR/references/analyze.md`
- `checklist` → `SKILL_DIR/references/checklist.md`
- `notes` → `SKILL_DIR/references/notes.md`
- `implement` → `SKILL_DIR/references/implement.md`
- `acceptance` → `SKILL_DIR/references/acceptance.md`
- `implement-task` → `SKILL_DIR/references/implement-task.md`
- `taskstoissues` → `SKILL_DIR/references/taskstoissues.md`

将该 `references/<stage>.md` 视为本次执行的“阶段提示词”（authoritative）：

- 不要在本 skill 中另写一套同义流程，避免与原提示词产生漂移。
- 若 reference 中的某条指令与仓库现实不符（脚本/路径不存在），只做**最小必要**修正，并把差异说明写清楚（方便 prompt 调试对照）。

## 资源位置（本 skill 自带）

- 阶段提示词：`references/*.md`
- 脚本：`scripts/bash/*.sh`
- 模板：`assets/templates/*.md`

说明：

- repo root 推断：脚本默认从当前工作目录向上寻找根（优先命中 `.specify/` 或 `specs/`；否则回退到 git root/当前目录），因此默认会读写你当前工作目录所在项目的 `specs/`。
- 复制版脚本会优先使用本 skill 的模板（`assets/templates/*`），不会覆盖或依赖仓库内的 `.specify/templates/*`。
- feature 推断：本 skill 的 Bash 脚本不依赖 Git 分支名，优先使用 `SPECIFY_FEATURE`，否则尝试从当前目录推断，再回退到 `specs/` 下最高序号。
- 本 skill 的 Bash 脚本不会自动执行 `git checkout` / `git commit` 等 VCS 操作；如需分支管理请手动进行。
- 脚本使用约定：默认**不要**为了“确认脚本做什么”而去读取脚本源码；脚本属于本 skill 的受控资源，按下述能力描述直接运行并解析 `--json` 输出即可。只有在你要修改脚本或怀疑脚本行为异常时才阅读源码。
- shell 命令约定（避免踩坑）：
  - 推荐：直接使用脚本的**绝对路径**执行（由注入块推导 `SKILL_DIR` 后拼出路径），并加引号：`"<SKILL_DIR>/scripts/bash/check-prerequisites.sh" ...`
  - 若你在同一条命令里要用 `SKILL_DIR` 变量：必须先赋值再引用，例如 `SKILL_DIR="..."; "$SKILL_DIR/scripts/bash/check-prerequisites.sh" ...`
  - 禁止写法：`SKILL_DIR="..." $SKILL_DIR/scripts/...`（shell 会先展开 `$SKILL_DIR`，导致路径变成 `/scripts/...`）

## 脚本能力（无需读源码）

- `scripts/bash/create-new-feature.sh`：创建 `specs/<NNN-*>/spec.md`（从模板拷贝/或创建空文件），输出包含 `BRANCH_NAME`/`SPEC_FILE` 的 JSON；不做任何 VCS 操作。
- `scripts/bash/setup-plan.sh`：确保 `specs/<feature>/plan.md` 存在（默认不覆盖，`--force` 才覆盖），输出包含 `FEATURE_SPEC`/`IMPL_PLAN` 的 JSON；不改动其它规格产物。
- `scripts/bash/update-spec-status.sh`：更新 `specs/<feature>/spec.md` 顶部的 `**Status**:` 行；支持 `--ensure` 保持单调前进（Draft→Planned→Active→Done），避免回退。
- `scripts/bash/setup-notes.sh`：确保 `specs/<feature>/notes/` 骨架存在（默认不覆盖；`--force` 才覆盖），输出包含 `NOTES_DIR`/`NOTES_README`/`SESSIONS_DIR` 的 JSON；支持 `--dry-run` 预览。
- `scripts/bash/check-prerequisites.sh`：检查当前 feature 的必要文件是否存在并输出 JSON（可选要求 `tasks.md`）；不写入规格文件。
- `scripts/bash/extract-user-stories.sh`：从 `spec.md` 提取 `User Story N` 清单（含 Priority 与 file+line 证据），支持 `--json`；只读。
- `scripts/bash/extract-coded-points.sh`：从一个或多个 `spec.md` 提取 `FR/NFR/SC` 编码点清单（带 file+line 证据，支持 `--json`），用于 `acceptance` 阶段避免盲搜；只读。
- `scripts/bash/extract-tasks.sh`：从一个或多个 `tasks.md` 提取任务清单与完成状态（带 file+line 证据，支持 `--json`），用于 `acceptance` 阶段避免盲解析；只读。
- `scripts/bash/extract-spec-ids.sh`：聚合查询编号体系（`us/codes/tasks`），支持 `--kind/--kinds` 可组合选择 + `--json`；只读。
- `scripts/bash/show-todo-tasks.sh`：默认汇总 `specs/*` 中仍有待办的 spec（只输出每个 spec 的 todo 总数）；指定 `--feature`（可重复）或多个 `NNN` 时展开对应 spec 下的全部 todo task；支持 `--json`；只读。
- 以上脚本均支持 `--feature 029` 选择 spec；其中 `setup-plan.sh`/`check-prerequisites.sh` 也支持位置参数 `029`/`029-xxx`。
