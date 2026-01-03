# Notes: 071 Logix Router Bridge

> 定位：工程笔记/交接材料（非 SSoT）。任何会影响对外契约/架构的裁决，仍需同步回写到 `spec.md` / `plan.md` / `contracts/*`。

## Scope

- 覆盖：`react-router-dom` vs TanStack Router（仓库：`TanStack/router`；包：`@tanstack/react-router`）的接口证据、差异对比、以及 `Router.Tag` 归一化 Service 形状的设计裁决。
- 不覆盖：具体业务路由表组织方式、Link/Outlet 等 UI 组件层写法、SSR 细节。

## Entry Points

- `specs/071-logix-router-bridge/spec.md`
- `specs/071-logix-router-bridge/plan.md`
- `specs/071-logix-router-bridge/contracts/public-api.md`
- `specs/071-logix-router-bridge/notes/entrypoints.md`
- `specs/071-logix-router-bridge/notes/questions.md`
- `specs/071-logix-router-bridge/notes/sessions/2026-01-03.md`

## Current Hypothesis

- 对外集成形态对齐 `Query.Engine.layer(Query.TanStack.engine(...))`：`Router.layer(Router.ReactRouter.*(...))`，未来可追加 `Router.TanStackRouter.*(...)`。
- `RouterAdapter` 作为内部实现概念存在，但不作为对外 API/类型暴露；对外只暴露 `Router.Tag`（contract）+ `Router.layer(...)`（注入入口）+ 各路由库的 builder（如 `Router.ReactRouter.*`）。
- `Router.Tag` 归一化能力聚焦三件事：一致快照（snapshot）、变更订阅（changes）、导航意图（navigate intent）。
- 一致快照语义（已裁决）：React Router 取 `router.state.location`；TanStack Router 取 `router.state.resolvedLocation`（避免 pending 中间态外泄）。
- builder 形态建议：`Router.ReactRouter.make(dataRouter)` / `Router.TanStackRouter.make(router)` / `Router.Memory.make(...)`，统一产出 `RouterService` 供 `Router.layer(...)` 注入。

## Next Actions

- 已生成 `specs/071-logix-router-bridge/tasks.md`；实现阶段可直接按 tasks 推进（`$speckit implement 071` 或 `$speckit implement-task`）。
- （可选）继续在 `notes/sessions/*` 追加更细的 subscribe/navigate 证据，以支撑实现边界与回归对照。

## Last Flush

- 2026-01-03：深度调研 `react-router-dom` vs TanStack Router（`@tanstack/react-router`），并为 `Router.Tag` 设定可替换的归一化 Service（`RouterAdapter` 仅内部概念）。
