# Quickstart: O-006 Runtime Assembly Graph

## 目标

快速验证两件事：

1. 成功启动时可以拿到结构化 assembly 报告。
2. 启动失败时可以定位失败阶段与原因码。

## 前置

- Node.js 20+
- `pnpm install`

## 1) 运行定向测试

```bash
pnpm --filter @logixjs/core exec vitest run test/internal/Runtime/AppRuntime.AssemblyGraph.test.ts test/internal/Runtime/AppRuntime.BootFailure.test.ts
```

预期：

- `AppRuntime.AssemblyGraph.test.ts` 断言 `BootAssemblyReport.success=true` 且节点顺序稳定。
- `AppRuntime.BootFailure.test.ts` 断言 `BootAssemblyReport.success=false`，且 `failure.stageId/reasonCode` 与注入故障一致。

## 2) 运行现有 AppRuntime 回归

```bash
pnpm --filter @logixjs/core exec vitest run test/internal/Runtime/AppRuntime.test.ts
```

预期：

- 既有外部行为不变。
- 新增装配报告不影响既有 runtime 使用姿势。

## 3) 读取报告最小字段

启动报告应至少包含：

- `version`
- `appId`
- `success`
- `nodes[]`（`stageId/stageSeq/status`）
- `rootContextLifecycle`
- `failure`（失败场景）
