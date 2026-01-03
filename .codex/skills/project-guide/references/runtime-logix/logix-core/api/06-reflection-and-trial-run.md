# `@logix/core` · Reflection 与 Trial Run（IR/证据提取）

> **定位**：面向 CI / Studio / Agent 的“可对比、可解释、可回放”提取能力（不读 AST），把模块结构与试跑证据统一降解为最小 IR（Static IR + Dynamic Trace）。

## 这块能力解决什么问题

- **不读 AST**：只基于用户导出的 `Module`（与 024 program runner 同形）提取结构摘要与 IR。
- **可 diff**：产物必须可 `JSON.stringify`，并在“同输入”场景下尽可能确定性（排序稳定、digest 稳定）。
- **可解释**：试跑失败时能区分“缺失依赖 / 超时 / 释放收束失败 / 体积超限 / 运行时错误”，并给出可行动提示。
- **控制面可解释**：复用 `RuntimeServicesEvidence`（bindings/overridesApplied），解释“为什么选了某个 impl”。

如果你是从 `examples/logix-sandbox-mvp/src/ir/IrPage.tsx` 这个页面反推全链路（包含 sandbox 编译/运行/传输），直接读：[`07-ir-pipeline-from-irpage.md`](07-ir-pipeline-from-irpage.md)。

相关实现入口（代码）：

- `packages/logix-core/src/Reflection.ts`
- `packages/logix-core/src/internal/reflection/*`
- `packages/logix-core/src/internal/observability/trialRunModule.ts`
- `packages/logix-core/src/internal/observability/runSession.ts`

## Reflection（静态结构反射）

### `Reflection.extractManifest(module, options?)`

用途：从 `module` 提取 `ModuleManifest`（结构摘要），供 CI/平台做 breaking 检测或 UI 渲染。

输入：

- `module`：`AnyModule | ModuleImpl`（与 024 的 program module 同形）
- `options.includeStaticIr?: boolean`：是否内嵌 `StaticIR`
- `options.budgets.maxBytes?: number`：输出裁剪预算（按 UTF‑8 bytes）

输出（概要）：

- `moduleId/actionKeys/actions/effects?/schemaKeys/logicUnits/source/meta/staticIr/digest`

确定性口径：

- 数组/键排序稳定（用于 diff）。
- `digest` 只由结构字段决定（不含 `meta/source/staticIr` 本体），用于 CI 降噪与快速对比（但包含 `staticIr.digest`）。
- 超预算时会 deterministic 地裁剪，并以 `meta.__logix` 标记裁剪信息（truncated/dropped/truncatedArrays）。

### `Reflection.exportStaticIr(module, options?)`

用途：导出声明式 traits 的静态依赖图（Static IR），canonical 形态复用 `StateTrait.exportStaticIr`。

说明：

- module 不包含可导出的 traits 时，返回 `undefined`（语义稳定，不抛错）。

### `Reflection.diffManifest(before, after, options?)`

用途：对比两份 `ModuleManifest`，产出可机器消费/可 UI 渲染的差异摘要（CI Contract Guard 与 UI 共享口径）。

要点：

- `changes[]` 顺序稳定（同输入必得同序）。
- `meta` 默认归类为 `RISKY`（可用 `metaAllowlist` 降噪）。
- `verdict`：存在 `BREAKING` → `FAIL`；无 BREAKING 但有 `RISKY` → `WARN`；否则 `PASS`。

## Trial Run（受控试运行）

### `Observability.trialRunModule(module, options?)`

用途：在 BuildEnv 中对 `module` 做一次“装配/启动阶段”的受控试跑，导出 `TrialRunReport`：

- `EnvironmentIr`：观测到的 `tagIds/configKeys` + 缺失依赖摘要（missingServices/missingConfigKeys）
- `EvidencePackage`：可选事件序列（maxEvents 裁剪）+ summary（含控制面证据）
- `manifest/staticIr`：尽可能携带，便于“失败也能解释”

关键语义：

- **不执行业务 main**：只做 module boot + 受控窗口观察 + 关闭 scope 收束。
- **两段超时**：
  - `trialRunTimeoutMs`：试跑窗口超时 → `TrialRunTimeout`
  - `closeScopeTimeout`：释放收束超时（语义复用 024）→ `DisposeTimeout`
- **runId 必须可注入**：CI/平台必须显式提供 `runId`，避免不可对比的隐式标识。
- **预算裁剪**：`budgets.maxBytes` 约束整个 `TrialRunReport` 体积；超限会降级为 `Oversized` 并携带 dropped 列表。

错误分类（`TrialRunReport.error.code`）：

- `MissingDependency`：构建态缺失服务/配置（报告必须携带缺失清单）
- `TrialRunTimeout`：试跑窗口超时（提示优先指向装配阻塞）
- `DisposeTimeout`：释放收束超时（提示优先指向 fibers/listener/resource handle）
- `Oversized`：报告体积超预算（提示调小 maxEvents / budgets）
- `RuntimeFailure`：其他运行时失败（兜底）

控制面证据：

- `TrialRunReport.environment.runtimeServicesEvidence`：`RuntimeServicesEvidence`（scope/bindings/overridesApplied）
- 目标：解释“为什么选了这个 impl”，避免平台/CI 再造第二套真相源

## 与 024 Program Runner 的关系

- 024 的核心是 **boot + main + scope close** 的可复用入口（`openProgram/runProgram`）。
- 025 的 Trial Run 复用同一套 **boot + scope close** 心智模型，但不执行 `main`：
  - 试跑窗口用于采集证据/IR；
  - 收束阶段复用 024 的 `closeScopeTimeout` 与 `DisposeTimeout` 语义。
