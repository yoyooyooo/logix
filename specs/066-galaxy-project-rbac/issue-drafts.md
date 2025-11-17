# Issue Drafts: 066 · logix-galaxy 项目管理与 RBAC（成员/角色/权限/成员组）

> 用途：把 `specs/066-galaxy-project-rbac/tasks.md` 的任务集合整理成可复制的 issue 草稿，便于同步到任意 issue tracker。
>
> 说明：本特性任务已全部完成；若你仍需要在 tracker 留痕，可按本文件创建后直接关闭。

**Target GitHub Repo (required)**: `<owner/repo>`  
**Source of Truth**: `specs/066-galaxy-project-rbac/tasks.md`  
**Acceptance**: `specs/066-galaxy-project-rbac/quickstart.md` + `specs/066-galaxy-project-rbac/contracts/openapi.yaml`

## 推荐：按 User Story / Cross-Cutting 合并成 6 个 Issue

### 1) Setup + Foundational（Shared Infrastructure）

**Title**: `[066] Setup: Project/RBAC 基础设施落点与 schema init`  
**Tasks**: T001, T002, T003, T004, T005, T006  
**Done Criteria**:

- 后端启动时按 `LOGIX_GALAXY_AUTO_MIGRATE_PROJECT_RBAC` 完成幂等建表
- RBAC primitives 与 Repo Tag 契约可被后续 US1/US2/US3 复用

### 2) US1 Backend（Project + Member + Access + Audit）

**Title**: `[066][US1] Backend: Project/Member/Access API + Audit repo + wiring`  
**Tasks**: T007, T008, T009, T010, T011  
**Done Criteria**: `quickstart.md` 第 6–8 节（curl）可跑通：创建项目、添加成员、viewer 无法变更成员

### 3) US1 Tests

**Title**: `[066][US1] Tests: handler-level 覆盖（权限语义 + 审计可回归）`  
**Tasks**: T012, T013  
**Done Criteria**: `apps/logix-galaxy-api/src/project/project.http.test.ts` 覆盖 US1 关键场景

### 4) US2 Backend + Tests（Group + Role binding）

**Title**: `[066][US2] Backend+Tests: 成员组（Group）与角色绑定 + /access 生效`  
**Tasks**: T014, T015, T016, T017  
**Done Criteria**: `quickstart.md` 第 9–11 节（curl）可验证：创建组、加组成员、`/access` 权限发生变化

### 5) US3 Frontend（Dogfooding）

**Title**: `[066][US3] Frontend: 路由联调闭环（Logix dogfooding）`  
**Tasks**: T018, T019, T020, T021, T022, T023, T024, T025, T026, T027, T028, T029  
**Done Criteria**: 启动后端 + 前端，完成：登录 → 创建项目 → 添加成员 → 创建组/加组成员；直输 URL 的路由守卫生效

### 6) Polish + Post-acceptance + Devtools

**Title**: `[066] Polish: 审计查询/环境模板/质量门 + Post-acceptance 回归 + Devtools`  
**Tasks**: T030, T031, T032, T033, T034, T035, T036, T037, T038, T039, T040  
**Done Criteria**:

- 审计端点可查询且关键动作必写审计
- env 模板包含 `LOGIX_GALAXY_AUTO_MIGRATE_PROJECT_RBAC`
- Post-acceptance 用例覆盖常见错误体/权限不变量
- FE DEV 模式可启用 Devtools

## 可选：按 Task 逐条创建 Issue

- 直接以 `specs/066-galaxy-project-rbac/tasks.md` 的每条 `Txxx` 作为 issue（title+body）。
- 如需我“真正创建 GitHub issues”，你需要提供目标仓库 `owner/repo`（或完整 URL）。

