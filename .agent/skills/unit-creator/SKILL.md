---
name: unit-creator
description: 使用内置模板快速生成 IMD 新「单元」（UI 组件、业务 Block、Hook、lib 模块、模板片段）的标准骨架（源码、示例、文档）；用于在 apps/www2/registry/default 下新增单元并遵循项目命名与目录约定。
---

# 快速创建单元（组件 / Block / Hook / lib）

- 内置模板根：`.agent/skills/unit-creator`
- 默认入口：通过 `skt generate` 基于模板 + 宏在 `apps/www2/registry/default` 下落盘源码。
- UI/Pro 组件完整骨架（含测试）可使用 `.agent/skills/project-guide/scripts/component-scaffold.ts`，或使用本 skill 提供的 `ui-component` 模板（两者骨架结构保持一致）。
- UI/Pro 组件也可通过脚本 `.agent/skills/unit-creator/scripts/scaffold-ui-component.mjs` 自动推导宏并调用 `ui-component` 模板。

前置条件：

- 推荐在环境中安装 `skt` CLI，或设置 `SKT_BIN` 指向可执行入口；否则可直接调用 `component-scaffold.ts` 或手工创建文件。

## 标准使用流程

1. 明确要创建的单元类型、命名和期望输出范围（源码 / 示例 / 文档），必要时先运行 `skt templates list`（参见「`skt` CLI 渐进式速查」）确认模板是否存在。
2. 使用 `skt list --template <name>`（可带 `--required-only`）拿到宏与插槽契约，再根据下文命名规则或脚本自动推导宏值。
3. 通过 `skt generate` 的 `--dry-run`（或脚手架脚本的 dry-run 默认值）预览生成计划，检查输出路径与宏是否正确。
4. 确认无误后改用 `skt generate --no-dry-run --overwrite`（或脚本 `--write`）写盘，保持单次命令只做一件事：要么干预 dry-run，要么正式写入。
5. 若模板包含 slot（`// [slot:name]`），使用 `skt fill slot` 一次性填充实现，而不是编辑整文件；缺字段时用 `skt list --remaining-only` 追踪未完成项。
6. 完成骨架后立即执行对应验证（见文末「验证矩阵」），把错误限制在生成阶段，避免拖到实现期。

## 支持的单元类型与模板

- UI 组件：例如按钮、表单项、列表项等，通常对应 `ui-*` 模板。
- 业务 Block：如「订单概览卡片」「报表筛选区」等，通常需组合多组件，目前建议按项目指南手动设计目录结构。
- Hook：如 `useFoo`、`useBizState` 等逻辑复用单元，可使用 `hook-basic` 模板。
- lib 模块：通用工具/适配层，可使用 `lib-basic` 模板。
- 模板片段：只生成某一类文件（如 Demo、Doc）骨架，可通过 `--files` 限定输出。

## 宏与插槽（macro & slot）速记

- **宏（macros）**：在「生成阶段」一次性提供的配置值。
  - 每个模板在 frontmatter 中声明自己的宏定义（必填 / 可选、示例），例如：
    - `ui-component`：`COMPONENT / LAYER / DOC_SLUG / PASCAL`。
    - `hook-basic`：`HOOK_FILE / HOOK_EXPORT`。
    - `lib-basic`：`LIB_DIR / LIB_EXPORT`。
    - `block-basic`：`BLOCK_NAME / BLOCK_COMPONENT`。
  - `skt generate` 会用这些宏：
    - 计算输出路径（如 `apps/www2/registry/default/__LAYER__/__COMPONENT__/index.tsx`）。
    - 替换模板内容中的占位符（如组件名、文案、data-attribute 等）。
  - 对 LLM 来说，宏 =「告诉模板我要生成什么组件/文件」的结构化参数；**不要随意发明新宏名**，只能使用模板定义里出现的那几个。

- **插槽（slots）**：在「实现阶段」填充的代码/文案锚点。
  - 模板内容中通过特殊标记声明，例如：`/* @slot:render */`、`/* @slot:demo-body */` 等。
  - 每个文件的可用插槽在模板定义里显式列出（名称、类型 text/code、是否必填），`skt generate` 会据此生成「缺失插槽」的计划信息。
  - 推荐工作流：
    - 第一步：用 `unit-creator`/脚本 + `skt generate` 生成**骨架文件**（插槽只留占位，不写具体实现）。
    - 第二步：根据需求，使用 `skt fill slot` 向指定文件/插槽注入代码或文案，而不是整体重写文件。
      - 例如：向 `ui-transfer/index.tsx` 的 `render` 插槽填充 JSX。
  - 对 LLM 来说，插槽 =「模板为你预留的可变部分」：
    - 不要手动删掉 slot 标记（否则后续无法通过 `fill slot` 做增量修改）。
    - 若需要实现/调整行为，优先选择**填充或更新插槽**，避免整体覆盖骨架结构。

> **LLM 使用约定（重要）**
>
> - 将这些模板视为「约定好的标准骨架」，`skt generate` 成功返回即视为骨架已正确落盘，无需为了「确认」再逐个 `read` 新生成的文件。
> - 如需向用户说明「骨架里大概有什么」，请优先依据本 Skill 中的说明（典型输出路径、宏语义、是否带 `data-component`/占位样式/slot 标记等），而不是先生成再把文件内容读一遍进行复述。
> - 只有在需要**基于骨架实现具体业务逻辑或调整 API** 时，才按需打开对应的实现文件/示例/文档进行增量修改，并推荐通过 `skt fill slot` 或局部编辑完成，而不是整体重写骨架。

当前内置模板（`--template` 参数）：

- `ui-component`：UI/Pro 组件骨架（含默认 Demo 与文档）。
- `hook-basic`：通用 Hook 骨架（`.tsx` + `.meta.json`）。
- `lib-basic`：纯函数 lib 模块骨架（`index.ts` + `meta.json`）。
- `block-basic`：Block 区块骨架（`blocks/<name>/index.tsx` + `meta.json`）。

> 实际模板名以 `skt templates list --template-root .agent/skills/unit-creator --json` 返回为准；LLM 可以根据用户描述选择最匹配的模板。
>
> 注意：`--template-root` 需要指向包含 `templates/**/template.md` 的上层目录，这里应使用 `.agent/skills/unit-creator`，而不是 `.agent/skills/unit-creator/templates`。

### ui-component（UI/Pro 组件）

- 宏（由脚本或 LLM 计算并通过 `--macros` 传入）：
  - `__COMPONENT__`：组件完整名（形如 `ui-foo-bar` 或 `pro-foo-bar`）。
  - `__LAYER__`：层级（`ui` | `pro`）。
  - `__DOC_SLUG__`：文档短名（不含前缀，例 `hello-world`）。
  - `__PASCAL__`：导出名（PascalCase，例 `HelloWorld`）。
- 推导规则：名称以 `ui-` 或 `pro-` 开头时优先生效；否则按 `--layer`（默认 `ui`）补齐前缀，例如输入 `hello-card` + `--layer pro` 会自动生成 `pro-hello-card`，`__DOC_SLUG__` 始终取去前缀后的部分，`__PASCAL__` 由 slug 每段首字母大写拼接。
- 典型输出：
  - `apps/www2/registry/default/__LAYER__/__COMPONENT__/index.tsx`
  - `apps/www2/registry/default/__LAYER__/__COMPONENT__/meta.json`
  - `apps/www2/registry/default/__LAYER__/__COMPONENT__/__tests__/index.test.tsx`
  - `apps/www2/registry/default/examples/__LAYER__/__COMPONENT__/default-demo.tsx`
  - `apps/www2/registry/default/examples/__LAYER__/__COMPONENT__/default-demo.PROMPT.md`
  - `apps/www2/content/docs/__LAYER__/__DOC_SLUG__.mdx`

### hook-basic（通用 Hook）

- 宏：
  - `__HOOK_FILE__`：Hook 文件名（kebab-case，例 `use-copy`）。
  - `__HOOK_EXPORT__`：导出名（camelCase，例 `useCopy`）。
- 推导规则：`__HOOK_EXPORT__` 使用 camelCase，首段保持小写，其余段首字母大写（脚本 `scaffold-hook.mjs` 的 `toCamel` 实现可直接复用）。
- 输出：
  - `apps/www2/registry/default/hooks/__HOOK_FILE__.tsx`
  - `apps/www2/registry/default/hooks/__HOOK_FILE__.meta.json`
- 说明：模板默认带 `'use client'` 与 Options/Return 接口，仅提供最小骨架；是否保留 `'use client'` 取决于是否使用浏览器 API，生成后可按需调整。

### lib-basic（纯函数 lib 模块）

- 宏：
  - `__LIB_DIR__`：lib 目录名（kebab-case，例 `string`）。
  - `__LIB_EXPORT__`：默认导出函数名（camelCase，例 `formatString`）。
- 推导规则：与 `hook-basic` 相同，`__LIB_EXPORT__` 由目录名转换为 camelCase。
- 输出：
  - `apps/www2/registry/default/lib/__LIB_DIR__/index.ts`
  - `apps/www2/registry/default/lib/__LIB_DIR__/meta.json`

### block-basic（Block 区块）

- 宏：
  - `__BLOCK_NAME__`：Block 目录名（kebab-case，例 `form`、`page-list`）。
  - `__BLOCK_COMPONENT__`：导出组件名（PascalCase，例 `FormBlock`）。
- 推导规则：`__BLOCK_COMPONENT__` 直接把 `__BLOCK_NAME__` 各段首字母大写拼接，可通过脚本 `scaffold-block.mjs` 自动完成。
- 输出：
  - `apps/www2/registry/default/blocks/__BLOCK_NAME__/index.tsx`
  - `apps/www2/registry/default/blocks/__BLOCK_NAME__/meta.json`

## 脚手架脚本（建议入口）

- UI/Pro 组件：
  - `node .agent/skills/unit-creator/scripts/scaffold-ui-component.mjs <name> [--layer ui|pro] [--with-docs] [--with-examples] [--write]`
  - 示例：`ui-hello-world` → 自动推导宏并调用 `ui-component` 模板。
- Hook：
  - `node .agent/skills/unit-creator/scripts/scaffold-hook.mjs <hook-file-name> [--write]`
  - 示例：`use-copy-advanced` → 生成 `hooks/use-copy-advanced.tsx` + `.meta.json`。
- lib 模块：
  - `node .agent/skills/unit-creator/scripts/scaffold-lib.mjs <lib-dir-name> [--write]`
  - 示例：`string-utils` → 生成 `lib/string-utils/index.ts` + `meta.json`。
- Block：
  - `node .agent/skills/unit-creator/scripts/scaffold-block.mjs <block-name> [--write]`
  - 示例：`form` → 生成 `blocks/form/index.tsx` + `meta.json`。

> **脚本内部行为总览**
>
> 所有脚本本质上都是对 `skt generate` 的轻量包装，统一负责：
>
> - 固定 `--template-root .agent/skills/unit-creator`、`--root .`，保证只在 IMD 仓库工作区内写文件。
> - 从命令行参数推导模板宏，然后以 `--macros '{...}'` 形式调用：
>   - `scaffold-ui-component.mjs`：根据 `<name>`/`--layer` 推导 `COMPONENT/LAYER/DOC_SLUG/PASCAL`，使用模板 `ui-component`，可按 `--with-docs` / `--with-examples` 限定输出文件集合。
>   - `scaffold-hook.mjs`：根据 `<hook-file-name>` 推导 `HOOK_FILE/HOOK_EXPORT`，使用模板 `hook-basic`。
>   - `scaffold-lib.mjs`：根据 `<lib-dir-name>` 推导 `LIB_DIR/LIB_EXPORT`，使用模板 `lib-basic`。
>   - `scaffold-block.mjs`：根据 `<block-name>` 推导 `BLOCK_NAME/BLOCK_COMPONENT`，使用模板 `block-basic`。
> - 默认以 `--dry-run --json` 方式调用 `skt generate`（仅预览计划）；显式传 `--write` 时改为 `--no-dry-run --overwrite --json` 真正落盘。
>
> 这些脚本 **不会** 在内部做任何「填充 slot」「打开并修改已存在文件」的操作，它们只负责根据命令行参数构造一次 `skt generate` 调用并输出 JSON 计划/结果。上层若需要在骨架基础上补充实现，应通过 `skt fill slot` 或直接编辑目标文件完成。

> 脚本公共参数：
>
> - `--write`：切换到落盘模式并自动追加 `--no-dry-run --overwrite`，默认省略时只输出计划。
> - `--dry-run`：显式保持 dry-run，可与 `--write` 二选一。
>
> ui 组件脚本额外参数：
>
> - `--layer ui|pro`：强制层级，优先级低于名称前缀，默认 `ui`。
> - `--with-docs` / `--with-examples`：只生成指定子集，不传则生成所有骨架文件。

## `skt` CLI 渐进式速查

本节按照「先最少信息 → 再进阶控制」的顺序汇总 `skt` 调用方式，避免在 Skill 主体重复粘贴整行命令。除非特别说明，所有命令都默认带上 `--template-root .agent/skills/unit-creator --root . --json`。

### 1. 模板与输入

- **发现模板列表**

  ```bash
  skt templates list --template-root .agent/skills/unit-creator --json
  ```

  - 输出模板名 + 描述，用于确认是否存在目标骨架。

- **读取宏 / 插槽定义**
  ```bash
  skt list --template <name> \
    --template-root .agent/skills/unit-creator \
    [--required-only] \
    [--remaining-only --root . --macros '{...}']
  ```

  - `macros[]`: `key / required / desc / example`，是唯一可信的输入契约。
  - `slots[]`: `file / name / type / required / desc / example`，描述每个插槽如何填充。
  - `references[]`: 额外文档或链接。
  - `--required-only` 收紧输出到必填项；`--remaining-only` 在已有生成结果上只列出缺失字段（需指定 `--root` + 先前的 `--macros`）。
  - 对 LLM 来说，`skt list` 是决策「需要哪些宏、如何安排 slot」的首要入口，禁止凭记忆臆测。

### 2. 生成骨架

```bash
skt generate --template <name> \
  --template-root .agent/skills/unit-creator \
  --root . \
  --macros '{...}' \
  <模式开关> --json
```

| 模式     | 关键参数                       | 典型场景                         |
| -------- | ------------------------------ | -------------------------------- |
| 计划预览 | `--dry-run --plan-level brief` | 默认输出生成计划即可。           |
| 写盘覆盖 | `--no-dry-run --overwrite`     | 相同请求直接落盘，避免重复执行。 |

- `--files <path...>`：只生成部分骨架。
- `--preview <rel/path> --plan-level full`：定位具体文件看渲染后内容。
- `skt generate` 的 JSON 响应带有 `files[]` 与 `ok`，可直接作为验证依据，一般无需再 `cat` 新文件。

### 3. 插槽填充

```bash
skt fill slot \
  --root . \
  --file <rel/path> \
  --slot <name> \
  --value '<content>' \
  --no-dry-run --json
```

- 长文本/TSX 代码：改用 `--in -` + heredoc，避免转义。
- 若插槽锚点暂未落盘，可加 `--on-miss append --allow-append` 指示「缺失即追加」。
- 使用 `skt list --remaining-only ...` 检查哪些 slot 仍需填充，再调用 `fill slot` 补齐。

### 4. JSON-in / JSON-out 通道

- 视 `skt` 为纯粹的结构化后端，优先通过 stdin 传 JSON，避免复杂引号：
  ```bash
  echo '{ "template": "<name>", "root": ".", "macros": { ... }, "dryRun": false }' \
    | skt generate --input-json - --json
  ```
  ```bash
  echo '{ "root": ".", "file": "<rel/path>", "slot": "<name>", "value": "..." }' \
    | skt fill slot --from-json - --json
  ```
- JSON schema 以 `skt capabilities --json` 为准，`unit-creator` 只固定模板根与输出目录约束；其余参数（如 `planLevel`、`files`）按官方 schema 传递即可。
- 临时/人工操作也可继续用 `--macros '{...}'`，短文本可以 `--value` 或 `--slots`，关键是保持单次调用只处理一个目标。

### 5. 执行模式建议

- 没有特殊审阅需求时，直接一次性 `--no-dry-run --overwrite` 或脚本 `--write`，避免 `dry-run + 真写` 套娃。
- 骨架生成完成后，把 slot 实现阶段完全交给 `skt fill slot`；除非必要，不要手动删除 slot 标记。
- 出现构建/类型错误再定点 `read` 对应文件，减少无谓的「生成后逐文件复述」。

## 端到端示例：新增 `ui-hello-world`

1. 选模板：`skt list --template ui-component --template-root .agent/skills/unit-creator --required-only --json` → 需要 `COMPONENT/LAYER/DOC_SLUG/PASCAL`。
2. 推宏：脚本 `node .agent/skills/unit-creator/scripts/scaffold-ui-component.mjs ui-hello-world --dry-run` 会自动得到 `ui-hello-world / ui / hello-world / HelloWorld`。
3. JSON 调用（等价于脚本）：
   ```bash
   cat <<'REQ' | skt generate --input-json - --json
   {
     "template": "ui-component",
     "templateRoot": ".agent/skills/unit-creator",
     "root": ".",
     "macros": {
       "COMPONENT": "ui-hello-world",
       "LAYER": "ui",
       "DOC_SLUG": "hello-world",
       "PASCAL": "HelloWorld"
     },
     "dryRun": true,
     "planLevel": "brief"
   }
   REQ
   ```
4. 检查计划无误后，把 `dryRun` 设为 `false` 或脚本加 `--write`，即可生成源码 + 测试 + 示例 + 文档。
5. 若要局部生成，在步骤 2 中追加 `--with-docs`/`--with-examples`，或在 JSON 里加 `"files": [ ... ]`。

## 验证矩阵

- UI/Pro 组件、Block：`pnpm typecheck`（至少）+ `pnpm imd build-registry`（确保 registry 产物结构正确）。
- Hook、lib：`pnpm typecheck` 足够；若 Hook 涉及客户端逻辑，再补 `pnpm www:test --filter hooks`（可选）。
- 模板片段（仅 Demo/Doc）：运行对应 lint/format（`pnpm format:check apps/www2/content/docs/<layer>`）并在浏览器预览前确保 `pnpm www:dev` 无警告。

后续验证（按需）：

- `pnpm typecheck`
- `pnpm imd build-registry`
