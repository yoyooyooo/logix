# Inventory: Host Role Matrix

## Goal

把 `@logixjs/react`、`@logixjs/sandbox`、`@logixjs/test`、`@logixjs/devtools-react` 的唯一主职责、公开入口和 internal cluster 先固定下来。

## Matrix

| Package | Primary Role | Public Entries | Internal Clusters | Notes |
| --- | --- | --- | --- | --- |
| `@logixjs/react` | React host provider / hooks / platform bridge | `RuntimeProvider.ts`, `Hooks.ts`, `Platform.ts`, `ReactPlatform.ts` | `internal/provider`, `internal/hooks`, `internal/store`, `internal/platform` | 负责 React host 语义与无 tearing 保证 |
| `@logixjs/sandbox` | controlled trial surface / worker lab | `Client.ts`, `Protocol.ts`, `Service.ts`, `Vite.ts` | `internal/compiler`, `internal/kernel`, `internal/worker` | 负责 `runtime.trial` 邻接环境与实验场 |
| `@logixjs/test` | test runtime / assertions / Vitest bridge | `Execution.ts`, `Assertions.ts`, `TestProgram.ts`, `TestRuntime.ts`, `Vitest.ts` | `internal/api`, `internal/runtime`, `internal/utils` | 负责 shared verification harness |
| `@logixjs/devtools-react` | snapshot/state observer UI | `DevtoolsLayer.tsx`, `LogixDevtools.tsx`, `FieldGraphView.tsx` | `internal/snapshot`, `internal/state`, `internal/ui`, `internal/theme` | 只消费共享证据，不自产第二诊断真相源 |

## Topology Audit Notes

- `@logixjs/react` 当前已经自然分成 provider/hooks/store/platform 四簇
- `@logixjs/sandbox` 当前已经围绕 client/protocol/worker/compiler 组织，适合直接收紧到 trial surface
- `@logixjs/test` 当前公开面已经接近 `TestRuntime / TestProgram / Assertions / Vitest` 的稳定结构
- `@logixjs/devtools-react` 当前最关键的独立价值是 snapshot/state/process 观察 UI
