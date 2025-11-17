# Feature Specification: Speckit 时间线 Kanban（Specs Timeline Board）

**Feature Branch**: `[064-speckit-kanban-timeline]`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "为 $speckit 增加一个类似 drafts-tiered-system 的配套工具：提供线性时间线式 Kanban 视图浏览 specs（最新 spec 在最左侧，横向滚动；列内纵向滚动；页面整体无滚动条），卡片可点开查看详情；通过本地后端 HTTP 接口读写 specs 下的文件；命令行一键启动并自动打开页面；后端初始化改用 effect-api-project-init 模板；并将交付形态迁移为可 `npx` 一键运行的 npm CLI（skill 目录不内置前后端项目/构建产物）。"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

作为本仓库的贡献者（或 Agent），我希望能通过一个命令行入口打开一个本地页面，用“时间线式 Kanban”方式浏览 `specs/*` 的特性进度（以目录为单位），以便在不打开编辑器/不手工翻目录的情况下，快速获得：最近在做什么、每个 spec 的 tasks 还剩多少、哪些 spec 需要继续推进。

**Why this priority**: `specs/*` 是本仓库的交付单与推进主线，没有一个“面向推进”的视图，会导致信息检索与上下文切换成本很高；P1 先把“可视化浏览 + 时间线布局 + 任务卡片列表”闭环打通。

**Independent Test**: 在本仓库根目录执行一次 CLI 命令后，会自动打开浏览器页面；页面能列出 `specs/` 下至少 3 个 spec，并满足“最新在最左、横向滚动、列内纵向滚动、页面整体无滚动条”的布局约束。

**Acceptance Scenarios**:

1. **Given** 仓库 `specs/` 目录存在且包含多个 `NNN-*` 目录，**When** 运行“打开 Kanban 页面”的命令，**Then** 自动打开浏览器并显示一个横向排列的 spec 列表，左侧第一列为最新 spec。
2. **Given** 看板页面已打开且 spec 列表超过一屏宽，**When** 用户横向滚动看板容器，**Then** 可以浏览更旧的 spec 列表，且页面主体（`body`）不出现滚动条。
3. **Given** 任意 spec 列内存在较多卡片，**When** 用户在该列内纵向滚动，**Then** 仅该列滚动，其他列与页面整体布局保持不动。
4. **Given** 某个 spec 的 `tasks.md` 不存在，**When** 看板渲染该 spec，**Then** 该列仍可显示（例如展示“无 tasks 文件/无任务”状态），并且不会导致全页崩溃。
5. **Given** 顶部筛选处于默认状态（隐藏已完成任务），**When** 看板渲染包含已完成任务的 spec，**Then** 已完成任务默认不展示；且当某个 spec 的任务全部完成时，该 spec 列默认不展示，用户切换筛选后可再次查看。

---

### User Story 2 - [Brief Title] (Priority: P2)

作为本仓库的贡献者（或 Agent），我希望能点击看板中的“卡片”查看详情（例如任务详情、来源文件与上下文），以便在不离开看板的情况下判断下一步应该做什么。

**Why this priority**: 时间线看板只提供概览还不够；需要能“从卡片下钻到细节”，才能把看板作为日常推进入口。

**Independent Test**: 点击任意任务卡片，会打开一个详情视图（弹窗/抽屉/右侧面板均可），展示该卡片的文本内容与来源信息；关闭详情后看板状态不丢失。

**Acceptance Scenarios**:

1. **Given** 用户在任意 spec 列内看到一个任务卡片，**When** 点击该卡片，**Then** 打开详情视图并展示任务文本（至少包含任务标题/描述）。
2. **Given** 详情视图已打开，**When** 用户关闭详情视图，**Then** 回到看板且横向滚动位置与列内滚动位置保持（不强制回到顶部）。
3. **Given** 用户快速连续点击不同卡片，**When** 详情视图切换目标卡片，**Then** 详情内容更新且无明显卡顿或错乱（不会出现上一个卡片的内容残留）。

---

### User Story 3 - [Brief Title] (Priority: P3)

作为本仓库的贡献者（或 Agent），我希望能在看板中对 spec 产物进行“最小必要的修改并持久化”（例如：勾选/取消勾选任务，或直接编辑 `spec.md/plan.md/tasks.md`），从而把看板从“只读浏览”升级为“推进入口”。

**Why this priority**: 只读看板无法形成闭环；P3 要求最小的写入能力，让看板成为推进工具而不是展示页。

**Independent Test**: 在看板中对某个任务执行一次“完成/未完成”的状态切换，刷新页面后仍能看到该状态被持久化。

**Acceptance Scenarios**:

1. **Given** 任务卡片对应 `tasks.md` 中的一行可勾选任务，**When** 用户在 UI 中切换其完成状态并保存，**Then** 后端通过接口把变更写入文件且 UI 立即反映结果。
2. **Given** 用户刷新页面或重新运行打开命令，**When** 看板重新加载该 spec，**Then** 任务完成状态与文件内容一致（变更持久化成功）。
3. **Given** 发生写入冲突或文件不可写，**When** 用户尝试保存，**Then** UI 给出可理解的错误信息，并且不会导致文件内容被部分写入或损坏。

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- `specs/` 下存在非标准目录名（不匹配 `NNN-*`）：应忽略或以可解释方式处理。
- 同一个 `NNN` 出现多个目录：排序规则需稳定且可解释（例如按目录名全量排序；或按 `NNN` 再按目录名）。
- 某些 `spec.md/plan.md/tasks.md` 内容不是标准模板（或包含非 UTF-8）：应尽量容错展示，并对不可解析部分给出提示。
- `tasks.md` 内存在嵌套列表/分组标题：卡片抽取规则需稳定（至少不崩溃）。
- 读写接口遭遇路径穿越输入（`../` 等）：必须拒绝并返回结构化错误。
- 并发修改：当同一文件被外部编辑器修改后再从 UI 写入，需要给出冲突处理策略（至少避免静默覆盖）。

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统 MUST 提供一个命令行入口，用于在本仓库内启动本地服务并自动打开“Specs 时间线 Kanban”页面。
- **FR-002**: 系统 MUST 从仓库 `specs/` 目录中扫描 spec 目录（以 `NNN-*` 为主），并在 UI 中以“最新在左”的时间线顺序展示。
- **FR-003**: 系统 MUST 支持横向滚动浏览多个 spec 列；每个 spec 列 MUST 支持独立的纵向滚动；页面整体 MUST 不出现滚动条。
- **FR-004**: 系统 MUST 在每个 spec 列内以卡片形式展示该 spec 的关键推进项（至少覆盖 `tasks.md` 中的可勾选任务）。
- **FR-005**: 系统 MUST 支持点击任意卡片查看详情（至少包含卡片文本与其来源信息）。
- **FR-006**: 系统 MUST 通过本地 HTTP 接口提供对 `specs/<spec>/spec.md`、`plan.md`、`tasks.md` 的读取能力。
- **FR-007**: 系统 MUST 通过本地 HTTP 接口提供对上述文件的写入能力，并保证写入是原子且可回滚/可失败的（避免部分写入导致文件损坏）。
- **FR-008**: 系统 MUST 对读写接口做路径与权限边界保护：只允许访问仓库内受控路径（至少限制在 `specs/` 下），并拒绝任何路径穿越尝试。
- **FR-009**: 系统 MUST 对常见失败场景返回结构化错误（至少包含 `_tag` 与 `message`），并在 UI 中可解释展示。
- **FR-010**: 系统 MUST 在页面顶部提供任务筛选能力，默认隐藏已完成任务；当隐藏已完成任务时，若某个 spec 的任务全部完成（`todo=0` 且 `total>0`），该 spec 列 MUST 隐藏。

#### Assumptions & Dependencies

- 默认本工具只服务“本机本仓库”场景：不考虑多租户/远程访问/鉴权。
- 默认关心的 spec 产物文件为：`spec.md`、`plan.md`、`tasks.md`（可扩展，但不作为本特性必须项）。
- 默认卡片来源为 `tasks.md` 的可勾选任务；若 `tasks.md` 缺失，则该列展示为空或提示。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 在 `specs/` 目录包含 200 个 spec、每个 spec 的 `tasks.md` 含 200 条任务的情况下，看板首屏渲染应保持可用（不会阻塞浏览器交互超过 1s）。
- **NFR-002**: 所有接口必须只绑定在本机回环地址（localhost），且默认不对局域网开放（避免误暴露文件读写能力）。
- **NFR-003**: 服务端必须输出最小必要的可诊断日志（请求路径、耗时、错误摘要），并为失败提供稳定的结构化错误形状，便于 UI 展示与排错。
- **NFR-004**: 写入文件时必须避免破坏性覆盖：失败时不得产生部分写入文件；成功时必须保证可读且是完整内容。

### Key Entities _(include if feature involves data)_

- **Spec**: `specs/<id>/` 下的一组产物文件，代表一个可交付特性。
- **Task**: 来自 `tasks.md` 的可勾选任务项，用于表示推进状态。
- **Artifact**: `spec.md / plan.md / tasks.md` 等文件本身，用于详情展示与编辑。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 用户执行一次命令即可打开看板页面，并能在页面内浏览所有 spec（含横向滚动与列内纵向滚动）。
- **SC-002**: 看板中的 spec 顺序稳定且可解释：最新 spec 始终出现在最左侧。
- **SC-003**: 用户能点击任务卡片查看详情信息，并能无干扰地返回看板继续浏览。
- **SC-004**: 用户可通过 UI 对至少一种“推进状态”进行修改并持久化（例如任务勾选状态），刷新后保持一致。
- **SC-005**: 在常见失败场景（文件不存在/不可写/非法路径）下，系统能返回结构化错误并在 UI 中可解释展示，且不破坏文件内容。
