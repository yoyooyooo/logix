# Quickstart: 061 Playground 编辑器智能提示（验收）

## 目标

验证 `examples/logix-sandbox-mvp` 的 `/playground` 与 `/ir` 在编辑阶段具备：补全、参数提示、悬浮类型、跳转与可定位诊断，并且失败可降级继续运行。

## 运行

- 启动：`pnpm -C examples/logix-sandbox-mvp dev`
- 打开 `/playground` 与 `/ir` 两个路由进行验收

## 一键自动验收（可选）

- 运行：`node specs/061-playground-editor-intellisense/scripts/e2e-acceptance.cjs`
  - 默认会先 `build` 再用 `preview` 跑 e2e；可用 `--no-build` 跳过构建

## 验收步骤（对应 spec）

### 0) 体验预算（NFR-001）

- 冷启动首次进入 `/playground`：编辑器应在 ≤ 500ms 内可输入，并在 ≤ 3s 内进入“类型感知 ready”。
- 后续路由切换：编辑器应保持“几乎立即可输入”（以 ≤ 500ms 为口径），类型感知应可恢复（不要求每次都重新加载）。
- 计时口径：优先以 UI 展示的 `inputReadyMs`/`typeSenseReadyMs` 为准；若未实现展示，则用 DevTools Performance 录制（从路由切换开始计，到编辑器首次可输入/状态变为 ready）。

### 1) `/playground`：Logix 能力补全与诊断（FR-001/003/005/007）

- 看到编辑器的“类型感知状态”从 `loading` 进入 `ready`。
- 免 import 写法（可选）：编辑器侧默认注入 `declare const Logix: typeof import('@logixjs/core')`，所以可以直接写 `Logix.xxx` 获得类型；运行时是否自动补 `import * as Logix from "@logixjs/core"` 由 Header 的 `Kernel` 区域 `autoImport` 开关控制。
- 在编辑器中输入并触发补全：
  - `Logix.`（应出现核心命名空间/模块入口）
  - `Logix.Module.`（应出现 `make` 等核心能力）
- 验证悬浮与跳转（FR-001）：在任意来自 `effect` 或 `@logixjs/*` 的符号上悬浮应显示类型信息；“跳转到定义”应能打开声明（d.ts）。
- 验证 TS 语义边界（FR-008）：输入 `document.` 触发补全，应出现“无法解析 document / 找不到名称”的诊断（默认不包含 DOM lib）。
- 验证导入错误诊断（FR-005 / US2）：写一个不存在的导入符号或明显错误的导入路径，应出现可定位错误（而不是静默失败）。
- 触发一次格式化（Format Document / Selection），确认编辑器能对当前文档做基础排版（FR-009）。
- 新增一个 action，并在逻辑中调用：
  - 在 action 声明处新增一个键（例如 `dec`）
  - 在逻辑中输入 `$.actions.` 并触发补全（应包含新增 action）
- 人为制造一个明显类型错误（例如把不兼容值赋给字段），确认在 1 秒内出现可定位诊断与原因摘要。

### 2) `/ir`：同类入口体验一致（FR-002）

- 打开 `/ir` 页面，确认编辑器仍具备补全/悬浮/诊断能力（无需与 `/playground` 完全相同，但必须同口径可用）。
- 验证外部代码替换的可预期性（FR-006）：切换一个 preset（触发外部 `code` 替换），确认编辑器内容同步正确且仍可继续编辑（不应出现持续性光标抖动/丢输入）。

### 3) 失败可诊断且可降级（NFR-003/004）

- 让类型感知进入失败态（建议用 DevTools Network 的 Request Blocking 阻止 `*monacoTypeBundle.generated*` 或 `*ts.worker*` 请求后刷新），确认：
  - UI 显示明确失败原因与恢复建议（刷新/重新生成 bundle 等）
  - 编辑器降级为基础文本编辑仍可输入
  - 运行按钮与 Sandbox 执行链路仍可用

### 4) 资源稳定性（SC-004）

- warm-up：先各进入一次 `/playground` 与 `/ir`，等待类型感知进入 `ready`。
- 打开浏览器的内存/性能面板（含 JS heap 观测），连续 20 次在两个路由间切换并进行少量编辑：
  - 输入与补全不应出现持续性卡死；
  - warm-up 后 JS heap 不应呈现持续单调增长（允许短期波动）。

## 常见问题

- 补全不出现：优先看“类型感知状态”是否为 `ready`，以及错误提示中是否指出缺失的模块类型。
- `@logixjs/core`（或其它 workspace 包）更新后提示仍是旧版本：本仓对 `@logixjs/core/@logixjs/react/@logixjs/sandbox` 的类型注入来自各自的 `dist/*.d.ts`，需先构建再重新生成 type bundle：
  - `pnpm -C packages/logix-core build`（必要时也对改动过的 `packages/logix-react` / `packages/logix-sandbox` 执行 `build`）
  - `pnpm -C examples/logix-sandbox-mvp gen:monaco:types -- --force`
  - 刷新页面（必要时硬刷新），让 TS worker 重新加载新的 `monacoTypeBundle.generated.files.json`
- 类型与运行不一致：本特性只保证“示例项目允许/推荐依赖集合”的类型一致性；远程依赖仍可能“可运行但无类型”。
- 导入第三方包全红/提示“无法解析模块”：若该包不在允许/推荐依赖集合（type bundle 未覆盖），这是预期行为；将其纳入 bundle 覆盖范围并重新生成后即可恢复补全。
