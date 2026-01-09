# Implementation Plan: 061 Playground 编辑器智能提示（Logix 全量补全）

**Branch**: `061-playground-editor-intellisense` | **Date**: 2025-12-29 | **Spec**: `specs/061-playground-editor-intellisense/spec.md`  
**Input**: Feature specification from `specs/061-playground-editor-intellisense/spec.md`

## Summary

目标：把 `examples/logix-sandbox-mvp` 的代码编辑入口（至少 `/playground` 与 `/ir`）升级为具备 TypeScript 语义能力的编辑器，并在“示例项目范围内”对 Logix 相关能力提供尽可能完整的智能补全、参数提示、悬浮类型信息、跳转与实时诊断；同时保证编辑体验稳定、失败可诊断且允许降级继续运行。

本 plan 的关键裁决（避免实现漂移）：

1. **编辑器内核**：使用 Monaco Editor（`monaco-editor`）作为唯一编辑器内核；React 适配使用 `@monaco-editor/react`。
2. **TypeScript 语义能力**：使用 Monaco 内置 TypeScript worker 提供语义补全/诊断/跳转；编译选项对齐示例项目的 module/jsx/target（ESNext + TSX），但 `lib` 以 Sandbox 运行环境语义为准（默认不含 DOM）。
3. **类型注入（全量补全的根因）**：通过“预生成 Type Bundle（d.ts + 必要的 package.json）→ TypeScript worker 初始化时注入 extraLibs”的方式，把 `effect`、`@logixjs/*` 与必要的依赖类型注入到 Monaco 的 TS 语言服务，使 `import ... from "effect"` / `import ... from "@logixjs/core"` 及其常见子路径在编辑器侧可解析（避免在主线程大规模 `addExtraLib` 导致卡顿）。
4. **性能与稳定性**：Monaco 与 Type Bundle 均按路由懒加载；对 TS 语义能力提供明确状态（loading/ready/error）；必要时降级为当前 textarea 编辑器（仍可运行）。
5. **一致性**：同一套 Editor 组件同时用于 `/playground` 与 `/ir`；非 TS 的编辑入口（例如 step intent script）默认不启用 TS 语义能力，避免无意义的开销与误诊断。
6. **与 core-ng 路线解耦**：本特性仅改善“编辑体验”，默认只面向 `@logixjs/core` 的稳定 API 做类型感知；不引入 `core-ng`/多 kernel 选择能力。若未来要在浏览器侧做 `core`/`core-ng` 对照试跑或暴露 kernel 选择 UI，按 `specs/058-sandbox-multi-kernel/`（046 统筹的 Playground/Sandbox 基础设施）另立实施入口，与 061 解耦推进。

## Questions Digest（plan-from-questions）

来源：外部问题清单（Q001–Q008）通过 `$speckit plan-from-questions` 回灌。

- Q001（性能/卡顿）：Type Bundle 仅在 TypeScript Worker 中加载与注入；主线程不做大规模 `addExtraLib`（必要时按 chunk 组织 bundle，避免 Worker 冷启动超预算）。
- Q002（仓库治理）：`monacoTypeBundle*.generated.*` 默认不提交 Git（`gitignore`）；在 `dev/build/typecheck` 前通过脚本生成，缺失时 UI 进入可诊断降级。
- Q003（补全完整性）：生成脚本递归收集传递依赖 types（以 d.ts import/refs 的可达闭包为准），并提供 allow/deny list 兜底。
- Q004（版本一致性）：生成脚本以 `node_modules` 实际版本为准写入 `meta.packages` 并在 UI 展示；发现缺失/漂移时提示重新生成。
- Q005（Worker 稳定）：Vite 下用 `new URL(..., import.meta.url)` 显式管理 Monaco Worker URL，避免 hash/路径错配导致 404。
- Q006/Q007（语义边界/格式化）：TS 默认采用 WebWorker 语义（不含 DOM）；提供基础格式化（Monaco/TS），不引入 Prettier。
- Q008（复用）：`generate-monaco-type-bundle` 暂不封装为通用 CLI；若要复用另立 spec。

## Deepening Notes

- Decision: 范围仅覆盖示例应用中的 Logix 程序代码编辑入口（`/playground` 与 `/ir`），其它文本编辑不在范围内（source: spec clarify AUTO 2025-12-29）。
- Decision: 用户代码语言语义以 TypeScript/TSX 为默认基线；非 TypeScript 可编辑但不承诺类型感知（source: spec clarify AUTO 2025-12-29）。
- Decision: 类型感知覆盖“示例项目允许/推荐依赖集合”，至少包含 Effect 运行时库、Logix Core、Sandbox、React 适配层与 Form 能力包（source: spec clarify AUTO 2025-12-29）。
- Decision: UX 预算显式化：≤ 500ms 可输入；冷启动首次 ≤ 3s 类型感知就绪（source: spec clarify AUTO 2025-12-29）。
- Decision: 资源稳定验收口径显式化：warm-up 后 20 次切换 JS heap 不持续单调增长（source: spec clarify AUTO 2025-12-29）。
- Decision: TS 语义边界默认采用 WebWorker 语义（不包含 DOM lib），避免补全污染与误导（source: spec clarify AUTO 2025-12-29）。
- Decision: 提供基础自动格式化能力（基于 Monaco/TS），不引入 Prettier（source: spec clarify AUTO 2025-12-29）。
- Decision: 不承诺非允许依赖与 `@logixjs/core-ng` 等专用 API 的类型感知；出现“无法解析模块/类型”的诊断属预期且不阻断闭环（source: spec clarify AUTO 2025-12-30）。

## Existing Foundations（直接复用）

- 路由与页面：`examples/logix-sandbox-mvp/src/App.tsx`（`/playground`）与 `examples/logix-sandbox-mvp/src/ir/IrPage.tsx`（`/ir`）。
- 当前编辑器：`examples/logix-sandbox-mvp/src/components/Editor.tsx`（textarea，非受控同步策略）。
- 运行链路：`@logixjs/sandbox` Worker + esbuild-wasm 编译 + `import(blobUrl)` 运行；编辑器升级不改变运行路径。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM；示例项目 `typescript@~5.9.3`）  
**Primary Dependencies**: pnpm workspace、`effect` v3（override 3.19.13）、`@logixjs/core`、`@logixjs/react`、`@logixjs/sandbox`、Vite、React 19、Monaco Editor  
**Storage**: N/A（类型 bundle 作为前端构建产物；不引入持久化）  
**Testing**: Vitest（示例项目已有 `@effect/vitest` 用例；本特性以手工验收为主，必要时补最小 smoke 用例）  
**Target Platform**: modern browsers（Vite dev/preview） + Node.js 20+（生成 type bundle 的脚本）  
**Project Type**: pnpm workspace（`examples/logix-sandbox-mvp` 为 Vite + React 示例应用）  
**Performance Goals**:

- 页面切换到编辑页后：≤ 500ms 进入“可输入”（编辑器可聚焦并输入）。
- 冷启动首次进入 TS 编辑页：≤ 3s 进入“类型感知就绪”（补全/诊断可用）。
- 常见输入节奏下：输入不应出现持续性卡顿；补全触发不应导致长时间 UI 冻结。
- 资源：路由切换 20 次后资源使用稳定（无明显无界增长）。

**Constraints**:

- 不改变 Logix Runtime 核心语义与 Sandbox 运行协议；本特性只改善“编辑体验”。
- 类型感知失败时必须可降级：仍允许继续编辑与运行（满足 spec NFR-004）。
- 类型注入必须可诊断：明确告诉用户“哪些模块有类型、哪些没有、为什么”。

**Scale/Scope**:

- “全量补全”以**示例项目允许/推荐使用的依赖集合**为边界；不承诺覆盖任意第三方远程依赖的类型（但运行时仍可通过 Sandbox 的远程 bundle 执行）。

## Design（HOW）

### 1) Editor 组件契约

- 保持现有最小契约：`code: string` + `onChange(next: string)`。
- 新增最小化可选项以区分语义能力：
  - `language`: `'typescript' | 'plaintext'`（默认 `'plaintext'`，避免对非 TS 文本引入误诊断）。
  - `filename`: TS 模式下用于诊断与后续扩展（默认 `playground.tsx` / `ir-program.ts`）。
  - `enableTypeSense`: boolean（TS 模式默认 true；plaintext 默认 false）。
- `/playground` 与 `/ir` 显式传入 TS 模式；其它文本编辑入口保持 plaintext。
- 外部 `code` 替换/重置的同步策略（满足 FR-006 的“可预期”）：
  - 仅当外部 `code` 与当前模型内容不同才同步；避免无意义回写导致光标抖动。
  - 保留合理编辑体验：尽量保留 viewState（光标/滚动）；对“全量重置”（如切换 preset）允许重置 viewState，但必须明确且一致。

### 2) Monaco + Worker（Vite 下稳定加载）

- 显式配置 `MonacoEnvironment.getWorker`，按 label 路由到：editor worker / TS worker（避免“能渲染但补全/诊断不可用”）。
- Worker 入口用 `new URL(..., import.meta.url)` 显式声明（Vite build 后能正确产出 hash 文件并被加载），不依赖 CDN。
- Monaco 资源按路由懒加载：只在进入 TS 编辑入口时加载（降低首屏成本）。
- 显式设置 Monaco TypeScript 编译语义（满足 FR-008）：对齐示例项目的 module/jsx/target，但 `lib` 默认不包含 DOM（WebWorker 语义）。
- 注意：示例工程自身 `tsconfig.json` 可能包含 DOM lib；此处不应直接复用 `lib`，以 Sandbox 运行环境语义（默认无 DOM）为准。

### 3) Type Bundle：让 “import effect/@logixjs/*” 在编辑器里可解析

选择：**预生成 Type Bundle（可复现构建产物；默认不提交 Git）**。

- 输入：一组“允许/推荐在 Playground 中使用”的包：
  - 必选：`effect`、`@logixjs/core`、`@logixjs/react`、`@logixjs/sandbox`、`@logixjs/form`
  - 必要依赖：`@standard-schema/spec`、`fast-check`、React JSX 相关类型（`@types/react` 等）
- 收集策略：递归包含传递依赖 types（以“导入可达闭包”为准），避免出现大量 `any` / 缺失类型导致补全质量断崖（并允许手动 allow/deny list 控制异常依赖）。
- 输出：一个可被浏览器直接 import 的模块（例如 `examples/logix-sandbox-mvp/src/components/editor/types/monacoTypeBundle.generated.ts`），包含：
  - `files: Record<string, string>`：key 为虚拟文件路径（建议 `file:///node_modules/...`），value 为文件内容（`.d.ts` 或 `package.json`）
  - `meta`：生成时间、`meta.packages` 版本摘要、（可选）体积统计（用于诊断与性能预算）
- 运行期：TS Worker 启动时加载 Type Bundle 并写入 `createData.extraLibs`（注入发生在 Worker 内）；UI 侧通过 probe/timeout 将状态置为 `ready` 或 `error`。
- 关键约束：禁止在主线程大规模 `typescriptDefaults.addExtraLib`/`addExtraLib` 注入 bundle；如需增量更新 extraLibs，必须在 Worker 内做合并策略，避免 defaults 覆写导致“偶发无类型/补全失效”。

#### 为什么不是 dev-only 的 /@fs 读取

- dev-only 读取会导致 dev 与 build/preview 行为不一致，验收与调试困难；并且无法形成可交付的“类型范围边界”。

### 4) 可诊断状态与降级策略

- UI 在编辑器区域展示 `Type Sense: loading | ready | error`（见 `contracts/README.md`），并在可用时展示版本摘要与就绪耗时（用于验收 NFR-001/002 与排障）：
  - `loading`：显示“正在加载类型（首次会稍慢）”
  - `error`：显示失败原因（缺失 bundle、worker 加载失败、注入失败等）+ 恢复建议（刷新/重新生成 bundle）
- 失败时降级：渲染现有 textarea editor（保证仍可继续运行示例）。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Intent → Flow/Logix → Code → Runtime**：本特性作用于“Code 编辑”一环；不改变 Flow/Runtime 执行语义，只缩短“写代码→发现错误”的反馈回路。
- **docs-first & SSoT**：不修改平台 SSoT（`docs/specs/*`）与 runtime SSoT（runtime SSoT references）；所有决策落在本 spec 的 `plan.md`/`contracts/`，并以示例应用为验收场。
- **Effect/Logix contracts**：不新增/修改对外运行时契约；新增的仅是“编辑器类型注入”内部约定（见 `contracts/README.md`）。
- **IR & anchors**：不涉及统一最小 IR；不新增锚点协议。
- **Deterministic identity**：不涉及 runtime identity。
- **Transaction boundary**：不涉及事务窗口；不引入 IO/async 进事务。
- **Internal contracts & trial runs**：Type Bundle 作为显式、可替换的输入工件；不依赖进程级全局单例；失败时可解释并可降级。
- **Dual kernels (core + core-ng)**：不触及核心内核与契约矩阵；消费者不引入 `@logixjs/core-ng` 依赖。
- **Performance budget**：主要是编辑体验性能（首进可输入/类型就绪/输入响应）。通过路由懒加载 + 状态可视化 + 降级路径避免“不可控变慢”。
- **Diagnosability**：提供 UI 状态与 meta（包含哪些包/版本）用于排障；失败必须可定位原因与恢复建议。
- **Breaking changes**：无 public API 变更；仅示例工程内部实现变化。
- **Public submodules**：不触及 `packages/*` 公共导出结构。
- **Quality gates**：实现阶段至少通过 `pnpm -C examples/logix-sandbox-mvp typecheck` 与 `pnpm -C examples/logix-sandbox-mvp build`；如新增脚本则确保在 Node 20+ 可运行。

### Gate Result (Pre-Design)

- PASS（范围限定在示例应用；不改变 runtime 契约；性能/降级/可诊断性已写入）

### Gate Result (Post-Design)

- PASS（已产出 research/contract/quickstart；实现需按本 plan 的类型范围与降级口径交付）

## Perf Evidence Plan（MUST）

本特性不触及 Logix Runtime 核心路径，但仍需对 NFR-001/002 提供可复现的 UX 证据（用于回归与排障）：

- 记录并展示关键耗时（建议挂在 Type Sense 状态或编辑器 UI）：`inputReadyMs`、`typeSenseReadyMs`（可区分 cold/warm）。
- 展示 bundle 元信息用于解释与定位：`meta.packages`（name/version）+（可选）体积统计（filesCount/totalBytes）。
- 验收以 `quickstart.md` 的 Step 0/4 为准；若 UI 未展示耗时，使用浏览器 DevTools Performance 录制进行对照。

## Project Structure

### Documentation (this feature)

```text
specs/061-playground-editor-intellisense/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── README.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
examples/logix-sandbox-mvp/
├── package.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── ir/IrPage.tsx
    └── components/
        ├── Editor.tsx               # 替换为 Monaco 版（保留 fallback textarea）
        └── editor/
            ├── monacoWorkers.ts     # MonacoEnvironment.getWorker 配置
            ├── types/
            │   └── monacoTypeBundle.generated.ts  # 预生成的 d.ts + package.json 集合（默认 gitignore）
            └── typesense.ts         # 安装/状态管理（loading/ready/error）

examples/logix-sandbox-mvp/scripts/
└── generate-monaco-type-bundle.ts   # 生成 monacoTypeBundle.generated.ts（Node 脚本）
```

**Structure Decision**:

- 仅在 `examples/logix-sandbox-mvp` 内落地（示例工程自洽），不把编辑器能力下沉为通用包；避免在 runtime 核心路径引入新依赖。
- 类型注入以“可复现工件”（generated module）形式交付：默认不提交 Git，通过脚本生成；运行期 UI 必须能解释当前 bundle 的版本/范围与失败原因。

## Complexity Tracking

无（不触及宪章硬约束；复杂度主要来自 type bundle 生成与体积控制，通过“懒加载 + 明确范围 + 降级”来控风险）
