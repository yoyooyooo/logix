# Inventory: Host Reuse Ledger

## Goal

先登记四个宿主包里已对齐 `kernel + runtime control plane` 方向、应优先复用的协议、helper、fixture 和测试资产。

## Reuse Candidates

| Package | Path | Kind | Reuse Mode | Why |
| --- | --- | --- | --- | --- |
| `@logixjs/react` | `src/internal/provider/**`, `src/internal/store/**` | `helper` | `keep` | 已承接 React host runtime 与 store 语义 |
| `@logixjs/react` | `test/RuntimeProvider/**`, `test/Platform/**`, `test/integration/**` | `test` | `keep` | 已覆盖 provider、platform、integration 主链 |
| `@logixjs/sandbox` | `src/Protocol.ts`, `src/internal/worker/**` | `protocol` | `keep` | 已靠近 controlled trial + worker contract |
| `@logixjs/sandbox` | `test/Client/**`, `test/browser/**` | `test` | `keep` | 已覆盖 client layer 与 worker/browser path |
| `@logixjs/test` | `src/internal/runtime/**`, `src/Vitest.ts` | `helper` | `keep` | 已接近 shared test runtime 与 vitest bridge |
| `@logixjs/test` | `test/TestRuntime/**`, `test/Vitest/**` | `test` | `keep` | 可直接作为 control plane contract 回归面 |
| `@logixjs/devtools-react` | `src/internal/snapshot/**`, `src/internal/state/**` | `helper` | `keep` | 已是 shared snapshot/state 的消费层 |
| `@logixjs/devtools-react` | `test/internal/ProcessEvents.integration.test.tsx`, `test/internal/TimeTravel.test.tsx` | `test` | `keep` | 能继续承担 snapshot/process 观察面的回归基线 |

## Immediate Rule

- 优先保留 provider/store、worker/protocol、test runtime、snapshot/state 这些已成型切片
- 当前不以“重写 UI”作为默认路径
