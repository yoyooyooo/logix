# Research: 061 Playground 编辑器智能提示（Logix 全量补全）

**Feature**: `specs/061-playground-editor-intellisense/spec.md`  
**Date**: 2025-12-29

## Decision 1：选择 Monaco 作为编辑器内核

- **Decision**：使用 Monaco Editor（`monaco-editor`）+ React 适配（`@monaco-editor/react`）。
- **Rationale**：
  - 原生 TypeScript 语义能力成熟（补全/诊断/跳转/悬浮）。
  - 能力覆盖本特性验收点（FR-001/003/005/007），且无需引入常驻后端服务。
- **Alternatives considered**：
  - CodeMirror 6：可扩展，但 TypeScript 语义能力要自行拼装（或引入额外服务），成本更高。
  - 远程 LSP/tsserver：超出 scope（需要后端常驻、权限与部署、稳定性治理）。

## Decision 2：TypeScript 语义能力采用 Monaco TS worker

- **Decision**：使用 Monaco 内置 TypeScript worker，不自行实现 language service。
- **Rationale**：
  - 足够满足“示例项目范围内”的类型感知与诊断。
  - 与 Monaco 的模型同步机制天然兼容，风险更低。
- **Alternatives considered**：
  - `@typescript/vfs` 自建 TS LanguageService：能力可控但接入复杂、维护成本高，且与 Monaco 协作更重。

## Decision 3：类型注入采用“预生成 Type Bundle → TS Worker extraLibs”

- **Decision**：通过 Node 脚本预生成一份 Type Bundle（包含 `.d.ts` + 必要的 `package.json`），并在 **TypeScript Worker 启动时**写入 `createData.extraLibs`（注入发生在 Worker 内，避免主线程大规模 `addExtraLib` 卡顿）。
- **Rationale**：
  - **dev/build 一致**：避免依赖 Vite dev 的 `/@fs` 特性导致验收漂移。
  - **可诊断**：bundle 自带 meta（包含包列表/版本摘要），能解释“为什么某模块没类型”。
  - **范围可控**：明确“允许/推荐类型感知的依赖集合”，与 spec 的 scope/assumptions 对齐。
  - **输入稳定**：把大文本解析/注入留在 Worker，满足 NFR-002（响应稳定）。
- **Alternatives considered**：
  - dev-only `/@fs` 动态读取：构建产物不可复现，且 preview/build 会失效。
  - 运行期从 CDN 拉取 types：网络波动与版本漂移风险高，不利于可交付与可回放。
  - 主线程逐个 `addExtraLib`：当 bundle 体积较大（例如 >5MB）时容易引发 UI 冻结，验收风险高。

## Type Bundle 内容范围（初始）

- 必选：
  - `effect`（包含常用子路径，满足 `@logix/*` 的 d.ts 依赖）
  - `@logix/core`、`@logix/react`、`@logix/sandbox`、`@logix/form`
- 必要依赖（用于让上述包的 d.ts 可被完整解析）：
  - `@standard-schema/spec`
  - `fast-check`
  - React JSX 相关类型（`@types/react` 等）

## 性能与体积策略

- Monaco 与 Type Bundle 都按路由懒加载。
- Type Bundle 安装只做一次（全局单例），并提供 loading/ready/error 状态用于解释与排障。
- 非 TS 文本编辑入口默认不启用 type sense，避免把成本扩散到无关区域。

## Open Questions（当前无阻塞项）

- Type Bundle 体积与注入成本：若 Worker 冷启动超过 UX 预算（≤3s ready），再引入分块 bundle（按包/子路径拆分）并在 Worker 内分段加载。
