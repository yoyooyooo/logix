# Inventory: Reuse Candidates

## Goal

先把高价值、已对齐主链、适合直接平移的实现与测试资产登记出来，避免后续目录重组时被误删。

## Reuse Ledger

| Package | Candidate Paths | Why Reuse First |
| --- | --- | --- |
| `@logixjs/core` | `src/internal/runtime/core/**`, `src/internal/observability/**`, `src/internal/reflection/**`, `test/Contracts/**`, `test/Runtime/**`, `test/Process/**`, `test/observability/**` | 已覆盖 kernel、runtime shell、verification、diagnostics 主战场 |
| `@logixjs/core-ng` | `src/RuntimeServices.impls.ts`, `test/RuntimeServices*.test.ts`, `test/KernelContract.verifyKernelContract.test.ts` | 适合作为 support matrix 与迁移门的输入材料 |
| `@logixjs/react` | `src/internal/provider/**`, `src/internal/store/**`, `src/internal/hooks/**`, `test/Hooks/**`, `test/RuntimeProvider/**`, `test/integration/**` | 已体现宿主语义、provider 生命周期与无 tearing 相关覆盖 |
| `@logixjs/sandbox` | `src/Protocol.ts`, `src/Client.ts`, `src/internal/worker/**`, `test/Client/**`, `test/browser/**` | 可直接复用协议、worker 骨架和浏览器验证 |
| `@logixjs/test` | `src/Assertions.ts`, `src/TestRuntime.ts`, `src/Vitest.ts`, `test/TestRuntime/**`, `test/Vitest/**` | 与统一 test runtime 和 vitest integration 最接近 |
| `@logixjs/devtools-react` | `src/internal/snapshot/**`, `test/internal/ProcessEvents.integration.test.tsx`, `test/internal/TimeTravel.test.tsx` | 可复用 UI/观测切片，但需重新挂到统一 control plane |
| `@logixjs/query` | `src/internal/engine/**`, `src/internal/tanstack/**`, `test/Query/**`, `test/Engine.combinations.test.ts`, `test/TanStack.engine.cacheLimit.test.ts` | 引擎、cache、race 语义与 program-first 方向相邻 |
| `@logixjs/form` | `src/internal/form/**`, `src/internal/schema/**`, `src/internal/validators/**`, `test/Form/**`, `test/Rule/**`, `test/Field/**`, `src/react/**` | 领域与 host 混合较多，但 form kernel、schema 与 tests 仍有高复用价值 |
| `@logixjs/i18n` | `src/Token.ts`, `src/internal/token/**`, `src/internal/driver/**`, `test/I18n/**`, `test/Token/**` | token 与 driver 能直接服务 service-first 主线 |
| `@logixjs/domain` | `src/Crud.ts`, `src/internal/crud/**`, `test/Crud/**` | 结构简单，crud kit 价值明确 |
| `@logixjs/cli` | `src/internal/artifacts.ts`, `src/internal/output.ts`, `src/internal/result.ts`, `src/internal/stableJson.ts`, `src/internal/commands/trialRun.ts`, `test/Args/**` | artifact、输出和部分 trial 路由已接近新控制面需求 |

## Reuse Rule

- 只有在默认行为、公开面、控制面口径冲突时，才放弃复用
- 若路径未来会封存，先在 owner spec 中登记 successor path，再做平移
- 平移后的 successor path 必须符合对应 family template 与 topology contract
