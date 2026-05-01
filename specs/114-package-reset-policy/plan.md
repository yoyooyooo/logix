# Implementation Plan: Package Reset Policy

**Branch**: `114-package-reset-policy` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/114-package-reset-policy/spec.md`

## Summary

本计划为整个 cutover 提供一份统一的 package policy：

1. 先盘点 `packages/*` 的当前清单与家族划分
2. 再定义统一的处置枚举、可复用资产门槛与“改名封存 + 从 0 到 1 重建”协议
3. 再为不同家族给出目录模板
4. 最后把当前关键包映射到这套矩阵，供 `115` 到 `119` 复用

这份计划不直接移动代码，但会形成后续所有包级重构的基础门禁，并把“复用已对齐资产、只对必要升级点做激进改造”固定为主基调。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## Technical Context

**Language/Version**: Markdown、JSON 风格的结构约定、仓库内 package 拓扑
**Primary Dependencies**: `packages/*/package.json`、`packages/*/src`、`docs/ssot/runtime/01-public-api-spine.md`、`docs/ssot/runtime/08-domain-packages.md`、`docs/ssot/runtime/09-verification-control-plane.md`、`docs/standards/logix-api-next-guardrails.md`
**Storage**: 文件系统内的 specs / docs / packages 树
**Testing**: package inventory 扫描、目录树只读核对、处置矩阵人工审阅
**Target Platform**: pnpm workspace 内的 `@logixjs/*` 包与相关 tooling
**Project Type**: monorepo package governance 特性
**Performance Goals**: N/A，本特性本身不改热路径代码；所有性能证据由后续具体实现 spec 负责
**Constraints**: forward-only；允许旧目录改名封存；canonical 包路径保留给新主线；公开子模块与 `src/internal/**` 约束必须统一；不得为旧心智保留兼容层；已对齐目标契约的热链路与测试资产默认优先复用
**Scale/Scope**: 当前 `packages/` 下 11 个关键包家族，加上与 `examples/logix` 的邻接关系

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: N/A。
- **Intent → Flow / Logix → Code → Runtime**: PASS。本特性负责把 package topology 与 runtime 主线对齐，给后续代码重组建立路线图，并保留可复用资产。
- **Docs-first & SSoT**: PASS。依赖 `docs/ssot/runtime/01`、`08`、`09` 与 `docs/standards/logix-api-next-guardrails.md`，后续若裁决变化需先回写 docs。
- **Effect / Logix contracts**: PASS。本特性不直接更改运行时代码契约，只定义 package family 与目录模板。
- **IR / anchors**: N/A。当前不改 IR 或锚点协议。
- **Deterministic identity / transaction boundary / React consistency / external sources**: N/A。当前不改实现代码。
- **Internal contracts & trial runs**: PASS。会要求后续 host / CLI / test 包围绕 `runtime control plane` 组织，不新增隐式协作面。
- **Dual kernels (core + core-ng)**: PASS。处置枚举显式包含 `merge-into-kernel`，并把 `core-ng` 作为 `115` 的关键输入。
- **Performance budget**: N/A。政策文档本身无性能改动；后续触及热路径的 spec 必须自行建 perf evidence。
- **Diagnosability & explainability**: PASS。新目录模板要求观测与验证契约从统一事实源导出。
- **User-facing performance mental model**: PASS。目录模板会要求 runtime、verification、CLI、examples 口径一致。
- **Breaking changes (forward-only)**: PASS。此特性明确默认不保留兼容层。
- **Public submodules**: PASS。将 `src/*.ts` 作为公开子模块、`src/internal/**` 作为共享实现与深层实现的统一约束。
- **Large modules/files (decomposition)**: PASS。后续凡触及超大文件的 spec 都必须先给 decomposition brief；本特性会把它写成统一规则。
- **Quality gates**: PASS。以 package inventory 完整性、处置矩阵覆盖率、目录模板清晰度为本特性的硬门。

## Perf Evidence Plan（MUST）

N/A。本特性只建立 package policy。凡进入 `115`、`116`、`117`、`118` 的实现性改动，只要碰 runtime 热路径或验证控制面，都必须单独建立 perf evidence plan。

## Project Structure

### Documentation (this feature)

```text
specs/114-package-reset-policy/
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
packages/
├── logix-core/
├── logix-core-ng/
├── logix-react/
├── logix-sandbox/
├── logix-test/
├── logix-devtools-react/
├── logix-query/
├── logix-form/
├── i18n/
├── domain/
├── logix-cli/
└── speckit-kit/

examples/
└── logix/
```

**Structure Decision**: 这是一个 package-policy 特性。它不直接改 `packages/*` 文件，但会为这些目录产出统一的 inventory、处置矩阵和 family template。后续真正的代码重启由 `115` 到 `119` 负责。

## Complexity Tracking

无已知违例。

## Phase 0 Research

### Research Goals

- 建立当前 package inventory
- 建立可复用资产 inventory
- 提炼家族划分
- 识别哪些包需要目录级封存重组，哪些包保留主名或并入 kernel
- 识别哪些热链路、协议、helper、fixtures、测试资产应直接沿用
- 设计统一 archive / rebootstrap 协议

### Research Outputs

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [contracts/README.md](./contracts/README.md)

## Phase 1 Design

### Deliverable A: Package Disposition Matrix

为每个关键包生成一条 `Package Disposition Record`，至少包含：

- 包名
- 当前目录
- 目标家族
- 处置类型
- 可复用资产
- successor spec
- 需要回写的 docs

### Deliverable B: Archive / Rebootstrap Protocol

固定以下协议：

- 旧实现如何改名封存
- canonical 包目录如何留给新主线
- 旧实现如何引用到迁移说明
- 哪些文件在封存时必须保留
- 哪些资产允许直接平移到新主线

### Deliverable C: Family Topology Templates

至少产出 5 类模板：

- core family
- host integration family
- domain family
- CLI family
- tooling family

## Phase 2 Rollout Routing

- `115` 负责 `@logixjs/core` 与 `@logixjs/core-ng`
- `116` 负责 `@logixjs/react`、`@logixjs/sandbox`、`@logixjs/test`、`@logixjs/devtools-react`
- `117` 负责 `@logixjs/query`、`@logixjs/form`、`@logixjs/i18n`、`@logixjs/domain`
- `118` 负责 `@logixjs/cli`
- `119` 负责 `examples/logix` 与 verification 邻接关系

## Verification Plan

### Inventory Audit

```bash
rg -n '"name"\\s*:' packages/*/package.json
find packages -maxdepth 2 -type d | sort
```

### Topology Audit

```bash
find packages/logix-core/src packages/logix-react/src packages/logix-query/src packages/logix-form/src packages/i18n/src packages/domain/src packages/logix-cli/src packages/logix-sandbox/src packages/logix-test/src packages/logix-devtools-react/src -maxdepth 3 \\( -type f -o -type d \\) | sort
```

### Docs Alignment Audit

```bash
rg -n 'service-first|program-first|runtime\\.check|runtime\\.trial|runtime\\.compare|Module|Logic|Program|Runtime' docs/ssot/runtime/*.md docs/standards/*.md
```

## Completion Rule

本 plan 的完成条件如下：

1. 当前关键包都能在统一 inventory 中找到处置类型
2. “改名封存 + 新目录重建”协议固定
3. family template 已能支撑 `115` 到 `119`
4. `core-ng` 的处置方向已经被路由到 `merge-into-kernel`，并交给 `115` 细化
5. 非 Logix runtime 主线包，如 `speckit-kit`，也有明确的 preserve / out-of-cutover 口径
6. 每个关键包都能区分可直接复用资产与必须重写资产
