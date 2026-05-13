# Implementation Plan: Docs Runtime Cutover

**Branch**: `113-docs-runtime-cutover` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/113-docs-runtime-cutover/spec.md`

## Summary

本计划把 docs cutover 收口成四个连续波次：

1. 根入口与治理协议收口
2. runtime core pack 职责收口
3. runtime boundary pack 与 platform pack 职责收口
4. `docs/next` 承接桶与最终 review gate 收口

实施上直接吸收现有 [docs/superpowers/plans/2026-04-05-docs-alignment-stages.md](../../docs/superpowers/plans/2026-04-05-docs-alignment-stages.md) 的 chunk 结构，将其视为执行合同；`113` 自己负责把目标、阶段、门禁和回写点沉淀成 spec-kit 产物，避免该草案演化成第二真相源。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## Technical Context

**Language/Version**: Markdown
**Primary Dependencies**: 仓库内 `docs/**`、`specs/**`、`rg`、`sed`、只读 `git diff` / `git status`
**Storage**: 文件系统内的 docs/specs Markdown 文件
**Testing**: `rg` 路由/术语检查、语义门人工复核、只读 `git status` 范围核对
**Target Platform**: 仓库贡献者与 Agent 使用的文档系统
**Project Type**: pnpm workspace 仓库内 docs 治理特性
**Performance Goals**: N/A，本特性不改 runtime 热路径；目标是文档路由唯一、角色边界稳定
**Constraints**: 只维护新 docs 树；`legacy` 冻结；accepted ADR 只补导航或勘误元信息；每个核心页面都要回答“从哪来、与谁相邻、后续去哪”
**Scale/Scope**: 6 个根 README、2 个子树 README、runtime 01-09、platform 01-02、4 个 standards / ADR 页面、1 个 `docs/next` followup 桶

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: N/A。本特性不直接绑定 NS/KF。
- **Intent → Flow / Logix → Code → Runtime**: PASS。此特性服务“文档先行与 SSoT”，为后续 runtime / package cutover 提供唯一事实源。
- **Docs-first & SSoT**: PASS。目标文件全部位于 `docs/**`，并优先收口事实源与治理协议。
- **Effect / Logix contracts**: PASS。不会新增运行时代码契约，但会澄清现有 `runtime control plane`、domain packages、platform 页面职责。
- **IR / anchors**: PASS。不会改 parser/codegen 或 IR 结构，只负责保证相关词汇和事实源对齐。
- **Deterministic identity**: N/A。无代码改动。
- **Transaction boundary**: N/A。无代码改动。
- **React consistency / external sources**: N/A。无代码改动。
- **Internal contracts & trial runs**: PASS。仅确保 `09-verification-control-plane.md` 与相邻页面职责清晰，不改协议实现。
- **Dual kernels (core + core-ng)**: N/A。此特性只负责文档路由，不裁决 kernel support matrix。
- **Performance budget**: N/A。docs-only。
- **Diagnosability & explainability**: PASS。要求 verification 与 hot-path 相关术语集中在正确页面，不再跨页漂移。
- **User-facing performance mental model**: PASS。要求 runtime hot-path、verification、domain packages 相关词汇在新 docs 树中保持一致。
- **Breaking changes (forward-only)**: PASS。若某页结论变化，直接覆盖事实源并通过 `docs/next` 承接迁移说明，不保留兼容口径。
- **Public submodules**: N/A。当前不改 `packages/*` 文件。
- **Large modules/files (decomposition)**: PASS。当前只处理 docs 页面，无新增超大代码文件。
- **Quality gates**: PASS。以路由检查、语义门和目标文件范围核对作为本特性的硬门。

## Perf Evidence Plan（MUST）

N/A。本特性只收口文档，不触及 runtime 热路径或对外性能边界。后续若文档变化引导了核心路径实现调整，由 `115` 及其子 spec 自行建立 perf evidence。

## Project Structure

### Documentation (this feature)

```text
specs/113-docs-runtime-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── tasks.md
```

### Source Code (repository root)

```text
docs/
├── README.md
├── proposals/README.md
├── next/
│   ├── README.md
│   └── 2026-04-05-runtime-docs-followups.md
├── ssot/
│   ├── README.md
│   ├── runtime/
│   │   ├── README.md
│   │   ├── 01-public-api-spine.md
│   │   ├── 02-hot-path-direction.md
│   │   ├── 03-canonical-authoring.md
│   │   ├── 04-capabilities-and-runtime-control-plane.md
│   │   ├── 05-logic-composition-and-override.md
│   │   ├── 06-form-field-kernel-boundary.md
│   │   ├── 07-standardized-scenario-patterns.md
│   │   ├── 08-domain-packages.md
│   │   └── 09-verification-control-plane.md
│   └── platform/
│       ├── README.md
│       ├── 01-layered-map.md
│       └── 02-anchor-profile-and-instantiation.md
├── adr/
│   ├── README.md
│   ├── 2026-04-04-logix-api-next-charter.md
│   └── 2026-04-05-ai-native-runtime-first-charter.md
└── standards/
    ├── README.md
    ├── docs-governance.md
    ├── effect-v4-baseline.md
    ├── logix-api-next-guardrails.md
    └── logix-api-next-postponed-naming-items.md
```

**Structure Decision**: 这是一个 docs-only 特性。实现落点固定在 `docs/**`，`specs/113-*` 只承载 planning artifacts。`docs/superpowers/plans/2026-04-05-docs-alignment-stages.md` 作为执行参考保留，但最终事实与门禁只认 `docs/**` 与 `specs/113-*`。

## Complexity Tracking

无已知违例。

## Phase 0 Research

### Research Goals

- 确认根 README、governance、proposal、next 的现有角色缺口
- 确认 runtime 01-09 与 platform 01/02 的页面职责边界
- 确认 naming postponement 与 `docs/next` 承接桶的唯一落点

### Research Outputs

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [contracts/README.md](./contracts/README.md)

## Phase 1 Design

### Wave A: Root Routing And Governance

- 收口 `docs/README.md`、`docs/ssot/README.md`、`docs/adr/README.md`、`docs/standards/README.md`
- 收口 `docs/proposals/README.md`、`docs/next/README.md`
- 把 `docs/standards/docs-governance.md` 升级为唯一执行协议

### Wave B: Runtime Core Pack

- 收口 runtime 01-05 的页面职责
- 校准 `docs/standards/logix-api-next-guardrails.md`
- 校准 `docs/standards/effect-v4-baseline.md`
- 仅为两份 charter 补导航性元信息

### Wave C: Runtime Boundary Pack

- 收口 runtime 06-09 与 platform 01/02
- 将命名后置问题统一回指 `docs/standards/logix-api-next-postponed-naming-items.md`
- 保证 verification 术语集中在 `09`

### Wave D: Promotion Lane And Review Gate

- 建立 `docs/next/2026-04-05-runtime-docs-followups.md`
- 对根 README 与 `docs/next/README.md` 做必要回写
- 完成只读 review gate 与最终路由检查

## Verification Plan

### Route Audit

```bash
rg -n 'docs/(proposals|ssot|adr|standards|next|legacy)|\\]\\(' docs/README.md docs/proposals/README.md docs/ssot/README.md docs/adr/README.md docs/standards/README.md docs/next/README.md docs/ssot/runtime/README.md docs/ssot/platform/README.md
```

### Governance / Promotion Audit

```bash
rg -n '默认写入顺序|proposal|next|ssot|adr|standards|legacy|升格|回写|交叉引用' docs/standards/docs-governance.md docs/README.md docs/proposals/README.md docs/next/README.md
```

### Runtime Responsibility Audit

```bash
rg -n '来源裁决|相关规范|待升格回写|当前一句话结论|field-kernel|service-first|program-first|runtime\\.check|runtime\\.trial|runtime\\.compare' docs/ssot/runtime/*.md docs/ssot/platform/*.md docs/standards/logix-api-next-postponed-naming-items.md
```

### Scope Check

```bash
git status --short docs/README.md docs/proposals/README.md docs/next/README.md docs/ssot/README.md docs/ssot/runtime/README.md docs/ssot/platform/README.md docs/ssot/runtime/*.md docs/ssot/platform/*.md docs/adr/*.md docs/standards/*.md
```

## Completion Rule

本 plan 的完成条件如下：

1. 根 README、governance、proposal、next 的角色边界稳定
2. runtime 01-09 与 platform 01/02 的页面职责可独立解释
3. 命名后置项只停留在 postponed naming 页面
4. 所有未升格事项都有 `docs/next` 承接入口
5. 只读检查能证明新 docs 树已形成单一事实源
