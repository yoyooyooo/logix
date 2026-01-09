# Implementation Plan: 064 Speckit 时间线 Kanban（Specs Timeline Board）

**Branch**: `064-speckit-kanban-timeline` | **Date**: 2025-12-31 | **Spec**: `specs/064-speckit-kanban-timeline/spec.md`  
**Input**: Feature specification from `specs/064-speckit-kanban-timeline/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

目标：为 `specs/*` 提供一个本地“时间线式 Kanban”配套项目，成为日常推进入口：

- 以 spec（`specs/NNN-*` 目录）为列：最新在最左，横向滚动；列内纵向滚动；页面整体无滚动条。
- 以 `tasks.md` 的可勾选任务为卡片：可点开查看详情，并支持最小写入闭环（勾选/编辑并保存）。
- 通过本地 HTTP API 读写仓库内受控文件（至少 `spec.md/plan.md/tasks.md`）。
- 一条命令启动前后端并自动打开页面（本地使用，不对局域网开放）。

实现策略（落点清晰、最少依赖）：

- 交付形态：独立 npm CLI 包 `speckit-kit`（bin：`speckit-kit`），可 `npx speckit-kit kanban` 一键运行。
- 后端：`packages/speckit-kit/src/server/*`（Effect v3 + `@effect/platform-node` + HttpApi），负责扫描 `specs/*` 与受控读写。
- 前端：`packages/speckit-kit/ui/*`（Vite + React + Tailwind），构建产物输出到 `packages/speckit-kit/dist/ui`。
- 运行入口：
  - 本仓库：`pnpm speckit:kanban`（会先构建，再启动单进程 server：静态站点 + `/api`）。
  - 独立分发：`npx speckit-kit kanban`（同上）。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript（ESM；与现有 `apps/*` 一致）  
**Primary Dependencies**:
- 后端：`effect` v3、`@effect/platform`、`@effect/platform-node`（HttpApi + NodeHttpServer；静态站点用 `HttpServerResponse.file` + SPA fallback；同端口 `/api/*` 分流）
- 前端：React 19、Vite、Tailwind
**Storage**: 文件系统（读写 `specs/*`；不引入 DB）  
**Testing**: Vitest（后端 handler/服务层测试为主；前端暂以手工验收为主）  
**Target Platform**: Node.js 20+ + 现代浏览器  
**Project Type**: npm CLI（`speckit-kit`；skill 不再内置任何前后端项目/构建产物）  
**Performance Goals**:
- 目录扫描与 tasks 解析：对 200×200（spec×tasks）规模保持可用（UI 首屏不阻塞 >1s）
- API 响应：本地场景优先（p95 < 200ms；失败可诊断）
**Constraints**:
- 安全边界：只允许访问仓库内受控路径（至少 `specs/*`），拒绝路径穿越
- 绑定地址：仅 localhost，不对局域网开放
- 页面布局：body 无滚动条；横向滚动在看板容器；列内纵向滚动
**Scale/Scope**: 单仓库本地工具；不做远程协作/鉴权

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
### Gate Mapping（逐条对齐宪章）

- **Intent → Flow/Logix → Code → Runtime**：本特性属于“工程推进工具/本地看板”，不改变 Logix Runtime/IR/Flow 语义；产物落点以 `specs/064-*` 与 `packages/speckit-kit/*` 为主。
- **docs-first & SSoT**：事实源以 `specs/064-speckit-kanban-timeline/*` 为准（spec/plan/contracts/quickstart）。
- **Effect/Logix contracts**：不新增/变更 `@logixjs/*` 对外契约；仅新增一个 Effect 后端 app。
- **IR & anchors / deterministic identity / txn boundary / dual kernels**：N/A（不触及 runtime 内核）。
- **Performance budget**：不触及 runtime 核心路径；但本地工具仍需对目录扫描与解析设定可用性目标（见 Technical Context + spec NFR）。
- **Diagnosability**：后端需提供最小结构化错误 `_tag/message` + 请求日志（路径、耗时、摘要）。
- **Breaking changes**：新增 app/脚本属于增量变更；无兼容层需求。
- **Public submodules**：不改 `packages/*`，N/A。
- **Quality gates**：实现完成前必须通过：
  - `pnpm -C packages/speckit-kit build`
  - `pnpm speckit:kanban`（最小手工验收：能浏览 specs / 勾选任务 / 编辑并保存）

### Gate Result

PASS（不触及 runtime 核心路径；安全边界与可诊断性在设计中显式约束）

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

N/A（不触及 Logix Runtime 核心路径或对外性能边界；本特性以“可用性预算 + 结构化错误”替代 PerfReport 体系）

## Project Structure

### Documentation (this feature)

```text
specs/064-speckit-kanban-timeline/
├── plan.md              # This file ($speckit plan output)
├── research.md          # Decisions & alternatives
├── data-model.md        # Spec/Task/Artifact data model
├── quickstart.md        # How to run (CLI → open page)
├── contracts/           # HTTP contract (local, file-based)
├── notes/               # Optional: handoff notes / entry points ($speckit notes)
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
packages/speckit-kit/
├── dist/                           # npm 交付产物（含 UI 静态站点 + CLI）
├── src/
│   ├── bin/
│   │   └── speckit-kit.ts          # 单进程 server：静态站点 + /api
│   └── server/
│       ├── app/
│       │   └── effect-api.ts
│       ├── health/
│       ├── specboard/
│       └── util/
├── ui/                             # Vite + React 源码（构建到 dist/ui）
└── package.json
```

**Structure Decision**: 交付形态改为 npm CLI（`speckit-kit`）：skill 目录保持“提示词/脚本/模板”纯净；看板作为可独立分发的工具，通过构建产物实现“一键运行、单进程打开页面”。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
