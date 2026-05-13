# Feature Specification: Logix Playground

**Feature Branch**: `164-logix-playground`  
**Created**: 2026-04-28  
**Status**: Done  
**Input**: User description: "Create packages/logix-playground as the user-facing Logix Playground product surface. The Playground should support opening curated examples from docs in a new tab, CodeSandbox-like React UI preview, shared editable file model, source tabs, logs/errors, and Logix-specific Program run/check/trial diagnostics over the same source files. It should first prove integration with 1-2 examples from examples/logix-react, then become reusable by apps/docs. Sandpack may be used as the React preview/editing engine, but Logix run/check/trial and report authority must stay owned by Logix. Do not put product UI into @logixjs/sandbox; sandbox remains worker transport."

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-7, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9, KF-10

## Current Role

本页是 `packages/logix-playground` 的已完成需求事实源。长期产品工作台口径已升格到 [../../docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md)。本页保留 164 的 package 建立、首批 examples proof、React UI preview、源码浏览/编辑、Logix Program run/check/trial 关系与 closure 记录。

本页不规划实现步骤，不替代后续 `plan.md`。实现计划必须在本页 owner、边界、closure gate 已冻结后展开。

## Context

`163-runtime-playground-terminal-runner` 已证明非 UI Program 可以在 browser worker 中运行，并能把 `Runtime.run` 的业务结果面与 `Runtime.check / Runtime.trial` 的诊断报告面分开。用户文档下一步需要面向读者的 Playground：从文档或 examples 打开一个独立页面，查看源码，运行示例，预览 React UI，并对同一份源码运行 Logix 的 run/check/trial。

早期 `examples/logix-sandbox-mvp` 已有 Monaco + sandbox worker + internal alignment lab，但它包含旧实验形态、内部调试 UI、kernel selection、mock UI intent 和 app-local result shape。它可以作为经验来源，不能直接成为用户文档 Playground 的 public mental model。

新方向固定为：

- `packages/logix-playground` 承接用户可见 Playground 产品面，公开面按 shell-first 收口。
- `@logixjs/sandbox` 继续保持 worker transport，不承接 Playground UI 和 product contract。
- React UI preview 可采用现成 preview/edit engine，但 Logix Program run/check/trial 的结果、诊断和报告事实源必须由 Logix Playground 自己持有。
- 同一份 `ProjectSnapshot` 必须同时驱动 React preview 与 Logix Program run/check/startup-trial，避免 UI 一份执行输入、诊断另一份执行输入。

## Scope

### In Scope

- 新建 `packages/logix-playground` 作为可被 `examples/logix-react` 与 `apps/docs` 复用的 shell-first Playground 产品包。
- 用户文档或 example gallery 中打开独立 Playground 路由的体验。
- Curated project authority：一个 example 声明最小 project identity、源码文件、preview 入口、Logix Program 入口、能力位和必要 fixture；标题、说明、依赖、docs 元数据和 adapter 配置不进入 v1 公开 contract。
- CodeSandbox-like React UI preview：支持真实 React component、DOM 交互、RuntimeProvider、`useModule(Program)`、form、Suspense、error boundary。
- ProjectSnapshot：源码 viewer/editor、React preview、Program run/check/startup-trial 必须读取同一份当前执行快照。快照至少覆盖当前文件、生成文件、resolved entries、依赖、mocks、diagnostic options 和 deterministic env seed。
- Source tabs / file tree、preview panel、logs/errors panel、Program result panel、Check/Trial report panel。
- 默认用户路径固定为 Source/Preview/Run 优先；Check/Trial 作为 on-demand diagnostics 展开。
- Reset / reload / theme / viewport / strict mode 等用户可理解的 preview controls。
- 第一批 proof：从 `examples/logix-react` 规整并接入 1 到 2 个示例，至少覆盖一个真实 React UI + Program 共享逻辑的场景。
- Docs readiness：产物必须能被 `apps/docs` 以同一 curated project authority 或同源生成索引引用，而不要求 docs 先完成全部 example 整理。
- Playground 中的 Logix diagnostics 必须复用 core `VerificationControlPlaneReport`，第一轮 Trial 固定为 startup trial。
- 包边界和 public surface guards，确保 sandbox 不长出 public Playground 产品 API。

### Out of Scope

- 把 `examples/logix-react` 所有 demo 一次性整理完。
- 把 `examples/logix-sandbox-mvp` 原样迁移为用户文档 Playground。
- 把 Playground UI、registry 或 example product contract 放进 `@logixjs/sandbox`。
- 把 Sandpack 或其他第三方 preview engine 变成 Logix Playground 的公开事实源或公开 adapter contract。
- 任意 npm 依赖安装、后端构建、账户级持久化项目空间。
- UI host deep trial、scenario trial、compare 或 replay 调试器作为本页 closure blocker。
- 将 raw trace compare 作为默认用户面板。

## Imported Authority _(recommended)_

- [../163-runtime-playground-terminal-runner/spec.md](../163-runtime-playground-terminal-runner/spec.md)
- [../../docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [../../docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [../../docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md)
- [../../docs/standards/logix-api-next-guardrails.md](../../docs/standards/logix-api-next-guardrails.md)
- [../../docs/standards/user-docs-writing-standard.md](../../docs/standards/user-docs-writing-standard.md)

## Closure & Guardrails _(recommended for closure / cutover / hub specs)_

### Closure Contract

`164` 关闭时，必须能展示下面闭环：

```text
docs/example entry
  -> Open in Playground
  -> source files view
  -> React live preview from the same ProjectSnapshot
  -> user interaction changes preview behavior
  -> Logix Runtime.run over the same ProjectSnapshot when Program main exists
  -> Logix Runtime.check/trial(mode="startup") diagnostic report over the same ProjectSnapshot when Program exists
  -> reset/reload restores isolated preview state
```

闭环要求：

- 至少 1 个 `examples/logix-react` 示例以 Playground project registry 形式接入，并能真实 preview React UI。
- 任何同时声明 preview 与 Program 的 project，React preview 与 Program run/check/startup-trial 都必须从同一 `ProjectSnapshot` 求值。
- 至少 1 个接入示例的 React preview 与 Program run/check/startup-trial 共享同一个 logic/source file，并证明修改该文件会同时影响两侧。
- 修改共享 logic/source 后，React preview 与内部 runner 必须基于同一份更新后的 `ProjectSnapshot`。
- Program Run result 不能伪装成 `VerificationControlPlaneReport`。
- Check/Trial report 必须来自 core `VerificationControlPlaneReport`。
- 默认视图必须优先呈现 Source/Preview/Run，Check/Trial 不作为首次进入页面时的主阻塞面。
- `@logixjs/sandbox` public root 和 public subpaths 不新增 Playground UI/product API。
- 用户文档后续能通过同一 curated project authority 或同源生成索引打开 Playground，而不复制 playground shell。

### Must Cut

- 把 `@logixjs/sandbox` 扩成 UI Playground 包。
- 只用第三方 preview engine 的内建概念表达 Logix run/check/trial。
- React preview 一份 `ProjectSnapshot`、Program diagnostics 另一份 `ProjectSnapshot`。
- 公开 `FileModel / ProgramEngine / PreviewAdapter / Evidence` 作为 v1 public API。
- 公开自定义 `programExport / mainExport` runner vocabulary。
- 只展示日志或 JSON result 而没有真实 React UI preview 的 React Playground。
- 把 `examples/logix-sandbox-mvp` 的旧 result shape、mock UI intent 或 alignment lab 文案带入用户文档主体验。
- 默认开放任意 npm install / remote build 作为第一版 closure 需求。
- 为假想兼容保留旧 `Runtime.runProgram` 文档心智。
- docs 与 examples 为同一 project id 维护两份平行 registry truth。

### Reopen Bar

只有下面证据允许重开本页：

- `ProjectSnapshot` 无法同时支撑 React preview 与 Logix Program run/check/startup-trial。
- React UI preview 无法在隔离容器中稳定 cleanup Runtime、Scope、subscription 和 timer。
- 用户文档需要的 Playground 必须支持任意 npm 依赖安装，否则核心用户场景无法成立。
- 第三方 preview engine 的限制导致 Logix diagnostics 无法与同源文件可靠对齐。
- 将 Playground UI 放入 `@logixjs/sandbox` 经 dominance proof 明显优于独立包，且不会扩张 sandbox public mental model。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Open React Example Playground (Priority: P1)

作为文档读者，我希望从文档或 example gallery 打开一个独立 Playground 页面，看到源码和真实 React UI preview，这样我能直接观察 Logix React 示例的行为。

**Traceability**: NS-4, NS-7, KF-9, KF-10

**Why this priority**: 没有真实 UI preview，form、provider、hooks、Suspense 等 React 场景无法通过文档 demo 被理解。

**Independent Test**: 用一个 registry 中的 React example 打开 Playground 页面，确认 source files 可见，preview 成功 mount，用户交互后 UI 状态变化可见。

**Acceptance Scenarios**:

1. **Given** 一个已登记 React example，**When** 用户打开它的 Playground route，**Then** 页面展示源码列表、源码内容、React preview 和初始运行状态。
2. **Given** preview 中有可交互控件，**When** 用户点击或输入，**Then** UI 状态按 example 逻辑变化。
3. **Given** 用户点击 Reset，**When** preview 重新加载，**Then** UI、Runtime scope、subscription、timer 和错误状态回到初始状态。

---

### User Story 2 - Run Logix Program From Same Source (Priority: P1)

作为读者或 Agent，我希望在同一个 Playground 中对示例的 Program 执行 Run、Check 和 Trial，这样我能把 UI 行为、业务结果和诊断报告联系起来。

**Traceability**: NS-3, NS-8, NS-10, KF-3, KF-8

**Why this priority**: Logix Playground 的差异化价值在于运行时和诊断面。只做 UI preview 会退化成普通 React playground。

**Independent Test**: 对同一个 example 同时打开 preview 和 Program panels，确认 Run 返回 JSON-safe result，Check/Trial 返回 core report，且三者基于同一份 `ProjectSnapshot`。

**Acceptance Scenarios**:

1. **Given** 一个 example 声明了 Program 与 main，**When** 用户点击 Run，**Then** Playground 显示 JSON-safe result、runId、duration 和 bounded failure 信息。
2. **Given** 同一个 example 支持 Check/Trial，**When** 用户点击 Check 或 Trial，**Then** Playground 显示 core `VerificationControlPlaneReport` 的 compact summary 与完整报告，其中 Trial 固定为 `mode="startup"`。
3. **Given** 用户修改 shared logic file，**When** preview 热更新并再次运行 Program，**Then** preview 和 Program result 都反映同一份修改后的逻辑。
4. **Given** 用户首次打开一个支持 Program 的 Playground，**When** 页面完成初始呈现，**Then** Source/Preview/Run 是默认主路径，Check/Trial 只在用户显式展开或点击后运行。

---

### User Story 3 - Inspect Errors and Logs (Priority: P1)

作为读者或文档维护者，我希望 Playground 捕获 preview 错误、console logs、编译错误和运行错误，这样失败示例可以被理解和修复。

**Traceability**: NS-8, NS-10, KF-8

**Why this priority**: Playground 一旦支持编辑和真实 UI preview，就必须提供可解释失败面，否则会变成黑盒。

**Independent Test**: 用一个故意抛错的 example 打开 Playground，确认 preview 错误被边界捕获，错误面板显示可读信息，重置后可恢复。

**Acceptance Scenarios**:

1. **Given** preview mount 期间抛出错误，**When** Playground 捕获错误，**Then** 页面显示错误摘要和可下钻信息，不导致外层页面崩溃。
2. **Given** example 输出 console logs，**When** 用户运行或交互，**Then** logs panel 按顺序显示 bounded 日志。
3. **Given** Program run 失败，**When** 用户查看 result panel，**Then** 失败被归类为 compile、runtime、timeout、serialization 或 worker failure，不伪装为 Trial report。

---

### User Story 4 - Reuse Playground In Docs (Priority: P2)

作为文档维护者，我希望用户文档能通过 registry id 或 route 打开同一个 Playground，而不用复制 shell、preview host 或 diagnostics panels。

**Traceability**: NS-4, KF-9

**Why this priority**: 当前目标是最终收口到用户文档。若 examples proof 不能被 docs 复用，它只能算实验页。

**Independent Test**: 在 docs 侧以一个 registry entry 打开 Playground route，确认复用同一 shell，并能进入对应 example。

**Acceptance Scenarios**:

1. **Given** docs 页面引用一个 Playground entry，**When** 用户点击 Open in Playground，**Then** 新标签页打开稳定 route，并定位到该 entry。
2. **Given** docs 与 examples 使用相同 Playground package，**When** 修改 shell 行为，**Then** docs 与 examples 不需要复制 UI 代码即可获得一致体验。
3. **Given** docs 引用一个 example，**When** 解析 project id，**Then** 它使用 examples 侧同一 curated project authority 或同源生成索引，而不是重写同名项目元数据。

---

### User Story 5 - Keep Sandbox Narrow (Priority: P2)

作为维护者，我希望 Playground 产品面独立于 `@logixjs/sandbox`，这样 worker transport 不会被 UI、registry、文档体验和第三方 editor 依赖污染。

**Traceability**: NS-7, NS-8, KF-10

**Why this priority**: 163 已经裁定 sandbox 不能长成第二套 runtime/report 产品。164 必须延续这个边界。

**Independent Test**: 检查 `@logixjs/sandbox` public root、subpaths 和 docs examples，确认没有 Playground UI 或 product registry export。

**Acceptance Scenarios**:

1. **Given** consumer import `@logixjs/sandbox`，**When** 查看 public exports，**Then** 不出现 Playground shell、entry registry、React preview 或 product result types。
2. **Given** Playground 需要 worker compile/run，**When** 它使用 sandbox，**Then** sandbox 只作为 transport dependency 被调用。

### Edge Cases

- Example 没有 Program 入口时，必须仍可 preview React UI，但 Run/Check/Trial panels 必须明确不可用。
- Example 没有 React preview 入口时，必须仍可作为 Program-only playground 运行。
- Shared file 修改后，preview 成功但 Program compile 失败时，两边状态必须分别呈现，不能互相覆盖。
- Program Run 超时、Trial 超时、preview mount 超时必须区分。
- Preview iframe 崩溃或被浏览器阻止时，外层 Playground 必须仍可展示源码和错误。
- Logs 或 result 过大时必须 bounded 显示，并标记截断。
- Form/query/i18n 等需要外部服务的 demo 必须声明 mock 或 fixture；缺失时要显示可解释错误。
- 第三方 preview engine 不可用时，Program run/check/trial 不应受影响。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, NS-7) System MUST provide a reusable Logix Playground product package that can be consumed by examples and docs.
- **FR-002**: (NS-4, KF-9) System MUST let docs or example pages open a stable, independently addressable Playground route for a registered example.
- **FR-003**: (NS-4, NS-7) System MUST support a minimal project declaration that describes stable id, source files, preview entry, fixed `Program/main` Program entry, capability flags, and required fixtures.
- **FR-004**: (NS-4, NS-8) System MUST keep a shared `ProjectSnapshot` so source view/editor, React preview, Program Run, Check, and startup Trial read the same execution coordinate.
- **FR-005**: (NS-7) System MUST support real React UI preview for registered examples, including DOM interaction and isolated reset.
- **FR-006**: (NS-8, NS-10) System MUST support Logix Program Run over registered examples when a Program and main entry are available.
- **FR-007**: (NS-8, NS-10) System MUST support Logix Check and startup Trial over registered examples when a Program entry is available.
- **FR-008**: (NS-10) Program Run output MUST remain a bounded JSON-safe result projection and MUST NOT be confused with Trial report output.
- **FR-009**: (NS-10) Check/Trial output MUST reuse core `VerificationControlPlaneReport` and MUST NOT introduce a playground-owned diagnostic report schema.
- **FR-010**: (NS-8, NS-10) System MUST capture preview errors, compile errors, runtime errors, unhandled rejections, and console logs in bounded user-visible panels.
- **FR-011**: (NS-7, KF-10) System MUST keep preview/edit engine substitution internal; third-party engine types, config, and adapter contracts MUST NOT become public Playground contract.
- **FR-012**: (NS-7, KF-10) System MUST NOT export Playground product UI, registry, editor, preview host, or product result contracts from `@logixjs/sandbox`.
- **FR-013**: (NS-4, KF-9) System MUST prove docs readiness by exposing a consumption shape that `apps/docs` can use without copying playground shell code or maintaining parallel project registry truth.
- **FR-014**: (NS-4, NS-7) System MUST migrate or wrap at least one `examples/logix-react` example into the new registry and run it through the Playground.
- **FR-015**: (NS-8) Any registered project that declares both preview and Program capability MUST evaluate both from the same `ProjectSnapshot`; at least one registered example MUST prove a shared logic/source file affects React preview and Program Run/Check/Trial.
- **FR-016**: (NS-10) System MUST provide reset/reload semantics that release preview Runtime state, Effect scopes, subscriptions, timers, and captured errors.
- **FR-017**: (NS-3, NS-8) System MUST expose a derived, JSON-safe summary for an Agent to determine which file changed, whether preview passed, whether Program Run passed, and whether Check/Trial passed; this summary MUST NOT become an independent mutable evidence ledger.
- **FR-018**: (NS-4) System MUST preserve a source-first reading path: every previewed behavior must be traceable to a visible source file tab or declared generated source.
- **FR-019**: (NS-7, KF-10) System MUST keep public `@logixjs/playground` surface shell-first and MUST NOT export public `FileModel`, `ProgramEngine`, `PreviewAdapter`, `Evidence`, runner projection, or custom export-name contracts in v1.
- **FR-020**: (NS-4, NS-10) System MUST keep Source/Preview/Run as the default user path and expose Check/Trial only as on-demand diagnostics.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: (NS-10) Initial playground open for curated examples SHOULD present source and loading UI within 2 seconds on a typical local dev machine.
- **NFR-002**: (NS-10) Preview reset SHOULD complete within 1 second for baseline examples, excluding intentional async demo delays.
- **NFR-003**: (NS-10) Console logs, run results, and diagnostic reports MUST have bounded display defaults and explicit truncation markers.
- **NFR-004**: (NS-10) Playground diagnostics MUST use stable run identifiers and example identifiers; no random id may be required for user-visible correlation.
- **NFR-005**: (NS-8) Preview failures MUST remain isolated to the preview surface and MUST NOT crash the outer Playground shell.
- **NFR-006**: (NS-8, NS-10) Shared snapshot updates MUST be observable by both preview and Program diagnostics without hidden duplicate execution state.
- **NFR-007**: (NS-4) User-facing docs that link to Playground MUST explain the three faces in stable vocabulary: Preview, Run, Trial.
- **NFR-008**: (NS-7, KF-10) Introducing editor or preview dependencies MUST NOT force those dependencies into `@logixjs/sandbox`.
- **NFR-009**: (NS-10) Any test that validates React preview must include at least one browser-level assertion that the preview rendered non-empty content and responds to user interaction.

### Key Entities _(include if feature involves data)_

- **Playground Project**: A registered example unit with stable id, source files, preview entry, fixed `Program/main` Program entry, capability flags, and required fixtures.
- **Project Snapshot**: The single execution coordinate derived from a Playground Project and current edits. It includes current files, generated files, resolved entries, dependencies, mocks, diagnostic options, and deterministic env seed.
- **Playground File**: A named source file with current content, original content, language, read-only/editable status, and visibility metadata.
- **Preview Session**: A single isolated UI preview run with session id, status, mount state, logs, errors, reset count, and viewport/theme settings.
- **Program Session**: A Logix Program execution or diagnostic run with runId, entry metadata, result projection or control-plane report, timing, and failure classification.
- **Playground Summary**: A compact derived machine-readable summary that links snapshot revision, changed files, preview status, Run status, Check/Trial status, and user-visible errors without becoming a second report truth.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-4, KF-9) A user can open a registered React example Playground from an example/docs entry and see source plus live preview within 2 seconds on local dev.
- **SC-002**: (NS-7, NS-8) Any registered project with both preview and Program capability uses one `ProjectSnapshot` for source view, React preview, Program Run, Check, and startup Trial.
- **SC-003**: (NS-7) At least one registered React preview proves real UI behavior by passing a browser test that interacts with the preview and observes a visible state change.
- **SC-003a**: (NS-7) Automated browser tests may use an internal stable preview witness for deterministic assertions, while Sandpack remains the normal preview adapter and must have package-level snapshot projection coverage.
- **SC-004**: (NS-10, KF-8) A Program Run result and a Trial report from the same example are distinguishable by shape and by UI panel, with no shared diagnostic schema invented by Playground.
- **SC-005**: (NS-8) Editing or replacing a shared logic file changes both React preview behavior and Program Run output in an automated test, and Program execution is guarded from reading original files after edits.
- **SC-006**: (NS-4) `apps/docs` can reference a Playground entry by stable id through the same curated project authority or generated index without copying Playground shell implementation or reauthoring project metadata.
- **SC-007**: (NS-7, KF-10) Public exports of `@logixjs/sandbox` remain unchanged with respect to Playground product UI and registry concepts.
- **SC-008**: (NS-10) Preview crash, compile failure, Program Run failure, and Trial failure each appear in distinct bounded user-visible states in tests.
- **SC-009**: (NS-4, NS-10) Initial Playground render shows Source/Preview/Run without automatically running or expanding Check/Trial diagnostics.
