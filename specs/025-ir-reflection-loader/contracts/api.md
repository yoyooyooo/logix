# Contract: IR Reflection & Trial Run API

**Date**: 2025-12-24  
**Feature**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/025-ir-reflection-loader/spec.md`

> 本文件定义对外 API 与行为契约（以 `@logix/core` 为主事实源），用于后续实现与测试对齐。  
> 具体函数命名可在实现阶段微调，但必须满足下述语义与确定性约束。

## Terminology

- **Manifest IR / ModuleManifest**：平台可消费的模块结构摘要（JSON，可 diff）。
- **Static IR / StaticIR**：声明式推导关系的静态依赖图（JSON，可 diff）。
- **Trial Run**：在 Build Env 中受控试跑一次，导出 EvidencePackage + IR 摘要。
- **EvidencePackage**：005/020 已定义的证据包协议（events + summary，均为 JsonValue）。
- **Control plane evidence**：`RuntimeServicesEvidence`（scope/bindings/overridesApplied），用于解释“控制面覆写为何生效”。

## Public API (core)

### `Reflection.extractManifest(module, options?)`

**Purpose**: 从用户导出的 `Module` 对象提取 `ModuleManifest`（不依赖 AST）。

**Inputs**:

- `module`：与 024 的 program runner **同形**（首个载体）：`AnyModule` / `ModuleImpl`（最终对象形状，可能由工厂/trait 组合生成；也可能已被 `.implement(...)` 变为可运行蓝图）。
- `options?`：
  - `includeStaticIr?: boolean`：是否尝试导出 `StaticIR`（默认可为 false，以保持 Manifest slim）。
  - `budgets?: { maxBytes?: number }`：输出裁剪预算（超限必须显式降级或标注）。

**Behavior**:

- MUST 输出可 `JSON.stringify` 的对象；不得包含 Schema/闭包/Effect 本体。
- MUST 保持确定性：数组与对象字段排序稳定；`meta` 仅允许稳定、可复现元信息（禁止时间戳/随机/机器特异信息）。
- `digest` 必须只由结构字段决定（不包含 `meta/source`），用于减少 CI diff 噪音。
- Schema 相关默认只输出 `schemaKeys`；若未来引入 Schema→JSON Schema 转换，可通过可选字段扩展，但不得破坏确定性。

### `Reflection.exportStaticIr(module, options?)`

**Purpose**: 为具备声明式 traits 的 module 导出 `StaticIR`（FR-010）。

**Behavior**:

- MUST 复用 `StateTrait.exportStaticIr` 的 canonical 形态（见 `specs/025-ir-reflection-loader/data-model.md`）。
- 若 module 不包含可导出关系（例如无 traits），MUST 返回 `undefined` 或空对象（但调用语义稳定）。

### `Reflection.diffManifest(before, after, options?)`（拟新增）

**Purpose**: 对比两份 `ModuleManifest`，输出可机器消费且可 UI 渲染的差异摘要（CI Contract Guard；FR-009）。

**Inputs**:

- `before: ModuleManifest`
- `after: ModuleManifest`
- `options?`（可选）：
  - `metaAllowlist?: string[]`：用于降噪；当提供时仅对 allowlist 内的 meta keys 产出 meta 相关的变更（其余 meta 视为忽略/不出现在 diff 中）。

**Outputs**:

- `ModuleManifestDiff`（schema：`specs/025-ir-reflection-loader/contracts/schemas/module-manifest-diff.schema.json`）

**Behavior**:

- MUST 确定性：同一输入必须产出同序/同内容的 diff（含 `changes[]` 顺序）。
- MUST 同时服务 CI 与 UI：diff 条目必须携带稳定 `severity` 与定位信息（`pointer` 使用 JSON Pointer）。
- meta/source 的默认口径：
  - meta 变化默认归类为 `RISKY`（不得作为 breaking；可用 `metaAllowlist` 降噪）。
  - source 变化默认归类为 `INFO`（不得作为 breaking；不得影响 digest）。
- `verdict` 的默认判定：
  - `FAIL`：存在任意 `severity=BREAKING`
  - `WARN`：无 BREAKING，但存在 `severity=RISKY`
  - `PASS`：只有 INFO 或无变化

### `Observability.trialRun(program, options?)`

**Purpose**: 受控试跑任意 Effect 程序并导出 EvidencePackage（已有实现，025 复用）。

**Key behavior (contracted)**:

- MUST 创建 `Scope` 并在 program 完成后 `Scope.close`，保证释放资源与取消 fibers（避免进程悬挂）。
- CI/平台场景 MUST 支持显式注入 `runId`（禁止默认非确定性 runId 用于 diff）。
- EvidencePackage.summary 必须是 JsonValue；可包含 `runtime.services`（RuntimeServicesEvidence）等摘要。

### `Observability.trialRunModule(module, options?)`（拟新增）

**Purpose**: 对 module 做一次“构建/装配阶段”的受控试跑，并导出 `TrialRunReport`（平台/CI 入口）。

**Inputs**:

- `module`：同 `extractManifest`
- `options?`：
  - `runId` / `source` / `startedAt`：对齐 trialRun（CI 必须提供 runId）
  - `buildEnv?: { config?: Record<string, string|number|boolean>; hostKind?: "node"|"browser" }`
  - `layer?: Layer.Layer<any, any, any>`：可选额外 Layer（例如提供可 Mock 的依赖），与 `trialRun(options.layer)` 对齐
  - `diagnosticsLevel?: "off"|"light"|"full"`
  - `maxEvents?: number`
  - `trialRunTimeoutMs?: number`：试跑窗口（超时则归类为 `TrialRunTimeout`）
  - `closeScopeTimeout?: number`：释放收束窗口（语义复用 024；超时则归类为 `DisposeTimeout`）
  - `budgets?: { maxBytes?: number }`

**Behavior**:

- MUST 在 BuildEnv 中执行，并对“构建态缺失依赖（Service/Config）”提供可行动错误：
  - `TrialRunReport.environment.missingServices[]` / `TrialRunReport.environment.missingConfigKeys[]` 必须给出缺失清单（至少其一非空）。
  - 同时通过 `TrialRunReport.error.code="MissingDependency"`（或等价、可稳定匹配的 code）标注失败类别。
- MUST 输出可序列化的 `TrialRunReport`，其中：
  - `environment` 至少包含 `tagIds/configKeys`（观测集合）与 `missingServices/missingConfigKeys`（违规摘要；允许非穷尽，但必须可行动）。
  - 控制面证据 MUST 复用 020 的 schema；推荐落点：`TrialRunReport.evidence.summary.runtime.services`（与 020 `RuntimeEvidencePackage` 一致）。
- MUST 在失败时尽可能携带可解释 IR：
  - 至少输出 `TrialRunReport.environment` 的缺失依赖摘要；
  - 若能提取 `manifest`，则一并输出；提取失败或超限时允许省略该字段。
- MUST 在预算/时间超限时以结构化错误失败（不得 silent truncate）：
  - 试跑窗口超时：`TrialRunReport.error.code="TrialRunTimeout"`
  - 释放收束超时：`TrialRunReport.error.code="DisposeTimeout"`（语义复用 024 的 `closeScopeTimeout`）
  - 输出体积超限：`TrialRunReport.error.code="Oversized"`
  - 其他失败：`TrialRunReport.error.code="RuntimeFailure"`

## Non-goals

- 不要求在 025 交付 Studio/HMR/数字孪生；但 API/数据形态不得阻塞它们。
- 不承诺“静态推导所有依赖”：Environment IR 是观测集合，必须允许不覆盖分支/条件路径。
- 不承诺“通用 IO 禁止策略/副作用拦截”（例如 build 阶段的 `Effect.sync` 真实 IO）；本期构建态违规以“缺失依赖（Service/Config）”为主信号，后续如需再引入 host-level guard/白名单能力。
