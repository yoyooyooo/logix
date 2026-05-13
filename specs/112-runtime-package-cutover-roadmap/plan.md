# Implementation Plan: Runtime Package Cutover Roadmap

**Branch**: `112-runtime-package-cutover-roadmap` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/112-runtime-package-cutover-roadmap/spec.md`

## Summary

`112` 是本轮 cutover 的总控 spec，只负责调度、门禁、依赖顺序、回写点和 group 入口：

1. 先完成 `113` 与 `114`，锁定 docs 事实源和 package policy
2. 再推进 `115`，收口 kernel 边界与实验内核去向
3. 然后并行推进 `116`、`117`、`118`
4. 最后由 `119` 完成 examples 与 verification 锚点收口

总控特性不复制成员实现细节，只维护 registry、checklist、milestone gate 和 evidence writeback。

当前状态补充：

- `113` 到 `119` 已全部完成
- `@logixjs/core` 的 kernel 主线已收口
- `@logixjs/core-ng` 包壳已移除，实验能力已内收到 `@logixjs/core/repo-internal/kernel-api`
- examples、verification、CLI、host、domain 与 docs 已完成第一轮未来态收口

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## Technical Context

**Language/Version**: Markdown、JSON registry、pnpm workspace 目录树
**Primary Dependencies**: `specs/112-*`、`specs/113-*` 到 `specs/119-*`、`docs/**`、`packages/**`、`.codex/skills/speckit/scripts/bash/spec-group-checklist.sh`
**Storage**: 文件系统内的 specs/docs/packages 树
**Testing**: group checklist 生成、member artifact 完整性检查、registry 顺序核对、只读 `git status`
**Target Platform**: 仓库贡献者与 Agent 的总控入口
**Project Type**: spec-group / roadmap 特性
**Performance Goals**: N/A，总控本身不触及 runtime 热路径
**Constraints**: group 只承接调度，不复制 member 实现任务；复用优先；只在必要升级点激进改造；所有成员必须回写受影响事实源
**Scale/Scope**: 1 个 group spec + 7 个 member specs + 1 个 group checklist

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **North Stars / Kill Features**: N/A。
- **Intent → Flow / Logix → Code → Runtime**: PASS。`112` 作为 planning control plane，把 docs、package topology、kernel、host、domain、CLI、examples 路由到各自成员 spec。
- **Docs-first & SSoT**: PASS。`113` 是 docs 事实源前置门，`114` 是 package policy 前置门，所有后续成员都依赖这两者。
- **Effect / Logix contracts**: PASS。总控不直接更改契约，具体契约由各成员 spec 处理。
- **IR / anchors / deterministic identity / txn boundary / React consistency / external sources**: PASS。总控只负责把这些问题路由到正确成员，不直接做代码实现。
- **Internal contracts & trial runs**: PASS。`116`、`118`、`119` 将处理 host / CLI / verification 侧控制面。
- **Dual kernels (core + core-ng)**: PASS。`115` 是唯一吸收与裁决入口，group registry 已明确依赖顺序。
- **Performance budget**: N/A。总控本身无热路径改动。
- **Diagnosability & explainability**: PASS。总控要求各成员保留复用资产并回写事实源，避免黑箱改造。
- **Breaking changes (forward-only)**: PASS。总控明确不设兼容层。
- **Public submodules / decomposition**: PASS。由 `114` 和后续成员在实现层处理。
- **Quality gates**: PASS。group checklist、member completeness 和 registry 状态一致性是本特性的硬门。

## Perf Evidence Plan（MUST）

N/A。总控本身不更改 runtime 或 render 热路径。所有触及热路径的成员 spec 必须自行建立 perf evidence。

## Project Structure

### Documentation (this feature)

```text
specs/112-runtime-package-cutover-roadmap/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
├── checklists/
│   ├── requirements.md
│   └── group.registry.md
├── spec-registry.json
├── spec-registry.md
└── tasks.md
```

### Source Code (repository root)

```text
specs/
├── 112-runtime-package-cutover-roadmap/
├── 113-docs-runtime-cutover/
├── 114-package-reset-policy/
├── 115-core-kernel-extraction/
├── 116-host-runtime-rebootstrap/
├── 117-domain-package-rebootstrap/
├── 118-cli-rebootstrap/
└── 119-examples-verification-alignment/

docs/
packages/
examples/logix/
```

**Structure Decision**: 这是一个 spec-group。实现细节留在 member specs，`112` 只维护 registry、checklist、依赖顺序、milestone gate、evidence writeback 和总入口 quickstart。

## Complexity Tracking

无已知违例。

## Phase 0 Research

### Research Goals

- 固定执行顺序与硬依赖
- 固定“复用优先，必要升级点激进改造”的 group 基调
- 固定 member artifact 完整性门槛
- 固定 group checklist 与 registry 的职责边界

### Research Outputs

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [contracts/README.md](./contracts/README.md)

## Phase 1 Design

### Deliverable A: Group Registry And Checklist

- `spec-registry.json` 作为成员关系 SSoT
- `spec-registry.md` 作为人读入口
- `checklists/group.registry.md` 作为总控执行清单

### Deliverable B: Milestone Gate

- Gate A: `113` 与 `114` planning artifacts 齐全
- Gate B: `115` 已给出 kernel 边界与 `core-ng` 去向
- Gate C: `116`、`117`、`118` 都已有完整 planning artifacts
- Gate D: `119` 完成后，examples 与 verification 锚点可闭环

### Deliverable C: Reuse-First Routing

- 各 member spec 必须登记可复用资产
- 总控只核对这些登记是否存在，不自行裁决实现细节

## Verification Plan

### Group Checklist Refresh

```bash
./.codex/skills/speckit/scripts/bash/spec-group-checklist.sh 112 --from registry --name group.registry --title "Runtime Package Cutover" --force
```

### Member Artifact Audit

```bash
find specs/113-docs-runtime-cutover specs/114-package-reset-policy specs/115-core-kernel-extraction specs/116-host-runtime-rebootstrap specs/117-domain-package-rebootstrap specs/118-cli-rebootstrap specs/119-examples-verification-alignment -maxdepth 2 -type f | sort
```

### Registry / Task Summary

```bash
./.codex/skills/speckit/scripts/bash/extract-tasks.sh --json --feature 113 --feature 114 --feature 115 --feature 116 --feature 117 --feature 118 --feature 119
```

## Completion Rule

本 plan 的完成条件如下：

1. `112` 已具备完整总控 planning artifacts
2. `113` 到 `119` 都已具备 planning artifacts
3. group checklist 已生成并指向 member `tasks.md` / `quickstart.md`
4. registry 顺序与 member 状态一致
5. 总控可以独立作为下一轮执行入口

当前完成判定：

- 上述 5 条均已满足
- 成员实现也已全部收口，`112` 当前可作为“本轮 cutover 已完成”的总入口与审计入口
