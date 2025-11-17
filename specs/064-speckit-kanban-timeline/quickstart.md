# Quickstart: 064-speckit-kanban-timeline

## 目标

在本仓库本地一键打开“Specs 时间线 Kanban”页面，并能通过 UI 浏览与更新 `specs/*`。

## 运行（一键）

1. 在仓库根目录执行：

```bash
pnpm speckit:kanban
```

2. 浏览器会自动打开页面（内置 server 提供静态站点 + `/api`）。

也可作为独立工具运行（推荐，便于分发）：

```bash
npx speckit-kit kanban
```

## 常见问题

- 如果要指定目标仓库：`npx speckit-kit kanban --repo-root /path/to/repo`。
- 如果端口冲突：默认随机端口；可显式指定 `--port 5510`，或使用 `PORT=5510 pnpm speckit:kanban`。
- 如果不想自动打开浏览器：加 `--no-open`（或 `NO_OPEN=1`）。
