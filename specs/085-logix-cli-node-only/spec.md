# Feature Specification: Logix CLI（Node-only 工具箱与集成验证跑道）

**Feature Branch**: `085-logix-cli-node-only`  
**Created**: 2026-01-09  
**Status**: Draft  
**Input**: 在平台产品落地前，提供一个 Node-only 的 `logix` CLI：把“IR 导出 / 受控试跑 / Anchor 索引 / 保守回写 / Gate（validate/diff）/ 可选 Transform（batch ops）”串成一条可复现跑道，作为开发者、Agent 与 CI 的验证入口；输出必须确定性、可序列化、可 diff。

## Context

全双工前置（`080`）的基础能力在早期需要一个“可运行、可验收、可自动化”的载体：

- 平台 UI/Dev Server 还未成形时，仍需能在 Node 侧验证：Manifest/StaticIR/TrialRunReport、AnchorIndex、AutofillReport/Write-Back。
- 这些能力既要服务 CI 门禁，也要服务开发者本地“快速验证/定位问题”。
- 若缺少统一入口，能力会散落在脚本/示例/内部 API 中，难以形成可回放、可诊断的单一事实源链路。

因此需要一个 CLI 作为“基础能力的外壳”：

- 以命令形式稳定暴露能力（便于脚本化/CI 化）；
- 输出版本化 JSON 工件（便于平台/Devtools/Agent 消费）；
- 只做“验证/导出/回写”这些基础能力，不承诺平台产品形态。

同时，本 CLI 需要面向 Agent 的工作方式做裁决：

- **默认路径**：Agent 直接出码/大改动 → 用 CLI 导出工件（Oracle）→ 用 CLI 门禁与对比（Gate）；
- **可选加速器**：当变更属于 Platform-Grade 子集内的“机械且高风险小改动”时，提供 batch transform，一次表达多项 ops，默认 report-only，满足门槛再写回（对齐 082）。

## Clarifications

### Session 2026-01-09

- AUTO: Q: stdout JSON 输出是否统一？→ A: 默认统一输出 `CommandResult@v1` envelope（无时间戳/随机；工件通过 `artifacts[]` 引用）。
- AUTO: Q: Exit Code 规范？→ A: `0=PASS`、`2=VIOLATION`（门禁/差异/规则违反）、`1=ERROR`（运行失败/异常）。
- AUTO: Q: TS 入口加载与解析器依赖如何组织？→ A: 入口加载用 `tsx`；Parser/Rewriter 用 `ts-morph`（子命令内 lazy-load）；`packages/logix-core` 禁止引入 `ts-morph/swc`。

### Session 2026-01-21

- AUTO: Q: 是否把 `ir validate/ir diff` 作为一等公民？→ A: 是；它们是 Gate（可门禁、可 diff）的核心，产出结构化报告与 reason codes。
- AUTO: Q: 是否提供 `transform module --ops delta.json`？→ A: 是，但 v1 只覆盖 Platform-Grade 子集内的保守改写；默认 report-only，写回必须遵守 082 的幂等与竞态防护。

## Goals / Scope

### In Scope

- 提供一个 Node-only 的 CLI 工具箱，覆盖至少六类能力：
  1. 导出 IR 工件（Manifest/StaticIR/Artifacts 等）
  2. 执行受控试跑并导出 TrialRunReport
  3. 扫描仓库构建 AnchorIndex（Platform-Grade 子集索引）
  4. 生成 AutofillReport，并可选择写回源码（宁可漏不乱补）
  5. 对导出工件做门禁与对比：`ir validate` / `ir diff`（可门禁、可 diff、可行动 reason codes）
  6. 可选 Transform：`transform module --ops <delta.json>`（batch ops；默认 report-only；满足门槛才写回）
- CLI 的 IR 导出与试跑输出必须对齐控制面 Root IR：当 `workflowSurface`（Π slice）可用时，CLI 必须能导出并在输出中引用 `manifest.modules[*].workflowSurface.digest`（避免出现“Program IR”并行命名）。
- 输出必须可 JSON 序列化、确定性、可 diff，并包含必要的 reason codes（失败/跳过/降级原因）。
- CLI 作为 Node-only 能力的集成测试跑道：命令本身可在 CI 直接跑通并对比输出工件。

### Out of Scope

- 不交付平台 Dev Server / Studio / 画布 UI。
- 不引入“运行期常驻成本”：CLI 只在按需执行时运行，运行时核心路径不受影响。
- 不尝试让 CLI 成为通用构建系统（不接管 bundler/编译器）；只做本仓库需要的验证与导出入口。
- Transform 不承诺覆盖任意 TypeScript 写法：仅覆盖 Platform-Grade 子集；子集外必须 report-only + reason codes（宁可漏不乱补）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 开发者用 CLI 一键导出 IR 与试跑报告，定位缺失/冲突 (Priority: P1)

作为开发者，我希望在本地对一个 program/module 入口执行一次 CLI 命令，就能得到可序列化的 IR 工件与 TrialRunReport，并能在缺失依赖/冲突时得到可解释诊断（稳定锚点 + reason codes），从而快速定位并修复。

**Why this priority**: 这是平台落地前最现实的验证方式；同时也是 CI 门禁的最小形态。

**Independent Test**: 选取一个代表性模块入口执行 CLI，产出 JSON 工件；重复执行输出一致；当注入缺失依赖时报告可解释失败。

**Acceptance Scenarios**:

1. **Given** 一个模块入口，**When** 运行 CLI 导出 IR/试跑，**Then** 得到可 JSON 序列化且稳定 diff 的输出工件（含最小解释字段）。
2. **Given** 环境缺失服务/配置，**When** 运行试跑，**Then** CLI 以可解释失败结束，并输出缺失清单与锚点定位信息（而不是仅日志或不可解析错误）。

---

### User Story 2 - 开发者用 CLI 构建 AnchorIndex，并在安全边界内执行保守回写 (Priority: P1)

作为开发者，我希望能对仓库构建 AnchorIndex（Platform-Grade 子集索引），并在确认后对“未声明且高置信度”的锚点缺口执行写回；任何不确定情况都必须跳过并可解释（宁可漏不乱补）。

**Why this priority**: 没有一个稳定入口，Parser/Rewriter/Autofill 很难形成可重复验证的闭环。

**Independent Test**: 对同一仓库重复构建 AnchorIndex 输出一致；对缺失锚点的模块先 report-only，再 write-back，第二次执行幂等无差异。

**Acceptance Scenarios**:

1. **Given** 一个仓库，**When** 运行 `anchor index`，**Then** 得到可序列化的 AnchorIndex 与降级原因摘要。
2. **Given** 一个模块缺失锚点声明，**When** 运行 `anchor autofill --mode report`，**Then** 输出拟修改清单与跳过原因（reason codes），不写回源码。
3. **Given** 同一输入，**When** 运行 `anchor autofill --mode write`，**Then** 只写回缺失字段，重复执行幂等，且对不确定项不写回并可解释。

---

### User Story 3 - CI 用 CLI 产出工件并做门禁化（不依赖平台） (Priority: P2)

作为 CI/平台维护者，我希望在 CI 中通过 CLI 产出版本化工件，并对其做 diff/门禁判定；即使平台尚未落地，也可以先用 CLI 串起“可序列化证据链”的最小闭环。

**Why this priority**: 这能提前把“证据链/IR/回写口径”固化为工程事实，减少平台落地时的返工与漂移。

**Independent Test**: CI 对同一输入跑两次输出一致；变更发生时 diff 可定位到关键字段变化。

---

### User Story 4 - Agent/开发者直接出码后，用 CLI 做 Gate（validate/diff） (Priority: P1)

作为 Agent/开发者，我希望在生成大段代码或做完一次重构后，用最少命令得到“可 diff 的证据链”：

- 导出 Manifest/Workflow slices；
- 校验锚点与 budgets；
- 与基线目录做 diff，定位漂移字段并给出 reason codes。

**Independent Test**: 同一入口重复执行输出一致；改动后 diff 聚焦到可解释字段变化。

---

### User Story 5 - 对既有 Module 批量增加 state/action（batch transform，可选） (Priority: P1)

Given：页面已存在 Platform-Grade Module 定义。  
When：需要增加状态（State）或 Action，并补齐必要锚点。  
Then：一次 `transform module --ops delta.json` 产出最小 PatchPlan（report-only），可选 `mode=write` 幂等写回。

**Independent Test**: 同一输入产生相同 PatchPlan；写回后再次运行 0 diff；子集外形态不写回并给出 reason codes。

## Edge Cases

- 目标入口无法加载/不合法：必须结构化失败（包含入口信息与原因），避免只输出堆栈。
- 输出超预算：必须截断并显式标记（而不是 silent drop）。
- 写回遇到歧义/冲突/子集外形态：必须拒绝写回并可解释。
- 多模块/多入口批量执行：输出必须包含稳定的分组与排序策略。
- Gate/diff 的噪音字段（例如耗时/版本/机器特异字段）：必须默认不进入可 diff 工件口径；如需输出必须 opt-in 且不影响字节级确定性门禁。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供 Node-only CLI 作为基础能力入口，支持：IR 导出、受控试跑、AnchorIndex 构建、保守 autofill（report/write）。
- **FR-002**: CLI 输出 MUST 可 JSON 序列化、确定性、可 diff，并包含必要的版本信息与 reason codes；stdout 默认 MUST 统一输出 `CommandResult@v1` envelope（避免各子命令格式漂移）。
- **FR-003**: CLI MUST 支持 report-only 与 write-back 两种模式，并保证 write-back 的幂等性与最小改动面。
- **FR-004**: CLI MUST 支持将输出工件落盘（稳定路径/稳定命名），以便 CI/平台/Devtools 消费与对比。
- **FR-005**: CLI MUST 明确“单一真相源”：任何写回只能写入源码显式锚点字段；运行证据与 Spy 证据不得成为长期权威。
- **FR-006**: CLI MUST 提供可门禁化的 Exit Code 规范：`0=PASS`、`2=VIOLATION`、`1=ERROR`。
- **FR-007**: CLI MUST 提供 Gate 命令：`ir validate` 与 `ir diff`，其输出必须是结构化工件（可门禁、可行动 reason codes）。
- **FR-008**: CLI MAY 提供 `transform module --ops <delta.json>`（batch ops）：默认 report-only；写回必须显式开启并遵守 082 的幂等与竞态防护。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: CLI 的执行必须可控：超时/预算/输出大小上界可配置；超限必须可解释收束。
- **NFR-002**: CLI 的失败必须可解释：结构化错误必须包含最小上下文（入口、阶段、锚点、reason code）。
- **NFR-003**: CLI 不得引入运行时常驻成本；其价值完全体现在“按需验证/导出/回写”。
- **NFR-004**: CLI 冷启动需有预算：`logix --help` 等不需要解析的命令 MUST lazy-load `ts-morph` 等重依赖，目标 cold start `< 500ms`。

### Key Entities _(include if feature involves data)_

- **CLI Output Artifacts**: 由 CLI 导出的版本化 JSON 工件（ControlSurfaceManifest + workflowSurface/Artifacts/TrialRunReport/AnchorIndex/PatchPlan/WriteBackResult/AutofillReport…）。
- **Reason Codes**: 失败/跳过/降级原因枚举，用于门禁化与解释链路。
- **Write-Back Patch**: 可审阅的最小源码补丁（或等价写回结果摘要）。

## Success Criteria _(mandatory)_

- **SC-001**: CLI 能在本仓库对代表性模块入口跑通 IR 导出与试跑，并输出可序列化、确定性工件。
- **SC-002**: CLI 能构建 AnchorIndex，并在 report-only 与 write-back 两种模式下输出可解释结果；write-back 幂等且最小 diff。
- **SC-003**: CLI 可在 CI 中用于门禁：工件可稳定 diff，且失败原因可行动。
- **SC-004**: CLI 能产出 `ir.validate.report.json` 与 `ir.diff.report.json`，并以 exit code=2 门禁化差异/违规。
- **SC-005**: `transform module` 在 Platform-Grade 子集内可对 state/action 做 batch 变更：report-only 输出 PatchPlan；`mode=write` 幂等写回；不确定项全部跳过并可解释。
