# Research: Workbench Contract Suite（036：031-035 统一验收入口）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/036-workbench-contract-suite/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/036-workbench-contract-suite/plan.md`

> 本文件只固化“关键裁决/原则/权衡”，用于避免 036 在实现阶段漂移成“只为 Workbench UI 服务的 demo”。  
> IR/TrialRun 的实现链路与字段语义，直接外链到 runtime SSoT（避免重复叙事）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/07-ir-pipeline-from-irpage.md`。

## Decisions

### D001：IR-first（Artifacts 作为客观裁判）

**Decision**：036 的 Integrated Verdict 必须完全由“可序列化工件”推导（TrialRunReport / Manifest / StaticIR / Diff / Evidence 等），不得依赖 LLM 自评或读取 runtime 私有结构。

**Rationale**：

- 平台引入 Agent 后，真正稳定的闭环不是“模型说它对”，而是“平台给出可复现证据 + 机器可判定 verdict”。
- IR-first 让 Workbench/CI/Agent 三个入口共享同一事实源，避免并行真相源。

**Implications**：

- runId / instanceId / txnSeq / opSeq / eventSeq 必须稳定可对齐（否则 diff 与回放失真）。
- 预算/截断必须显式可解释（否则“静默坏掉”）。

**Links**：

- Reflection/TrialRun（API 语义）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/06-reflection-and-trial-run.md`
- IrPage→Sandbox→TrialRun 全链路（字段语义）：`.codex/skills/project-guide/references/runtime-logix/logix-core/api/07-ir-pipeline-from-irpage.md`
- 025 的 schema 基线（Manifest/StaticIR/TrialRunReport/Diff）：`specs/025-ir-reflection-loader/contracts/schemas/`

### D002：AST 不是裁判，只能是“编辑工具”

**Decision**：036 不需要引入 AST 作为验收基础设施；AST（若引入）只用于：

- 作为代码修改的“可审阅载体”（AST Patch/文本 Patch）；
- 或作为 IDE/编辑器体验（跳转/重构/格式保真）的实现细节。

**Rationale**：

- AST 擅长表达“语法结构”，不擅长表达“运行时可验证语义”（依赖装配、服务覆写、受控试跑证据、预算截断等）。
- 把 AST 当裁判会导致“语义需要靠推断”，容易引入平台侧并行真相源与不可解释失败。

### D003：Agent 参与出码的正确闭环是“工具面 + 证据面”

**Decision**：平台给 Agent 的主要价值是 **可控、最小特权、可复现** 的 Context Pack + 工具调用面，而不是把整个仓库/一堆日志塞进上下文。

**最小工具面（概念）**：

- `trialRun`：受控试跑，产出 TrialRunReport + EvidencePackage（按预算裁剪）
- `extractArtifacts`：导出/归一化 artifacts（Manifest/StaticIR/Diff/PortSpec/TypeIR/...）
- `diffArtifacts`：同口径对比（输出稳定 verdict/changes）
- `queryEvidence`：按锚点过滤 evidence（降低噪音）
- `buildContextPack`：把“事实 + 缺口 + 约束 + target”打包给 Agent（可审阅）

**Links（背景草案，不作为 036 SSoT）**：

- Context Pack 原则与最小字段：`docs/specs/drafts/topics/platform-workbench-prd/33-alignment-and-diagnostics.md`
- Lean Context 与治理：`docs/specs/sdd-platform/workbench/17-project-governance-and-lean-context.md`

### D004：语义化 UI 与画布可以端口化打通（BindingSchema 是接线层）

**Decision**：语义化 UI 不需要变成“另一套蓝图系统”。它在协议层只需要：

- `UiBlueprint` 声明 UI 端口面（`uiPropKey/uiEventKey`）
- `BindingSchema` 把 UI 端口面接到模块端口面（`PortAddress`）
- 运行证据（UI_INTENT）只作为 TrialRun/ContractSuite 的 evidence/artifact 输入，不作为语义裁判

**Links**：

- 端口化打通小抄（036）：`specs/036-workbench-contract-suite/semantic-ui-port-bridge.md`
- 语义 UI 草案：`docs/specs/sdd-platform/workbench/ui-ux/04-semantic-ui-modeling.md`
- Semantic UI Mock 分层：`docs/specs/drafts/topics/sandbox-runtime/20-dependency-and-mock-strategy.md`

## Open Questions（先落盘，后续再定优先级）

1. **降级模型**：哪些工件缺失允许 WARN（并给出 action），哪些必须 FAIL（例如 key/version 不匹配、可引用空间收缩）？
2. **工件集合**：031-035 的“代表性模块”最小样例集是什么，能稳定覆盖 rules、UI projection、scenario blueprint、ports/typeIR？
3. **证据裁剪**：EvidencePackage 的 `maxEvents/diagnosticsLevel` 如何与 verdict 的可解释性达成最小平衡？
4. **Codegen 黑盒边界**：哪些信息可以在 IR 层白盒化（可解释/可判定），哪些必须保持为“用户代码/第三方库”的黑盒并以试跑证据间接约束？
