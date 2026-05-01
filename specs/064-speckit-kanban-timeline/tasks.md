# Tasks: 064 Speckit 时间线 Kanban（Specs Timeline Board）

**Input**: `specs/064-speckit-kanban-timeline/spec.md` + `specs/064-speckit-kanban-timeline/plan.md`
**Scope**: `packages/speckit-kit/*` + `package.json` + `.codex/skills/speckit/SKILL.md` + `specs/064-speckit-kanban-timeline/*`
**Note**: 本任务清单按 User Story（P1→P3）组织，保证每个故事可独立验收。

## Phase 1: Setup（工程落盘）

- [x] T001 使用 `effect-api-project-init` 的工程骨架（Effect HttpApi）作为后端基线：`packages/speckit-kit/src/server/*`
- [x] T002 落盘前端工程：`packages/speckit-kit/ui/*`（Vite + React + Tailwind）
- [x] T003 增加单进程 CLI server（静态站点 + `/api`）：`packages/speckit-kit/src/bin/speckit-kit.ts`
- [x] T004 在根 `package.json` 增加脚本 `speckit:kanban` 指向 `speckit-kit` CLI（会先 build）

---

## Phase 2: Foundational（后端基础能力）

- [x] T005 实现 repo root 解析与路径守卫 `packages/speckit-kit/src/server/util/repo-paths.ts`
- [x] T006 实现 Spec 扫描 + 标题推断 `packages/speckit-kit/src/server/specboard/specboard.service.live.ts`
- [x] T007 实现 tasks.md 解析（checkbox 任务）`packages/speckit-kit/src/server/specboard/specboard.tasks.ts`
- [x] T008 定义 HTTP 合约 `packages/speckit-kit/src/server/specboard/specboard.contract.ts`
- [x] T009 实现 handlers 与 Layer wiring `packages/speckit-kit/src/server/specboard/specboard.http.live.ts`
- [x] T010 把 specboard group 挂到 API 入口 `packages/speckit-kit/src/server/app/effect-api.ts`

---

## Phase 3: User Story 1 - 时间线看板（Priority: P1）🎯 MVP

**Goal**: 打开页面即可按时间线浏览 specs；横向滚动；列内纵向滚动；页面整体无滚动条。

**Independent Test**: `pnpm speckit:kanban` 打开页面后能看到 specs 列表，最新在最左，并满足滚动约束。

- [x] T011 [US1] 前端实现 API client `packages/speckit-kit/ui/src/api/client.ts`
- [x] T012 [US1] 实现看板布局与渲染 `packages/speckit-kit/ui/src/app/App.tsx`
- [x] T013 [US1] 实现 spec 列组件 `packages/speckit-kit/ui/src/components/SpecColumn.tsx`
- [x] T014 [US1] 实现任务卡片组件 `packages/speckit-kit/ui/src/components/TaskCard.tsx`
- [x] T015 [US1] （可选）保留 Vite `/api` 代理用于本地开发 `packages/speckit-kit/ui/vite.config.ts`
- [x] T028 [US1] 顶部筛选：默认隐藏已完成任务；整列任务已完成的 spec 列也隐藏 `packages/speckit-kit/ui/src/app/App.tsx`

---

## Phase 4: User Story 2 - 卡片详情（Priority: P2）

**Goal**: 点卡片可查看详情并返回看板，状态不丢失。

**Independent Test**: 点击卡片打开详情弹窗，关闭后滚动位置保持。

- [x] T016 [US2] 后端提供读取文件接口（spec.md/plan.md/tasks.md）`packages/speckit-kit/src/server/specboard/specboard.http.live.ts`
- [x] T017 [US2] 前端实现详情弹窗 `packages/speckit-kit/ui/src/components/TaskDetailDialog.tsx`

---

## Phase 5: User Story 3 - 最小写入闭环（Priority: P3）

**Goal**: 在 UI 中更新推进状态并持久化到文件。

**Independent Test**: 在 UI 勾选任务后刷新页面仍保持一致。

- [x] T018 [US3] 后端实现任务勾选切换并原子写回 `tasks.md` `packages/speckit-kit/src/server/specboard/specboard.http.live.ts`
- [x] T019 [US3] 前端实现任务勾选交互与刷新 `packages/speckit-kit/ui/src/components/TaskCard.tsx`
- [x] T020 [US3] 后端实现受控文件写入接口（PUT）`packages/speckit-kit/src/server/specboard/specboard.http.live.ts`
- [x] T021 [US3] 前端提供简单编辑并保存（textarea 即可）`packages/speckit-kit/ui/src/components/TaskDetailDialog.tsx`

---

## Phase 6: Polish & Safety

- [x] T022 [P] 增加/迁移后端测试覆盖 `packages/speckit-kit/src/server/**.test.ts`
- [x] T023 更新 `speckit` 文档入口 `.codex/skills/speckit/SKILL.md` 指向一键启动命令
- [x] T024 运行质量门：`pnpm -C packages/speckit-kit build && pnpm speckit:kanban`
- [x] T025 [P] 生成 npm 交付产物：`packages/speckit-kit/dist/*`
- [x] T026 [P] 迁移交付形态：看板从 `$speckit` 内置项目迁移为 npm CLI `speckit-kit`
- [x] T027 [P] 最小验收：服务能启动、静态资源可访问、API 可读写 `specs/*`
