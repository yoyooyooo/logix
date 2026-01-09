# Implementation Plan: Sandbox 多内核试跑与对照（core/core-ng）

**Branch**: `058-sandbox-multi-kernel` | **Date**: 2025-12-28 | **Spec**: `specs/058-sandbox-multi-kernel/spec.md`  
**Input**: Feature specification from `specs/058-sandbox-multi-kernel/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

为 `@logixjs/sandbox` 增加“多内核资产注册 + 单次运行选择”的基础能力：Host 可提供多个 kernel variant（例如 core / core-ng）与 `defaultKernelId`，每次 `trialRunModule`/`run` 可选择 `kernelId` 并在结果中明确标识 `requestedKernelId/effectiveKernelId` 与 `KernelImplementationRef`。默认 `strict=true`（strict by default），任何无法按 requested 运行都失败；仅在 `strict=false` 且显式允许 fallback 时，才允许降级到 `defaultKernelId`，并必须记录 `fallbackReason`，避免静默回退污染对照与门禁。

补充：以 `examples/logix-sandbox-mvp` 作为 consumer/debug harness 接入 multi-kernel（注入 `kernelRegistry` + debug-only 的 `kernelId/strict/fallback` 选择 UI），并在结果面板展示 `requested/effective/fallbackReason/kernelImplementationRef`，用于验证对照链路不会漂移。

## Deepening Notes

- Decision: 默认 `strict=true`（strict by default），仅在运行请求显式传 `strict=false` 时进入 non-strict (source: spec clarify AUTO)
- Decision: 多内核且未提供 `kernelId` 时必须有 `defaultKernelId`，否则失败并返回 `availableKernelIds`，避免隐式默认污染对照 (source: spec clarify AUTO)
- Decision: fallback 是显式允许的 opt-in；fallback 目标固定为 Host 的 `defaultKernelId`，无 default 时不允许 fallback (source: spec clarify AUTO)
- Decision: `kernelId` 约束为 `[a-z0-9-]+`，推荐保留名 `core`/`core-ng` 用于对照 (source: spec clarify AUTO)
- Decision: RunResult/Report 必须总是包含 `requestedKernelId`/`effectiveKernelId` 与 `kernelImplementationRef`（复用 045；来源为 TrialRunReport.environment） (source: spec clarify AUTO)
- Decision: 内核资源默认同源；跨域仅在 Host 显式允许且可审计时启用 (source: spec clarify AUTO)
- Decision: 并发运行之间不得互相影响 kernel 选择（以单次运行会话为隔离边界） (source: spec clarify AUTO)
- Decision: `runId` 不得默认使用随机/时间戳；Host 优先显式提供，便捷默认值也必须是确定性的派生/序号并回显 (source: spec clarify AUTO)
- Decision: consumer 代表落点优先使用 `examples/logix-sandbox-mvp`（debug-only）。普通教学页面不暴露选择 UI，但仍应可读取/展示结果摘要字段用于解释链路 (source: follow-up)

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`、`@logixjs/sandbox`  
**Storage**: N/A（运行资产与结果仅内存态；Host 负责提供同源静态资源）  
**Testing**: Vitest（`packages/logix-sandbox`）；必要时用 `@effect/vitest` 管理 Effect 环境  
**Target Platform**: 现代浏览器（Web Worker）+ Node.js 20+（构建）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `specs/*`）  
**Performance Goals**: 单内核默认路径不新增额外常驻请求/分配；多内核仅在选择时额外加载对应内核资产；结果/证据有界（maxEvents/maxBytes）  
**Constraints**: 可序列化 DTO、确定性 `runId`（Host 显式提供）、strict/fallback 可解释且可门禁、consumer 不直接依赖 `@logixjs/core-ng`  
**Scale/Scope**: P1 支持 `core`/`core-ng` 两个 kernel variant；P2 支持扩展到更多 variant（不要求任意版本管理/远程包解析）

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `.codex/skills/project-guide/references/runtime-logix/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
  - Internal contracts & trial runs: does this feature introduce/modify internal
    hooks or implicit collaboration protocols; are they encapsulated as explicit
    injectable Runtime Services (no magic fields / parameter explosion), mockable
    per instance/session, and able to export evidence/IR without relying on
    process-global singletons?
  - Dual kernels (core + core-ng): if this feature touches kernel/hot paths or
    Kernel Contract / Runtime Services, does the plan define a kernel support
    matrix (core vs core-ng), avoid direct @logixjs/core-ng dependencies in
    consumers, and specify how contract verification + perf evidence gate changes?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - User-facing performance mental model: if this changes runtime performance
    boundaries or an automatic policy, are the (≤5) keywords, coarse cost model,
    and “optimization ladder” documented and aligned across docs/benchmarks/diagnostics?
  - Breaking changes: does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer)?
  - Public submodules: if this touches any `packages/*`, does it preserve the
    `src/index.ts` barrel + PascalCase public submodules (top-level `src/*.ts`,
    except `index.ts`/`global.d.ts`), move non-submodule code into
    `src/internal/**`, and keep `package.json#exports` from exposing internals?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性位于 Sandbox/Playground 基础设施层：Host 选择 `kernelId` → Worker 按选定内核编译/执行 → 通过 `@logixjs/core` 的 TrialRun 产出可序列化报告（含 `KernelImplementationRef`）→ docs/debug/CI 消费并对照。
- **Docs-first & SSoT**：协议与包 API 的裁决以 `packages/logix-sandbox/src/*` 为 SSoT；需要同步更新 `docs/specs/drafts/topics/sandbox-runtime/15-protocol-and-schema.md` 与 `docs/specs/drafts/topics/sandbox-runtime/25-sandbox-package-api.md`，避免协议口径漂移。
- **Contracts**：新增/调整 `@logixjs/sandbox` 的公共契约（KernelVariant/KernelSelection/RunResult 字段）。实现引用与对照锚点复用 `specs/045-dual-kernel-contract/contracts/schemas/kernel-implementation-ref.schema.json`，避免重复定义。
- **IR & anchors**：不改变统一最小 IR；仅要求把 `KernelImplementationRef` 与 `requested/effective kernelId` 作为可序列化摘要暴露给 consumer。`instanceId/txnSeq/opSeq` 等稳定锚点仍由 `@logixjs/core` 的诊断/证据提供，本特性不得破坏其可见性。
- **Deterministic identity**：运行标识 `runId` 必须由 Host 显式提供（禁止默认 `Date.now()` 作为唯一标识）；strict/fallback 需要可序列化证据字段（`fallbackReason`）。
- **Transaction boundary**：不引入事务窗口 IO/async；本特性只影响 Sandbox 初始化/编译/运行边界。
- **Internal contracts & trial runs**：不新增 runtime magic 字段；复用 045 的 Kernel Contract/TrialRun 机制产出证据，不依赖进程级全局单例。
- **Dual kernels (core + core-ng)**：kernel support matrix：core-ng=`default(supported)`，core=`explicit rollback/contrast`；consumer 只依赖 `@logixjs/core`，通过“可选择的 kernel 资产”进行对照试跑（不引入隐式 fallback）。
- **Performance budget**：不触及 Logix Runtime 热路径；但触及 docs/Playground 的“进入可运行态”体验，必须保证单内核路径无额外网络请求/常驻分配，多内核仅在选择时加载对应资产。
- **Diagnosability & explainability**：新增字段必须 Slim 且可序列化：`requestedKernelId/effectiveKernelId/fallbackReason/kernelImplementationRef`；错误摘要需面向读者并附恢复建议。
- **Breaking changes**：若升级 Protocol/Types/Client API，必须在 `specs/058-sandbox-multi-kernel/quickstart.md` 给出迁移说明（不保留兼容层）；但“单内核默认用法”可作为新设计的一等形态保留。
- **Public submodules**：若改动 `packages/logix-sandbox`，遵守子模块与 internal 下沉边界；对外只导出必要类型与方法。
- **Quality gates**：至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；并补齐 `packages/logix-sandbox` 的单测覆盖“strict/fallback/可用内核枚举/结果摘要字段”。

### Gate Result (Pre-Design)

- PASS（基础设施改造；通过显式契约 + 可序列化证据控制风险）

### Gate Result (Post-Design)

- PASS（已把 AUTO Clarifications 回写到 spec，并同步到 plan/research/data-model/contracts/quickstart；未引入新的核心路径与协议漂移风险）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

N/A（不触及 Logix Runtime 核心路径；本特性以“单内核默认路径零额外请求/分配”为主要预算约束，先用 consumer 侧代表性页面做手工对照即可）

## Project Structure

### Documentation (this feature)

```text
specs/058-sandbox-multi-kernel/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   └── schemas/
│       ├── kernel-registry.schema.json
│       └── kernel-variant.schema.json
└── tasks.md
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
packages/logix-sandbox/
├── src/Client.ts
├── src/Protocol.ts
├── src/Types.ts
├── src/Service.ts
├── src/internal/compiler/*
└── src/internal/worker/sandbox.worker.ts

docs/specs/drafts/topics/sandbox-runtime/
├── 15-protocol-and-schema.md
└── 25-sandbox-package-api.md

# consumer 对齐（不在本特性实现内强依赖，但用于验证与文档示例）
examples/logix-sandbox-mvp/
├── src/RuntimeProvider.tsx
├── src/sandboxClientConfig.ts
├── src/ir/IrPage.tsx
├── src/ir/IrModule.ts
├── src/ir/IrLogic.ts
├── src/ir/IrImpl.ts
└── src/modules/SandboxLogic.ts

specs/041-docs-inline-playground/
specs/046-core-ng-roadmap/
```

**Structure Decision**:

- SSoT 以 `packages/logix-sandbox/src/*` 为准，完成 multi-kernel 的公共 API/协议/类型。
- Sandbox 协议与包 API 文档同步更新 `docs/specs/drafts/topics/sandbox-runtime/*`，避免“文档协议”与“代码协议”漂移。
- consumer（例如 041）通过 `@logixjs/sandbox` 暴露的 `kernelId`/结果摘要字段完成对照展示，不直接依赖 `@logixjs/core-ng`。
- `examples/logix-sandbox-mvp` 作为 debug harness：提供可视化 `kernelId` 选择与结果摘要展示，用于对照试跑与回归验证（不强依赖 core-ng 包）。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

无
