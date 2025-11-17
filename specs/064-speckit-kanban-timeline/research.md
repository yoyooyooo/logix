# Research: 064-speckit-kanban-timeline

本文件用于记录本特性在进入实现前的关键裁决（Decision）、理由（Rationale）与备选方案（Alternatives）。

## Decision 1：看板“列”= spec（时间线）

- Decision：看板以 `specs/NNN-*` 目录为“列”，按时间线顺序展示（最新在最左）。
- Rationale：满足“线性时间线式 Kanban”与“最近在做什么”的核心诉求；与 `drafts-tiered-system` 的“分级列”思路类似，但维度换成时间线。
- Alternatives considered：
  - 以“阶段”（spec/plan/tasks/implement）为列：不符合“最新 spec 在左”的描述。
  - 以“状态”（todo/doing/done）为列：需要额外引入全局状态来源，超出 MVP。

## Decision 2：卡片来源以 tasks.md 为主（最小闭环）

- Decision：卡片默认来自 `tasks.md` 的可勾选任务项；详情可下钻到来源文件。
- Rationale：tasks 是推进的最小单位，天然适配“卡片”；写入闭环也最直接（勾选状态持久化）。
- Alternatives considered：
  - 以 spec.md 的 US/FR/SC 为卡片：适合“需求视图”，但不如 tasks 直指推进。
  - 以 git commit / issue 为卡片：需要外部系统或 VCS 依赖，超出范围。

## Decision 3：后端使用 Effect HttpApi 模板（speckit-kit CLI）

- Decision：后端基于 `examples/effect-api/` 的 HttpApi 组织方式演进，落点为 npm CLI 包 `speckit-kit`：`packages/speckit-kit/src/server/*`（Effect v3 + `@effect/platform-node`）。
- Rationale：对齐后端栈与 DI 模式（Tag/Layer），便于测试与扩展；交付形态改为独立 CLI，更利于分发与复用，同时保持 `$speckit` skill 目录纯净（不内置前后端项目/构建产物）。
- Alternatives considered：
  - 复用 drafts-tiered-system 的 Hono server：更轻，但与本次要求不符。

## Decision 4：前端构建产物随 npm CLI 分发 + 单进程运行（交付体验优先）

- Decision：前端工程位于 `packages/speckit-kit/ui/*`，构建产物输出到 `packages/speckit-kit/dist/ui`；运行时由 `speckit-kit` 单进程 server 直接 serve 静态站点，并在同一端口下提供 `/api/*`。
- Rationale：交付体验保持“一键运行、单进程打开页面”，同时将分发责任移到 npm 包（`npx speckit-kit kanban`），避免 `$speckit` skill 自身携带沉重的构建产物。
- Alternatives considered：
  - 双进程（Vite dev + API）：开发爽，但与“skill 内只需一键运行”的目标不一致。

## Decision 5：安全边界（本机 + 受控路径）

- Decision：后端仅绑定 localhost，并限制文件访问在仓库受控范围内（至少 `specs/`）；拒绝任何路径穿越。
- Rationale：提供文件读写能力必须默认安全；符合 spec 的边界假设。
