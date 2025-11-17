---
name: component-consumer
description: 当业务团队需要在本地或 CI 中使用 IMD 组件库，并基于业务模块提炼可复用资产时 MUST 加载本 skill。
---

# IMD 组件消费者指南

本 skill 只覆盖业务方需要牢记的“核心概念 + 操作路线”。当你需要逐步操作或模板时，按下文指引加载相应 reference。

## WHEN

- 在业务应用或 Monorepo 中安装/升级 IMD 组件、模板、Block、Icons。
- 定制主题、i18n、icons 的同时，仍要遵循官方 CLI 契约。
- 评估并提炼业务模块，交付为 ui/lib/block/template 资产。

## CORE IDEAS

- **components.json = 契约**：每个 workspace 都要提供该文件，声明落盘路径、Tailwind、i18n 与别名；缺失/不一致会直接阻塞 CLI。
- **CLI 三件套**：`imd init`（初始化环境）、`imd add`（落地资产）、`imd icons`（同步图标）；所有命令默认在应用包执行，CLI 会自动处理 packages/ui。
- **资产层次**：ui（样式与轻交互）、lib/hook（数据/状态）、block（组合片段）、template（页级骨架）。提炼时先判定复用价值，再决定落点。
- **配套产物**：任何新增组件必须同时具备 Demo、文档、`meta.json`、`.PROMPT.md` 与测试；缺一视为未完成。

## WORKFLOW OVERVIEW

1. **准备环境**：Node 20 + pnpm 9 + `corepack`，项目根存在 `components.json`，别名与 tsconfig 对齐。
2. **初始化 & 导入**：运行 `imd init`，随后用 `imd add <asset>` 落地组件/模板；保持 CLI 输出文件结构不被手动重写。
3. **定制与升级**：样式优先用 CSS 变量，逻辑通过 wrapper/hook 扩展；升级时执行 `imd add <asset> --overwrite` 并审阅 diff。
4. **验证与 CI**：`pnpm lint && pnpm typecheck && pnpm test` 后再 `pnpm build`；CI 中缓存 `.generated`、`node_modules`，并在构建前重跑所需命令。
5. **模块提炼**：当业务模块具备复用价值，按“识别 → 设计 → 实施 → 交付”流程拆解，将可复用部分沉淀到 ui/lib/block/template。

## REFERENCES

- `references/usage.md`：环境基线、初始化、组件导入、定制、升级、CI/故障排查、Monorepo 协作要点。
- `references/module-extraction.md`：从业务模块识别、API 设计到实现、校验、LLM 协作与回落策略的详细流程。

> 需要细节时，按需加载上述 reference 文件即可。
