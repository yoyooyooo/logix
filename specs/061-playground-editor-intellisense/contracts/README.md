# Contracts: Monaco Type Bundle（内部约定）

本目录不定义对外网络 API；它固化“编辑器类型注入”的最小内部约定，避免实现漂移，且便于诊断与回放。

## Contract 1: `MonacoTypeBundle`

### Purpose

为浏览器内的 Monaco TypeScript 语言服务提供可解析的类型文件集合，使示例项目允许/推荐使用的依赖在编辑器侧具备补全/诊断/跳转能力。

### Shape（建议）

- `meta`
  - `generatedAt`: ISO 时间字符串
  - `packages`: `Array<{ name: string; version: string }>`（用于诊断）
  - `stats?`: `{ filesCount: number; totalBytes: number }`（可选；用于性能/体积诊断）
  - `note?`: 可选说明（例如“只覆盖示例项目范围”）
- `files`: `Record<string, string>`
  - key：虚拟文件路径（建议以 `file:///node_modules/` 为根，例如 `file:///node_modules/effect/package.json`、`file:///node_modules/effect/dist/dts/index.d.ts`）
  - value：文件内容（`.d.ts` 或 `package.json`）

### 生成物拆分（实现细节，便于性能）

为避免 UI 侧为了展示 meta 而加载超大 `files` 对象，生成物允许拆分为多文件：

- `monacoTypeBundle.generated.meta.ts`：仅 `meta`（UI 侧可 import，用于展示版本/统计）
- `public/monacoTypeBundle.generated.files.json`：仅 `files`（体积最大；Worker 侧通过 `fetch` 加载，避免 dev 下把超大 TS 模块纳入 transform/HMR 链路）
- （可选）`monacoTypeBundle.generated.files.ts`：仅 `files`（便于本地调试/查看；不建议在运行时 import）
- （可选）`monacoTypeBundle.generated.ts`：入口（聚合 `meta + files`；同上，不建议在运行时 import）

### Guarantees

- `files` 至少覆盖：
  - `effect` 与其被 `@logixjs/*` 的 d.ts 引用到的子路径
  - `@logixjs/core`、`@logixjs/react`、`@logixjs/sandbox`、`@logixjs/form` 的发布 d.ts（以 `dist/*.d.ts` 为准）
  - 让上述类型可解析的必要依赖（例如 `@standard-schema/spec`、`fast-check`、React JSX 类型）
- bundle 安装是幂等的：重复进入编辑页不会导致重复注入与无界资源增长。

### Non-goals

- 不承诺为任意第三方远程依赖提供类型（运行时可执行 ≠ 编辑器可推导）。
- 不提供多文件工程/跨文件重构能力（超出本特性 scope）。

## Contract 2: Type Sense 状态口径

编辑器侧必须对用户可见：

- `loading`：正在加载 Monaco 或类型 bundle
- `ready`：补全/诊断可用
- `error`：失败原因可解释，并给出恢复建议；同时允许降级继续编辑与运行

## Contract 3: TypeScript 语义边界（默认 WebWorker）

- TS 模式默认采用 WebWorker 语义（`lib` 不包含 DOM），与 `spec.md` 的 FR-008 对齐。
- “ready” 必须意味着：worker 已就绪 + bundle 已注入 + 语义边界已生效（避免“看似 ready 但补全/诊断漂移”）。
- 为了便于文档/示例只展示“核心代码块”，TS Worker 额外注入一个全局 prelude：`declare const Logix: typeof import('@logixjs/core')`，使代码块可省略 `import * as Logix from '@logixjs/core'`（仅影响编辑器类型；运行时代码仍建议显式 import）。

### Notes（易错点）

- TS Worker 内的 `compilerOptions.lib` 采用 **lib 文件名**（例如 `lib.es2020.d.ts`、`lib.webworker.d.ts`），不要写成 tsconfig 的简写（如 `es2020` / `webworker`），否则会触发“找不到 Array/IterableIterator 等全局类型”的噪声诊断。
