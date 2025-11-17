# Logix 文档应用（apps/docs）

`apps/docs` 是 intent-flow 仓库的用户文档站点，基于 **Next.js + Fumadocs** 搭建，主要面向：

- 使用 Logix 的前端/全栈开发者；
- 在团队内推广 Intent/Flow/Effect 模式的架构师。

文档内容包括：

- **Guide**：从入门到进阶的使用指南（快速上手、Essentials、Learn、Advanced、Recipes）；
- **API**：`@logix/core` / `@logix/react` 的 API 参考；
- **示例与教程**：表单、复杂列表、跨模块协作等典型场景。

## 本地开发

```bash
pnpm install
pnpm dev
```

默认端口为 `http://localhost:3000`，Fumadocs 会根据 `content/docs` 下的 MDX 文件生成文档站点。

## 国际化（i18n）

- 路由前缀：`/zh/*`、`/en/*`（默认语言为 `zh`，Middleware 会把无前缀访问重定向到合适语言）。
- 内容组织：使用 Fumadocs `parser: "dot"`，英文内容通过同名文件加后缀区分，例如：
  - `content/docs/index.mdx`（中文默认）
  - `content/docs/index.en.mdx`（英文）
  - `content/docs/meta.json`（中文默认）
  - `content/docs/meta.en.json`（英文）

## 主要目录

- `content/docs`：文档内容（Guide / API 等），是对外的用户文档 SSoT；
- `source.config.ts`：Fumadocs Source 配置；
- `src/app`：Next.js App 路由与布局（文档入口为 `/{lang}/docs`）。

在修改 Logix 行为或 API 形状时，建议同步更新：

- 规范文档：`.codex/skills/project-guide/references/runtime-logix` / `docs/specs/intent-driven-ai-coding`；
- 用户文档：本目录下的相关 MDX 页面。
