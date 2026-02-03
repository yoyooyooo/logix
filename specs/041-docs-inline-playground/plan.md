# Implementation Plan: 文档内联教学 Playground

**Branch**: `[041-docs-inline-playground]` | **Date**: 2025-12-26 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/041-docs-inline-playground/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

在用户文档站点中提供“可运行、可编辑、可观察”的教学 Playground：作者显式标记可运行示例，并提供观察点与默认面板；读者可在页面内编辑并反复重跑/重置。底层复用现有 Worker Sandbox 试运行能力，默认延迟加载、输出有界；深度观测仅在作者标记的高级/Debug 文档中按需启用。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: Next.js 16 + React 19 + Fumadocs（apps/docs）；effect v3 + `@logixjs/core` + `@logixjs/sandbox`（Playground 运行底座）  
**Storage**: N/A（默认不持久化读者编辑内容；运行状态仅页面内存态）  
**Testing**: apps/docs：`types:check` + `build`；sandbox/runtime 相关：Vitest（必要时用 `@effect/vitest`）  
**Target Platform**: Node.js 20+（构建）+ 现代浏览器（运行 Worker Sandbox）  
**Project Type**: pnpm workspace（`packages/*` + `apps/docs`）  
**Performance Goals**: 教学页默认不加载 Sandbox/编辑器代码；用户触发运行后能快速进入“运行中”状态并尽快产出首批输出；对代表性示例记录一次“编译+运行”的可复现耗时基线（作为后续优化依据）  
**Constraints**: 安全隔离（Worker 内执行）、默认可复现（不依赖外部网络资源）、输出与观测数据有界（避免内存膨胀）、runId/事件序列可确定性复现  
**Scale/Scope**: MVP 覆盖 ≥3 篇代表性文档页；仅作者标记的示例可运行；单示例块支持编辑/重跑/重置/取消；高级观测按块启用

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- 本特性映射链路：文档作者意图（教学/观察点）→ PlaygroundBlock 配置 → Sandbox 试运行（Worker）→ RunResult（logs/traces/结果摘要）→ 文档内展示与学习反馈。
- Docs-first/SSoT：用户文档能力落点在 `apps/docs`；Sandbox/Playground 的定位与约束以 `docs/ssot/runtime/logix-sandbox/*`（协议/基线）、`docs/specs/drafts/topics/sandbox-runtime/*`（愿景/扩展）与 `docs/ssot/platform/*` 为参考，避免“只做代码 runner”。
- 合同/契约：优先复用 `@logixjs/sandbox` 既有 TrialRun 能力；如需扩展（例如取消/事件上限/更好的错误定位），必须以显式协议/配置项落地，并同步回写到对应的 Sandbox 主题文档与 runtime SSoT 备忘。
- IR/锚点：本特性不改变统一最小 IR；仅在高级/Debug 示例中消费现有 trace/事件并提供解释视图。
- 稳定标识：文档内运行必须显式传入确定性的 `runId`（避免默认 `Date.now()` 生成）；必要时为示例块引入稳定 blockId 与本地序号。
- 双内核演进（core + core-ng）：文档 Playground 作为 consumer 默认只依赖 `@logixjs/core` + `@logixjs/sandbox`；默认请求 kernel=core（单内核默认策略），`core-ng` 仅作为**显式**对照/试跑选项；kernel 选择 UI 仅在 `level=debug` 的文档/块中启用，且 strict by default（不引入隐式 fallback）；不直接 import `@logixjs/core-ng`。
- 事务边界：不在事务窗口内引入 IO；示例运行边界由 Worker Sandbox 隔离，文档侧只做触发与展示。
- 性能与诊断：教学默认体验延迟加载、低开销；高级观测按需启用并声明开销与上限；输出/事件必须有界。
- 破坏性变更：如改动 `@logixjs/sandbox` 的协议或公共行为，必须提供迁移说明（不保留兼容层）。
- Public submodules：若触及 `packages/logix-sandbox`，遵守 `src/*.ts` 子模块与 `src/internal/**` 下沉边界，且不暴露 internal 出口。
- 质量门：合入前至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`，并确保 `pnpm -C apps/docs build` 与 `pnpm -C apps/docs types:check` 通过。

## Project Structure

### Documentation (this feature)

```text
specs/041-docs-inline-playground/
├── plan.md              # This file ($speckit plan output)
├── research.md          # Phase 0 output ($speckit plan)
├── data-model.md        # Phase 1 output ($speckit plan)
├── quickstart.md        # Phase 1 output ($speckit plan)
├── contracts/           # Phase 1 output ($speckit plan)
└── tasks.md             # Phase 2 output ($speckit tasks - NOT created by $speckit plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
apps/docs/
├── content/docs/                         # 文档内容（作者在这里标记可运行示例）
├── src/mdx-components.tsx                # 注册 Playground 相关 MDX components
├── src/components/                       # Playground UI（面板、编辑器、运行结果展示等）
├── public/                               # 静态资源（同步 sandbox worker/kernel/wasm 等）
└── ...                                   # 其它文档站点代码

packages/logix-sandbox/
├── public/                               # sandbox 运行时静态资产（kernel/worker/esbuild wasm 等）
└── src/                                  # SandboxClient/协议/类型（必要时做小幅扩展）
```

**Structure Decision**: Playground 以“文档站点内联组件”的方式落地在 `apps/docs`，运行底座复用 `packages/logix-sandbox`；静态资产从 `packages/logix-sandbox/public` 同步到 `apps/docs/public` 以确保同源、可复现与易部署。

## Complexity Tracking

无（当前计划不引入额外项目、不引入第二套运行时；按需复用 Sandbox 底座与文档站点组件即可）。
