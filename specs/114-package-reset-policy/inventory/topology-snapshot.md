# Inventory: Topology Snapshot

## Goal

记录当前各包的公开层、internal cluster、测试镜像和特殊目录，供后续 family template 与处置矩阵复用。

## Snapshot Matrix

| Package | Public Surface Snapshot | Internal Snapshot | Test Snapshot | Notes |
| --- | --- | --- | --- | --- |
| `@logixjs/core` | `src/*.ts` 已有 `Kernel.ts`、`Runtime.ts`、`Module.ts`、`Logic.ts`、`Process.ts`、`Observability.ts`、`Reflection.ts` 等公开入口 | `src/internal/runtime`、`src/internal/observability`、`src/internal/reflection`、`src/internal/platform`、`src/internal/workflow` | `test/Contracts`、`test/Runtime`、`test/Process`、`test/observability`、`test/internal` | 现状已经接近可拆 kernel 的主战场 |
| `@logixjs/core-ng` | `src/index.ts`、`CoreNgLayer.ts`、`RuntimeServices.impls.ts` | 无深层 internal cluster | `test/*.test.ts` 主要覆盖 runtime services 与 full cutover gate | 适合作为吸收到 kernel 的遗留支线 |
| `@logixjs/react` | `RuntimeProvider.ts`、`Hooks.ts`、`Platform.ts`、`ReactPlatform.ts` | `src/internal/provider`、`hooks`、`store`、`platform` | `test/Hooks`、`test/RuntimeProvider`、`test/integration`、`test/browser`、`test/internal` | 宿主语义已成簇，可复用资产较多 |
| `@logixjs/sandbox` | `Client.ts`、`Protocol.ts`、`Service.ts`、`Vite.ts` | `src/internal/compiler`、`kernel`、`worker` | `test/Client`、`test/browser` | 适合作为 trial/runtime control plane 的实验场 |
| `@logixjs/test` | `Assertions.ts`、`Execution.ts`、`TestProgram.ts`、`TestRuntime.ts`、`Vitest.ts` | `src/internal/api`、`runtime`、`utils` | `test/Execution`、`test/TestProgram`、`test/TestRuntime`、`test/Vitest` | 公开面已经围绕 test runtime 成形 |
| `@logixjs/devtools-react` | `DevtoolsLayer.tsx`、`LogixDevtools.tsx`、`FieldGraphView.tsx` | `src/internal/snapshot`、`state`、`theme`、`ui` | `test/internal`、`test/FieldGraphView` | 需要去除第二诊断事实源心智 |
| `@logixjs/query` | `Engine.ts`、`Query.ts`、`TanStack.ts`、`Fields.ts` | `src/internal/engine`、`logics`、`middleware`、`tanstack` | `test/Query`、`test/Engine*`、`test/typecheck` | 具有 program-first 倾向和较完整测试 |
| `@logixjs/form` | `Form.ts`、`Rule.ts`、`Field.ts`、`FormView.ts`、`Path.ts`、`react/**` | `src/internal/form`、`dsl`、`schema`、`validators` | `test/Form`、`Rule`、`Path`、`Field`、`internal`、`typecheck` | 当前混合 domain 与 host 子树，需要重新分界 |
| `@logixjs/i18n` | `I18n.ts`、`I18nModule.ts`、`Token.ts` | `src/internal/driver`、`module`、`token` | `test/I18n`、`I18nModule`、`Token` | 旧 `I18nModule` 入口仍在主线上 |
| `@logixjs/domain` | `Crud.ts`、`index.ts` | `src/internal/crud` | `test/Crud` | 结构很薄，适合按 pattern-kit 方向重启 |
| `@logixjs/cli` | `Commands.ts`、`bin/logix.ts`、`bin/logix-devserver.ts` | `src/internal/commands`、`artifacts`、`output`、`args` | `test/Integration`、`test/Args` | 旧命令面明显仍含 anchor/IR 历史负担 |

## Cross-Cutting Observations

- 绝大多数包已经形成 `src/*.ts + src/internal/** + test/**` 的基本轮廓，可直接拿来做 family template 基线
- `@logixjs/form` 是当前最明显的 domain 与 host 混合体
- `@logixjs/react`、`@logixjs/sandbox`、`@logixjs/test` 都已有较强的测试镜像，可优先复用
