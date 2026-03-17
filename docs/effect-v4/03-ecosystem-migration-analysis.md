# 非 core 包迁移分析（react/sandbox/cli/i18n/query/form/domain/apps/examples）

## 1. 热区分布

| 目标 | service | catch | fork | fiber | runtime | yield* |
|---|---:|---:|---:|---:|---:|---:|
| packages/logix-react | 33 | 5 | 7 | 16 | 362 | 137 |
| packages/logix-sandbox | 3 | 0 | 0 | 1 | 9 | 35 |
| packages/logix-cli | 2 | 15 | 0 | 0 | 12 | 37 |
| packages/i18n | 4 | 2 | 4 | 0 | 11 | 43 |
| packages/logix-form | 0 | 1 | 1 | 0 | 46 | 263 |
| packages/logix-query | 6 | 1 | 1 | 0 | 24 | 99 |
| packages/domain | 6 | 5 | 0 | 0 | 15 | 68 |
| apps/logix-galaxy-api | 11 | 27 | 0 | 0 | 1 | 402 |
| apps/logix-galaxy-fe | 0 | 0 | 0 | 0 | 1 | 236 |
| examples/logix | 27 | 13 | 7 | 2 | 49 | 390 |
| examples/logix-react | 5 | 0 | 0 | 0 | 65 | 70 |
| examples/logix-sandbox-mvp | 2 | 1 | 1 | 0 | 4 | 96 |

说明：`runtime` 列包含 `ManagedRuntime.run*` 与 `Logix.Runtime.make` 相关调用，主要用于体量估算。

## 2. 运行时基础设施层（先迁）

## 2.1 `packages/logix-react`

- 风险最高（运行边界与上下文传播都在这里）。
- 重点：
  - `ManagedRuntime` 适配层
  - `runFork/runPromise/runSync/runCallback` 封装
  - `FiberRef + Effect.locally` 传播逻辑
- 关键文件：
  - `packages/logix-react/src/internal/provider/runtimeBindings.ts`
  - `packages/logix-react/src/internal/store/ModuleCache.ts`
  - `packages/logix-react/src/internal/hooks/useProcesses.ts`

## 2.2 `packages/logix-sandbox`

- 风险点：worker 里 `FiberRef.initial` 相关逻辑与运行入口。
- 关键文件：
  - `packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`
  - `packages/logix-sandbox/src/Service.ts`

## 2.3 `packages/i18n`

- 风险点：`Runtime.runFork` + fork/join/interrupt 链。
- 关键文件：
  - `packages/i18n/src/internal/driver/i18n.ts`

## 2.4 `packages/logix-form` / `logix-query` / `domain`

- 风险点：`forkScoped + catch* + serviceOption` 组合链。
- 不宜在 core 未稳前改，避免双向漂移。

## 2.5 `packages/logix-cli`

- 风险点：入口执行与错误收敛语义，受 keep-alive 变化影响。
- 关键文件：
  - `packages/logix-cli/src/bin/logix.ts`
  - `packages/logix-cli/src/internal/commands/*`

## 3. 业务应用与示例层（后迁）

## 3.1 `apps/logix-galaxy-api`

- `Context.Tag` + `catchAll*` 命中高。
- 建议在 core/react 适配完成后批量替换，避免重复改。

## 3.2 `apps/logix-galaxy-fe`

- 主要受上游 runtime API 传导影响。

## 3.3 `examples/*`

- 命中范围广，但优先级应低于引擎与基础设施。
- 作为迁移收尾与文档验收载体。

## 4. 文档与教程层（最后统一）

- 重点更新：
  - `apps/docs/content/docs/api/react/provider*`
  - `apps/docs/content/docs/guide/learn/escape-hatches/*`
  - 包 README（尤其 react/sandbox）
- 原则：避免出现“代码已迁，文档仍是 v3 写法”的双真相源。

## 5. 建议顺序（非 core）

1. `packages/logix-react`
2. `packages/logix-sandbox` + `packages/i18n`
3. `packages/logix-query` + `packages/logix-form` + `packages/domain`
4. `packages/logix-cli`
5. `apps/logix-galaxy-api` -> `apps/logix-galaxy-fe`
6. `examples/*` + `apps/docs/*` + 各包 README

