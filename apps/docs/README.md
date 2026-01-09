# Logix 文档应用（apps/docs）

`apps/docs` 是 intent-flow 仓库的用户文档站点，基于 **Next.js + Fumadocs** 搭建，主要面向：

- 使用 Logix 的前端/全栈开发者；
- 在团队内推广 Intent/Flow/Effect 模式的架构师。

文档内容包括：

- **Guide**：从入门到进阶的使用指南（快速上手、Essentials、Learn、Advanced、Recipes）；
- **API**：`@logixjs/core` / `@logixjs/react` 的 API 参考；
- **示例与教程**：表单、复杂列表、跨模块协作等典型场景。

## 本地开发

```bash
pnpm install
pnpm dev
```

默认端口为 `http://localhost:3000`，Fumadocs 会根据 `content/docs` 下的 MDX 文件生成文档站点。

## 国际化（i18n）

- 路由前缀：默认语言为英文（无前缀），中文为 `/cn/*`（Fumadocs Middleware 会把无前缀请求 rewrite 到默认语言）。
- 内容组织：使用 Fumadocs `parser: "dot"`，中文内容通过同名文件加 `.cn` 后缀区分，例如：
  - `content/docs/index.mdx`（英文默认）
  - `content/docs/index.cn.mdx`（中文）
  - `content/docs/meta.json`（英文默认）
  - `content/docs/meta.cn.json`（中文）

## 主要目录

- `content/docs`：文档内容（Guide / API 等），是对外的用户文档 SSoT；
- `source.config.ts`：Fumadocs Source 配置；
- `src/app`：Next.js App 路由与布局（文档入口为 `/docs`（英文）与 `/cn/docs`（中文））。
- `src/components/ui`：shadcn/ui 基础组件（唯一基元来源）。
- `src/components/landing`：docs 首页 Landing 的 Section 组件与文案配置。

在修改 Logix 行为或 API 形状时，建议同步更新：

- 规范文档：`docs/ssot/runtime` / `docs/specs/intent-driven-ai-coding`；
- 用户文档：本目录下的相关 MDX 页面。

## 首页 Landing 约束（硬约束）

- 颜色：只使用 tokens（CSS variables）及其派生；禁止硬编码颜色值。
- 组件：基础 UI 只使用 shadcn/ui（`src/components/ui/*`），业务层只做组合。
- 禁止：backdrop blur / backdrop filter、`0 0 Npx` glow 阴影。
- 动效：只用 Framer Motion，并尊重 reduced-motion。
