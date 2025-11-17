# IMD 组件库使用手册（业务项目）

## 环境基线

- Node 20 + pnpm 9，建议启用 `corepack`.
- 项目根目录必须有 `components.json`；缺失时运行 `npx imd@latest init --yes`。
- `components.json.aliases` 与 `tsconfig/jsconfig` paths 保持一致，确保 `@/components`、`@workspace/ui` 等路径可解析。
- 推荐在 `package.json` 中加入：
  ```json
  {
    "scripts": {
      "imd:init": "imd init --yes",
      "imd:add": "imd add",
      "imd:icons": "imd icons init --env dev",
      "imd:sync": "imd add --overwrite",
      "check": "pnpm lint && pnpm typecheck && pnpm test"
    }
  }
  ```

## 初始化流程

1. 若为新工程，可先 `npx create-next-app@latest my-app --typescript --tailwind --eslint`，再切换 Node 版本。
2. 在项目根执行 `npx imd@latest init --yes`，CLI 会落地 `cn`、CSS 变量、`components.json`、Tailwind 配置与别名。
3. 需要官方主题时安装 `@imd/design-system`，并在 `globals.css` 注入 `@imd/design-system/themes/imd.css`；Tailwind 的 `baseColor/cssVariables/prefix` 按 `components.json.tailwind` 管理。

## 引入组件/模板

1. 通过文档或 `imd add --list` 确认资产名称。
2. 运行 `npx imd@latest add ui-button`、`imd add pro-table --path src/components/pro-table` 等命令，覆盖时追加 `--overwrite/-o`。
3. 按 CLI 输出安装缺失的 peer dependencies，保留自动生成的 `'use client'`、类型导出与注释。
4. 在业务代码中导入并运行 `pnpm dev`/`pnpm build` 验证。

## 定制策略

1. **样式**：优先调整 CSS 变量或 `components.json.tailwind`；若需额外样式，只在拷贝后的组件中追加 `className` 且保留 `cn`。
2. **行为**：通过 wrapper 或 Hook 扩展，避免直接改 CLI 落地文件，方便未来 `imd add --overwrite` 同步。
3. **i18n**：调用 `initImdI18n(i18n)` 并使用 `useTranslation('imd')`；新增语言遵循 `xx_XX` 命名并注册到 `getDefaultTranslations`。
4. **Icons**：执行 `imd icons init --env dev`，在 `tailwind.config.ts` 中启用 `@imd/icons/tailwind` 插件。

## 升级与同步

1. 先运行 `imd add <component> --overwrite` 获取最新源码，再用 `git diff` 合并自定义逻辑。
2. 若拓展较多，先在 wrapper 中兼容新 API，再切换底层组件。
3. 固定 `imd` CLI 版本；升级前阅读 release notes 并在分支验证。

## 质量校验与 CI

1. 本地执行 `pnpm lint && pnpm typecheck && pnpm test --filter <scope>`，之后 `pnpm build` 验证 SSR/RSC。
2. CI 阶段在安装后运行 `pnpm imd:init`（或相应命令），按需执行 `imd add`、`imd icons`，缓存 `node_modules`、`pnpm-store`、`.generated`。
3. 构建前统一 `pnpm lint && pnpm typecheck && pnpm test && pnpm build`，需要预览站点时可加 `imd add --overwrite` 验证自动合并。

## 故障排查

- **CLI 无响应**：检查当前目录是否存在 `components.json`，必要时使用 `--cwd`。
- **路径错误**：同步 `components.json.aliases` 与 tsconfig/jsconfig paths，并清理编译缓存。
- **依赖问题**：按照 CLI 提示安装 peer/optional 依赖，禁止随意改版本。
- **样式/图标缺失**：确认主题 CSS 引入、Tailwind 插件配置，以及重新执行 `imd icons init`.
- **语言缺 key**：对比语言文件或启用 i18n debug 追踪缺失。
- **CI 构建失败**：核对 Node 版本、`imd init` 是否执行、CLI 输出的错误详情。

## 多包协作（Monorepo）摘要

1. **角色**：`apps/*` 运行 CLI 并交付业务；`packages/ui` 保存官方源码（禁止修改）；`packages/overrides-ui` 存放二次封装以复用。
2. **命令路径**：所有 `imd` 命令在业务包执行，CLI 自动写入 `packages/ui` 并更新导入。
3. **workspace 配置**：每个工作区必须有 `components.json` 与匹配的 paths；`style/iconLibrary/baseColor` 保持一致。Tailwind v4 下 `tailwind.config` 设为空字符串，仅配置 `css`、`baseColor`、`cssVariables`。
4. **入口 CSS**：`apps/*/styles/globals.css` 依次引入 `tailwindcss`、`@workspace/ui/globals.css`、主题 CSS，并通过 `@source`（v4）或 `content`（v3）覆盖 monorepo 全路径。
5. **导入策略**：默认从 `@workspace/ui/components|hooks|lib` 引入；如使用 overrides 包，在 tsconfig 中为其设置更高优先级。
6. **i18n/主题注入**：仅在应用包处理 Provider 与 Cookie，组件包保持无副作用。
