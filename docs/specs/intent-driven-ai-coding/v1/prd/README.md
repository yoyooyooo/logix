# Intent-driven Platform PRD · Interactive Prototype

该目录承载基于 **Vite + React + Zustand + TanStack Query** 的交互式原型，用真实编码与 mock 数据展示“意图 → 模式 → 模版 → Plan → Flow”全链路：

- `intent-studio-prototype/`：独立 Vite 子项目，可通过 `pnpm install && pnpm dev` 运行；
- 所有数据均来自 `docs/specs/intent-driven-ai-coding/v1` 既有 YAML，转换为 `src/data/raw/*` 下的 JSON/TS；
- UI 包括 Intent Studio、Pattern/Template Gallery、Plan 控制台和 Flow Viewer，支持实时编辑 Intent 元信息并查看行为 Flow 对应的 `.flow.ts` 片段。

运行示例：

```bash
cd docs/specs/intent-driven-ai-coding/v1/prd/intent-studio-prototype
pnpm install
pnpm dev
```

启动后即可看到左侧意图清单、右侧多面板 UI，以及 mock CLI log/Plan JSON 等内容。
