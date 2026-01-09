---
name: drafts-tiered-system
description: This skill should be used when managing a tiered L1–L9 draft system rooted at docs/specs/drafts in a repository, including placing new drafts, refining and promoting drafts between levels, consolidating related drafts, and maintaining a draft index document.
---

# Drafts Tiered System · 使用说明

本 skill 用于在任意代码仓库内，围绕约定的“草稿根目录” `docs/specs/drafts` 构建和维护 **L1–L9 阶梯式草稿体系**。
目标是让后续的 Claude 实例在处理草稿相关任务时，有一套稳定的目录约定和操作流程，而不依赖具体项目路径。

## 1. 背景与目的

- 草稿用于承载「尚未完全定稿，但有潜在价值」的方案、调研、对话摘录和对外项目启发；
- 正式规范（例如 `docs/specs/sdd-platform/ssot`、`.codex/skills/project-guide/references/runtime-logix`）只收敛稳定结论；
- L1–L9 数字越小代表成熟度越高，新草稿默认放在 L9，随整理逐步前移；
- 通过该体系，支持后续“集中梳理草稿 → 融合方案 → 更新正式规格”的工作流。

## 2. 目录与分级约定

在仓库根目录下约定 **drafts 根目录** 为：`docs/specs/drafts`，并在该目录下使用如下结构：

- `README.md`：解释阶梯式草稿体系的整体规则与协作约定；
- `index.md`：列出各层级（L1–L9）及 Topics 当前已有草稿的索引；
- `topics/`：按主题整理的、相对完整的草稿集合（Consolidated Drafts）；
- `L1/` … `L9/`：按成熟度分层的散乱草稿目录（Tiered Drafts）。

成熟度含义（越小越稳定）：

- `L1/`：几乎稳定，可直接视为正式规范的候选；
- `L2/`：结构清晰、主要矛盾已解决，后续以细节调整为主；
- `L3/`：有完整章节结构与 TODO，方向明确但实现/权衡尚在演化；
- `L4/`：问题定义和部分方案较清楚，仍有明显空白或待决问题；
- `L5/`：以对比/调研为主，有初步结论但未形成系统方案；
- `L6/`：思路梳理、问题拆解为主，结论弱、问题强；
- `L7/`：散碎灵感、会议记录、长对话摘录，已有一定分组；
- `L8/`：一次性调研/探索结果，未来可能被合并或丢弃；
- `L9/`：生草稿，新产生但未整理的想法/对话/外部启发。

### 2.2 Topics (Consolidated Drafts)

当一组 L1-L9 的草稿围绕同一个特定主题（如 "AI-Native UI", "Core API"）逐渐成熟并形成体系时，应将其收编至 `topics/<topic-name>/` 目录下。

- **定位**：Topics 是 "Drafts" 到 "Specs" 的中间站。它比散乱的 L\* 草稿更系统，但可能还未完全定型为核心规范。
- **结构**：每个 Topic 目录下通常包含一组结构化的文档（如 `00-overview.md`, `01-concept.md`...）。

约定：

- 新草稿若无更明确定位，默认放入 `L9/`；
- 文件名应尽量体现主题和作用域（例如 `bubblelab-integration-notes.md`，而不是 `notes.md`）；
- 根目录下只保留极少数“全局愿景级”草稿，成熟后应迁入 L1–L3 或 Topics。

## 3. 草稿文件的基本结构

为方便后续梳理，每个草稿文件推荐包含以下内容（可按需要裁剪）：

1. YAML frontmatter：
   - `id`: **3 位 SpecID**（如 `205`）。用于在大量草案中稳定引用同一“草案 spec”，即使文件被移动到别的层级目录也不变（强烈建议尽早补齐）。
   - `title`: 简明题目；
   - `status`: 建议使用 `draft` / `active` / `superseded` / `merged` 等；
   - `version`: 任意有意义的版本号或时间戳；
   - `value`: 草稿在整体系统中的价值类型（见下文 3.1）；
   - `priority`: 草稿在当前/中短期路线图中的处理优先级（见下文 3.1）；
   - `depends_on`: **文档级依赖**（可选，推荐用 SpecID 列表），表示“本草案被哪些草案阻塞/前置”。示例：`depends_on: [104, 117]`
   - `related`: **文档级关联**（可选），允许写相对路径或 SpecID（推荐优先写 SpecID，减少移动导致的链接断裂）。示例：`related: [205, "./00-overview.md"]`
2. 正文建议包含：
   - 背景与动机：草稿试图解决的问题与场景；
   - 主要观点/方案：当前认为较有价值的思路；
   - 与现有规范的关系：补充/挑战的是哪些文档；
   - 待决问题/风险：尚未定夺或存在不确定性的部分；
   - 外部参考：相关仓库、文档或对话链接（如存在）。

在帮助用户写入新的草稿时，应优先遵循上述结构，至少保证“未来另一个 LLM 能独立读懂”。

### 3.1 价值与优先级字段（value / priority）

为便于跨主题决策和排期，每个草稿应在 frontmatter 中显式标注：

- `value`: 从“对 SSoT/实现的结构性价值”角度分类，建议使用以下枚举值：
  - `core`：直接影响 v3 / runtime-logix / 关键子包（如 `@logixjs/core`, `@logixjs/react`, `@logixjs/form`）的设计或实现，最终应沉淀到 `docs/specs` SSoT 与对应代码；
  - `extension`：扩展能力、特定场景或子包（如 `@logixjs/query`、Draft Pattern、特定 ToB 场景）的设计，重要但不改变核心引擎契约；
  - `vision`：中长期蓝图与方向性思考（例如平台终局形态、AI Native 愿景），用于指导但不直接约束当前实现；
  - `background`：调研对比、历史记录、外部启发等，如不再被引用可在后续合并或归档。

- `priority`: 从“何时需要处理/落实”角度标注，建议使用以下枚举值：
  - `now`：当前或下一个迭代必须推进的内容，通常会对应到近期的实现 backlog；
  - `next`：中短期（例如未来 1–2 个迭代）需要落地的内容，可在核心工作稳定后推进；
  - `later`：有价值但不阻塞当前主线的想法/规划，暂以参考为主；
  - `parked`：暂不考虑推进，仅保留为背景资料或历史记录。

标准用法示例：

```yaml
---
title: Logix React Adapter Specs
status: draft
version: 2025-11-28
value: core
priority: next
---
```

在梳理和前移草稿时，应同步检查并更新 `value` / `priority`：

- 当草稿内容已经部分/全部并入 SSoT 或实现时：
  - 将原草稿标记为 `status: merged` 或 `status: superseded`；
  - 通常将 `priority` 降为 `later` 或 `parked`，并在 `moved_to` / `related` 中指向最新规范；
- 当某个主题进入当前迭代的重点工作时：
  - 将核心草稿的 `priority` 提升为 `now`，并确保在 `implementation-status.md` 或类似路线图中有对应条目；
  - 如有多个重叠草稿，可先按 4.2/4.3 流程合并为更高层级文件，再统一调整优先级。

### 3.2 Spec 化草案：细粒度编号（US/FR/...）与条目级依赖

当你希望把草案当作“可演进的 spec”来维护（大量 ideas 下仍能快速看清依赖与影响面），使用以下规则：

#### 3.2.1 编号体系（稳定引用）

- 草案 SpecID：`id: 205`（3 位，唯一；推荐与文件名解耦，避免移动/重命名造成引用失效）
- 条目编号（都以该 SpecID 为中缀）：
  - User Story：`US-205-001`
  - Functional Requirement：`FR-205-001`
  - Non-Functional Requirement：`NFR-205-001`
  - Success Criteria：`SC-205-001`

#### 3.2.2 条目书写格式（机器可解析）

- 每个条目用一条 markdown 列表项，且以 `- <ID>:` 开头（必须有冒号）：
  - 示例：`- US-205-001: 作为 PM，我可以把需求拆成可验证的场景`
- 条目级依赖/关联使用固定键的缩进子项（可选，但推荐用来表达依赖与联系）：
  - `Depends:`：当前条目依赖哪些条目（可跨草案 SpecID）
  - `Relates:`：软关联（不阻塞）
  - `Supports:`：当前条目支持/覆盖哪些条目（如 FR 支持 US，或 FR 支持 SC）

示例：

```md
- US-205-001: 用户能在草案里维护 US/FR 编号
  - Depends: FR-104-002
  - Supports: SC-205-001
```

#### 3.2.3 依赖优先级（语义约定）

- `depends_on`（文档级）用于“宏观阻塞关系”（比如“必须先完成 104 这个上游草案”）。
- `Depends`（条目级）用于“微观实现/论证依赖”（比如“这个 FR 依赖另一个草案里的 FR/US”）。
- 当两者都存在冲突时，以条目级 `Depends` 为准，文档级只作导航与粗粒度规划。

## 4. 典型工作流

### 4.1 新草稿落地（默认 L9）

当用户与 LLM 讨论某个新主题、调研外部项目或产生一组初步想法时：

> 推荐：用脚本自动分配 3 位 `id` 并落盘，避免人工编号冲突（默认落在 L9，可通过参数选择层级）。
>
> - 例：`npm run -s create -- --level L9 "我的新想法"`（省略 `--level` 也默认 L9）
> - 例：`npm run -s create -- --level L5 "更成熟的提案草案"`
> - 例：`npm run -s create -- --level Topics --topic sandbox-runtime "边界与约束整理"`
>
> 若不在目标仓库根目录执行，确保当前工作目录位于该仓库内，或通过环境变量指定：
>
> - `DRAFTS_REPO_ROOT=/path/to/repo`
> - 或 `DRAFTS_ROOT=/path/to/repo/docs/specs/drafts`

1. 确认当前仓库使用 `docs/specs/drafts` 作为 drafts 根目录；
2. 在 `docs/specs/drafts/L9/` 子目录中创建一个具备语义的文件名，例如：
   - `bubblelab-integration-notes.md`
   - `agent-compiler-loop-experiments.md`
3. 写入包含 frontmatter + 背景 + 主要观点/启发 的草稿内容：
   - 若草稿直接针对当前迭代的实现/缺口（例如 Runtime Bugfix、核心 API 演进），建议设置 `value: core` 且 `priority: now` 或 `priority: next`；
   - 若草稿更多是远期规划/灵感火花，建议设置 `value: vision` 且 `priority: later`，后续在集中梳理时再提升；
4. 在 `docs/specs/drafts/index.md` 的 L9 小节下添加一行索引（路径 + 一句说明）。

在这一阶段不要求结构完美，重点在于“把有用信息存下来”和“命名清晰”。

### 4.2 梳理与前移（L9 → L7/L5）

当某个主题在 L9/L8 中积累了多份草稿时，可以发起一次集中梳理：

1. 选择一个目标主题（例如 “Agent 集成与编排”），收集相关 L7–L9 文件；
2. 创建一个新的、更高层级文件（通常放在 `L6/` 或 `L5/`），例如：
   - `L5/agent-orchestration-roadmap.md`；
3. 在新文件中：
   - 汇总各草稿的主要结论和分歧；
   - 删除明显重复或低价值的内容；
   - 标记 TODO / Open Questions；
4. 对已被合并的旧草稿，在其 frontmatter 或开头段落标记 `status: superseded`，并注明“已被某某文档取代”，视情况可保留或裁剪。

完成上述整理后，可将新文件逐步前移到更高成熟度层级（L5 → L4 → L3）。

### 4.3 专题收编（L\* → topics）

当某个主题下的草稿数量较多且逻辑自洽时，应进行专题收编：

1. 在 `docs/specs/drafts/topics/` 下创建新目录，如 `ai-native-ui/`；
2. 将相关的 L\* 草稿移动到该目录下，并重命名为有序的文件名（如 `00-overview.md`, `10-protocol.md`）；
3. 创建该 Topic 的 README 或 Index 文件；
4. 更新 `docs/specs/drafts/index.md`，将这些草稿从 L\* 列表中移除，并在 Topics 章节下列出。

### 4.3 成型方案与正式规范对接（L3/L2 → specs）

当某个草稿已经具备较稳定的结构和结论（通常位于 L3/L2）时：

1. 明确它在整体架构中的落点（例如 Agent 平台、Runtime DI、Pattern 资产库等）；
2. 在当前仓库中选择对应的目标规范文件（通常位于 `docs/specs/...` 路径下）；
3. 将草稿中的稳定结论和约束提炼为规范性文字，写入目标文件；
4. 在草稿中注明“已部分/全部并入某某规范”，并更新 `status` 字段为 `merged` 或类似值。

草稿并入正式规范后，可继续保留草稿用于追踪演进和对照。

## 5. 与 LLM 协作的操作指引

当用户发出与草稿相关的指令（例如“把这次讨论写入 drafts”“帮我梳理 L9 草稿”）时，应遵循以下原则：

1. 识别任务类型：
   - 新草稿落地 → 走 4.1 流程，优先写入 L9；
   - 多稿合并/梳理 → 走 4.2 流程，产出更高层级草稿；
   - 专题收编 → 走 4.3 流程，建立 Topic 目录；
   - 方案收敛/更新规范 → 走 4.4 流程。
2. 始终保持：
   - `README.md` 中描述的分级含义不被草稿内容覆盖或冲突；
   - `index.md` 与实际文件结构大致一致（可以在每次大规模调整后批量更新 index）。
3. 避免：
   - 在 drafts 中引入与现有 specs 明显矛盾且未标明“冲突点”的新标准；
   - 将“确定性很高的决定”长期停留在低成熟度层级而不迁入 specs。

## 6. 当前已知草稿（示例）

本 skill 不绑定具体草稿文件名，仅约定 drafts 根目录路径为 `docs/specs/drafts`。
在具体项目中使用时，应在该目录内维护实际草稿清单（通过 `index.md`），并在需要时让 Claude 遵循本 skill 描述的流程更新 index 与各草稿的 `status` 字段，以保持草稿体系的可追踪性与可演进性。

## 7. UI 约定（Kanban / Graph）

该 skill 自带一个轻量 UI（`ui/`）用于浏览/拖拽草稿，并提供 Graph 视图辅助查看 `depends_on` / `related` 等关系。
当需要改 UI 或补控件时，组件优先选用 shadcn/ui（见 `ui/src/components/ui/`），仅在缺失对应组件时再写自定义实现。
