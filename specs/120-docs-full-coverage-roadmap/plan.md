# Implementation Plan: Docs Full Coverage Roadmap

**Branch**: `120-docs-full-coverage-roadmap` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/120-docs-full-coverage-roadmap/spec.md`

## Summary

本计划负责完成 docs 主体规划到 spec group 的全覆盖拆解：

1. 先建立 docs page → spec owner 的 coverage SSoT
2. 再复用 `103 / 113 / 115 / 116 / 117 / 118 / 119` 作为 existing coverage baseline
3. 最后创建 `121-129` 第二波成员 spec，并固定依赖顺序和入口清单

`120` 本身是总控规划特性，不承接具体代码改造实现。

## Technical Context

**Language/Version**: Markdown、JSON、Spec Kit 目录约定
**Primary Dependencies**: `docs/**` 主体页面、`specs/103`、`specs/113`、`specs/115-119`
**Storage**: `specs/120-docs-full-coverage-roadmap/**`
**Testing**: docs coverage matrix 核对、member spec 存在性检查、group checklist 完整性检查
**Target Platform**: monorepo docs / specs
**Project Type**: spec group planning 特性
**Constraints**: 不覆盖 `docs/archive/**`、`docs/assets/**`、`docs/superpowers/**`；不复制 member 实现 tasks；docs 页面必须 100% 有 owner
**Scale/Scope**: 27 个 docs 页面，7 个 existing specs，9 个 new member specs

## Constitution Check

- **Docs-first & SSoT**: PASS。该特性直接服务 docs 到 spec 的单一真相源。
- **Breaking changes**: PASS。允许按 docs 新口径重新拆 spec，不为旧 spec 命名兼容。
- **Quality gates**: PASS。coverage matrix、member specs、group checklist 是硬门。

## Project Structure

```text
specs/120-docs-full-coverage-roadmap/
├── spec.md
├── spec-registry.json
├── spec-registry.md
├── checklists/
│   ├── requirements.md
│   └── group.registry.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── tasks.md
```

## Phase Design

### Deliverable A: Coverage SSoT

- docs page coverage matrix
- primary owner / related specs
- existing coverage baseline

### Deliverable B: Member Spec Group

- `121-129` 成员 spec
- 依赖顺序
- group checklist

### Deliverable C: Routing Rules

- 新 docs 页面如何回写 owner
- charters / standards 这类 cross-cutting 页面如何分发

## Verification Plan

```bash
python3 - <<'PY'
from pathlib import Path
included = [
  'docs/README.md',
  'docs/adr/README.md',
  'docs/adr/2026-04-04-docs-archive-cutover.md',
  'docs/adr/2026-04-04-logix-api-next-charter.md',
  'docs/adr/2026-04-05-ai-native-runtime-first-charter.md',
  'docs/ssot/README.md',
  'docs/ssot/runtime/README.md',
  'docs/ssot/runtime/01-public-api-spine.md',
  'docs/ssot/runtime/02-hot-path-direction.md',
  'docs/ssot/runtime/03-canonical-authoring.md',
  'docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md',
  'docs/ssot/runtime/05-logic-composition-and-override.md',
  'docs/ssot/runtime/06-form-field-kernel-boundary.md',
  'docs/ssot/runtime/07-standardized-scenario-patterns.md',
  'docs/ssot/runtime/08-domain-packages.md',
  'docs/ssot/runtime/09-verification-control-plane.md',
  'docs/ssot/platform/README.md',
  'docs/ssot/platform/01-layered-map.md',
  'docs/ssot/platform/02-anchor-profile-and-instantiation.md',
  'docs/standards/README.md',
  'docs/standards/docs-governance.md',
  'docs/standards/effect-v4-baseline.md',
  'docs/standards/logix-api-next-guardrails.md',
  'docs/standards/logix-api-next-postponed-naming-items.md',
  'docs/next/README.md',
  'docs/next/2026-04-05-runtime-docs-followups.md',
  'docs/proposals/README.md',
]
text = Path('specs/120-docs-full-coverage-roadmap/spec-registry.md').read_text()
missing = [p for p in included if p not in text]
print(len(missing))
PY
```

## Completion Rule

1. docs 纳入范围页面全部进入 coverage matrix
2. `121-129` 成员 spec 全部存在
3. group checklist 可作为单入口导航
4. `120` 自身不再需要继续补规划缺口
