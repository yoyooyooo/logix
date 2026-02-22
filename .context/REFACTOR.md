# Refactor Ledger

> 目标：在不破坏现有功能与测试的前提下，持续提升代码结构、可扩展性、可维护性与性能。
> 分支：`refactor/module-audit-20260222`
> 基线来源：`origin/main`（同步时间：2026-02-22）

## 状态定义

- `UNREAD`：尚未阅读源码。
- `ENTRY_READ`：已阅读入口/主路由文件，完成初步定位。
- `DEEP_READ`：已深入阅读核心实现与关键调用链。
- `REFACTORED`：已完成重构并通过本地质量门。

## 已看过模块

### 全局级（结构盘点）

- `apps/*`：`ENTRY_READ`（目录与规模已盘点，源码未逐文件阅读）
- `packages/*`：`ENTRY_READ`（目录与规模已盘点，源码未逐文件阅读）
- `examples/*`：`ENTRY_READ`（目录与规模已盘点，源码未逐文件阅读）
- `scripts/*`：`ENTRY_READ`（目录已盘点，源码未逐文件阅读）

### 已深读文件（第一轮）

- `apps/logix-galaxy-api/src/project/project.repo.live.ts`：`DEEP_READ` + `REFACTORED`
- `apps/logix-galaxy-fe/src/galaxy-api/client.ts`：`DEEP_READ` + `REFACTORED`
- `apps/logix-galaxy-fe/src/routes/project.tsx`：`DEEP_READ`（待拆分 UI 组件）
- `packages/domain/src/internal/crud/Crud.ts`：`DEEP_READ` + `REFACTORED`
- `packages/logix-query/src/Query.ts`：`DEEP_READ`（待清理结构与可读性）

## 模块清单与阅读进度

### Apps

- `apps/api-reference`（2 文件）：`UNREAD`
- `apps/docs`（44 文件）：`UNREAD`
- `apps/logix-galaxy-api`（48 文件，后端）：`ENTRY_READ`（`project.repo.live.ts` 已深读并重构）
- `apps/logix-galaxy-fe`（18 文件，前端）：`ENTRY_READ`（`galaxy-api/client.ts` 已深读并重构）
- `apps/speckit-kanban-api`（15 文件，后端）：`UNREAD`
- `apps/speckit-kanban-fe`（8 文件，前端）：`UNREAD`
- `apps/studio-fe`（9 文件，前端）：`UNREAD`

### Packages

- `packages/domain`（11 文件）：`ENTRY_READ`（`internal/crud/Crud.ts` 已深读并重构）
- `packages/i18n`（12 文件）：`UNREAD`
- `packages/logix-core-ng`（13 文件）：`UNREAD`
- `packages/logix-core`（469 文件，核心运行时）：`UNREAD`
- `packages/logix-devtools-react`（48 文件）：`UNREAD`
- `packages/logix-form`（66 文件）：`UNREAD`
- `packages/logix-query`（23 文件）：`ENTRY_READ`（`Query.ts` 已深读，待重构）
- `packages/logix-react`（113 文件）：`UNREAD`
- `packages/logix-sandbox`（1153 文件，Playground 基础设施）：`UNREAD`
- `packages/logix-test`（21 文件）：`UNREAD`
- `packages/speckit-kit`（47 文件）：`UNREAD`

### Examples

- `examples/effect-api`（15 文件，后端示例）：`UNREAD`
- `examples/logix`（62 文件）：`UNREAD`
- `examples/logix-form-poc`（10 文件）：`UNREAD`
- `examples/logix-react`（66 文件，前端示例）：`UNREAD`
- `examples/logix-sandbox-mvp`（55 文件，前端示例）：`UNREAD`

### Scripts

- `scripts/checks`：`UNREAD`
- `scripts/codemod`：`UNREAD`
- `scripts/ir`：`UNREAD`
- `scripts/migrate`：`UNREAD`
- `scripts/public-submodules`：`UNREAD`

## 候选重构点（待确认）

- `packages/logix-sandbox`：体量最大，优先做模块边界和依赖方向梳理，拆解大文件。
- `packages/logix-core`：核心路径改动需同步性能证据与诊断事件约束，先做“无行为改动”的结构整理与可读性提升。
- `packages/logix-react` / `packages/logix-devtools-react`：检查重复桥接逻辑与 Hook 层职责边界。
- `apps/*-api`：统一服务层组织、错误语义和依赖注入边界。
- `apps/*-fe` 与 `examples/*`：去重复的 UI/状态桥接样板代码。

## 当前已识别重构点（来自已深读模块）

- `apps/logix-galaxy-api/src/project/project.repo.live.ts`
  - 重复出现 `projectExists + NotFoundError` 模板逻辑。
  - 重复出现 `project_groups` 存在性校验逻辑。
  - `owner` 数量校验重复，导致规则修改时需要多点改动。
- `apps/logix-galaxy-fe/src/galaxy-api/client.ts`
  - 多个 API 方法重复拼接 `authorization` / `content-type` 与 `JSON.stringify`。
  - 请求构造样板重复，新增接口时易出现 header/body 漏配。
- `apps/logix-galaxy-fe/src/routes/project.tsx`
  - 单文件职责过重（状态选择、权限判定、表单 state、渲染混杂），下一轮建议组件拆分。
- `packages/domain/src/internal/crud/Crud.ts`
  - `query/save/remove` 三条动作链重复“拿 api 服务 + 缺失错误 + 异常转消息”流程。
  - 重复模板导致后续扩展 CRUD 动作时容易漏掉一致性处理。
- `packages/logix-query/src/Query.ts`
  - 构造流程可读性偏低（多段内联闭包与类型断言混杂），可拆分辅助函数降低认知负担。

## 已完成重构项

- `apps/logix-galaxy-api/src/project/project.repo.live.ts`
  - 新增统一辅助函数：`requireProjectExists`、`requireGroupExists`、`countProjectOwners`、`ensureProjectHasAnotherOwner`。
  - 复用 `requireProjectMemberDirectRoleOrNotFound`，移除重复 SQL 查询片段。
  - 多处调用点改为统一校验入口，降低分支散落与维护成本。
- `apps/logix-galaxy-fe/src/galaxy-api/client.ts`
  - 新增统一请求辅助函数：`requestJson`、`requestAuth`、`requestAuthJson`。
  - 全量替换重复请求样板，保持原有 API 形状与调用方式不变。
- `packages/domain/src/internal/crud/Crud.ts`
  - 抽取 `runWithApi`，统一处理：服务注入缺失提示、业务异常到失败 action 的映射。
  - `query/save/remove` 三条动作链改为复用同一执行骨架，减少重复分支并提升可扩展性。

## 未看过模块

- 除本文件“已深读文件（第一轮）”外，其他模块仍未完成深读，后续将继续按优先级推进。

## 下一步（第一轮）

1. 深读 `apps/logix-galaxy-fe/src/routes/project.tsx` 并拆分为多组件（渲染层与状态层解耦）。
2. 深读 `packages/logix-query/src/Query.ts`，拆分/收敛构造阶段辅助逻辑并补充最小回归。
3. 选择一个 `apps/*-api` 模块继续收敛重复错误映射与鉴权模板。
4. 继续更新本台账中的“阅读状态 / 重构点 / 已完成项 / 未看模块”。
