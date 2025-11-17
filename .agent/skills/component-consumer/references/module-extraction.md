# 业务模块提炼指引

## 目标

帮助业务团队把“已有业务模块”识别并沉淀为可复用的 IMD 资产（ui/lib/block/template），以提升交付效率。

## 识别阶段

1. **复用价值评估**
   - 是否有两个以上项目/BU 需要同一模块？
   - 复用时主要变化在样式（→ ui/block）、逻辑（→ lib/hook）还是整体场景（→ template）？
   - 能否抽离与业务耦合的依赖，形成通用接口？
2. **信息收集**
   - 场景背景、用户角色、关键旅程。
   - 交互结构（步骤、控件、状态）。
   - 数据模型（字段、校验、依赖 API/权限）。
   - 约束：品牌、语言、可访问性、性能、离线/弱网。
3. **职责拆分**
   - 按“数据准备 → 状态管理 → 展示”切分。
   - 可纯函数化的逻辑优先沉到 lib/hook；展示层再考虑 ui/block/template。

## 设计阶段

1. **API 草案**
   - 组件 PascalCase，Props camelCase。
   - 受控组件提供 `value/onChange` 与 `defaultValue`。
   - block/template 仅暴露必要 slot/回调，禁止绑定业务 store。
2. **依赖梳理**
   - 列出所需 IMD 组件/第三方库/icons。
   - 准备对应 `imd add <asset>` 命令，避免遗漏。
3. **资产类型决策**
   - `ui`: 样式化 + 轻交互。
   - `lib/hook`: 数据转换、状态、适配层。
   - `block`: 组合多个 UI/Pro 组件的业务片段。
   - `template`: 页级骨架或流程。

## 实施阶段

1. **生成目录**：使用 CLI 在目标层级创建骨架；Monorepo 必须在 `apps/*` 运行命令。
2. **源码抽取（从现有模块到组件）**
   1. **圈定边界**：在原模块中标记要抽出的 JSX/逻辑，列出依赖的状态、API、样式、i18n 与全局工具。
   2. **拆 Props/State**：
      - 所有外部依赖通过 props 传入，禁止直接访问业务 store。
      - 受控组件提供 `value/onChange` + `defaultValue`；事件回调命名统一 `onXxx`。
      - 业务常量改为 props 默认值或 `const DEFAULT_*`。
   3. **目录与文件**
      - **UI/Pro**：在业务仓库中挑选与 CLI 输出一致的目录（如 `components/ui/<component>`），入口文件 `'use client'`，可选 `types.ts`、`meta.json`、`__tests__/`。
      - **Block/Chart**：放入业务方定义的 `components/blocks` 或 `components/charts`；入口导出 `Component`，本地内联 `chartData`、`ChartConfig`。
      - **Template**：使用 `templates/<scenario>/` 结构，入口 `index.page.tsx` 配合 `table.tsx`、`store/index.ts` 管理状态；在对应说明文件中记录依赖关系。
      - **lib/hook**：统一落在 `lib/` 与 `hooks/` 目录；lib 使用 `.ts`，hook 视是否包含 JSX/DOM 选择 `.ts` 或 `.tsx`。若 hook 与浏览器 API 交互，文件顶部加 `'use client'`。
      - **Monorepo 场景**：严格遵循各自 `components.json.aliases` 指定的路径（例如 `@workspace/ui/components/*`），以便 CLI 或后续同步脚本复用。
   4. **编码要求（按类型约束）**
      - **UI/Pro**
        - 文件顶部 `'use client'`，组件用 `forwardRef` + `React.ComponentPropsWithoutRef`，并设置 `displayName`。
        - 复用 `cn`、`tailwind-variants`、CSS 变量，函数嵌套 ≤3 层。
        - 所有默认文案通过 `useTranslation('imd')`，不要硬编码。
        - 主题/尺寸/状态统一用 `const variants = tv({ ... })`；外部可通过 props 改写。
        - 透传 `className`、`style`、`...props`。
      - **Hooks**
        - 若使用浏览器 API（剪贴板、window、document 等）或 React 状态，顶部加 `'use client'`。
        - 暴露 `UseXOptions`、`UseXReturn` 类型，返回对象稳定排序。
        - 使用 `useCallback`/`useRef`/`useEffect` 做副作用清理；提供降级策略（如 `execCommand`）。
      - **lib**
        - 纯函数或工具模块，不引入 React，不使用 `'use client'`。
        - 给出 JSDoc（示例参考 `lib/common.ts`），并将副作用隔离在调用方。
      - **Template**
        - 入口 `index.page.tsx` 仅负责拼装；表格/表单逻辑拆到 `table.tsx`、`store/*`。
        - 明确 `registryDependencies`（如 `ui-drawer`, `pro-page-filter`），通过 props/上下文串接。
      - **Charts/Blocks**
        - 默认导出 `Component`，本地定义 `chartData` 与 `ChartConfig`，使用 `var(--chart-x)` 控制颜色。
        - 引入项目内统一的图表基础组件（如 `AreaChart`、`ChartTooltip`），保持 `config`/`data` 可拓展，避免将业务逻辑写死。
      - **通用**
        - Hooks/lib 除必要 effect 外保持无副作用。
        - 在 `meta.json.dependencies` / `registryDependencies` 列出组件与 lib 依赖。
   5. **无 Demo 模式**：若阶段目标仅是封装源码，至少提交 `index.tsx` + `meta.json` + `__tests__/placeholder`；`meta.json.description` 中注明“Demo/Docs 待补”，后续补齐其余资产。
3. **配套资产（完整交付时）**
   - Demo：默认、变体、受控/异常等关键场景。
   - 文档：安装步骤、示例、Props、最佳实践。
   - `meta.json`: `description` + `tags` + `dependencies` + `registryDependencies`。
   - `.PROMPT.md`: 由 Demo 提炼。
   - 测试：渲染、交互、a11y、键盘/焦点。
4. **校验**
   - `pnpm lint && pnpm typecheck && pnpm test --filter <asset>`。
   - `pnpm imd build-registry` 更新示例与 manifest。

## 交付与回落

1. **交付前自检**
   - API 是否通用？命名、一致性、alias/path 是否正确？
   - 默认文案、theme、icons 是否列出依赖？
2. **LLM 协作模板**
   - 输入必须包含：场景、用户目标、流程、数据结构、兼容性要求、预期资产类型。
   - 期望输出：目标资产类型+理由、Props/函数签名、依赖清单（含 `imd add` 建议）、实施 checklist（实现→Demo→文档→测试→Registry）、“不提炼”判定条件。
3. **回落策略**
   - 若复用价值不足或依赖过深，记录原因并保留观察清单；可在业务仓库暂存 wrapper，等待条件成熟再正式提炼。
