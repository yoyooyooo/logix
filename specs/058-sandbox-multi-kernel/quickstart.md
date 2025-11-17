# Quickstart: Sandbox 多内核试跑与对照（core/core-ng）

**Date**: 2025-12-28  
**Feature**: [058-sandbox-multi-kernel](./plan.md)

## 目标

在同一 Host（浏览器 Playground / docs）里，对同一段可运行模块选择不同内核变体（例如 `core` 与 `core-ng`）进行试跑，并在结果中明确标识 `effectiveKernelId` 与 `KernelImplementationRef`，用于对照验证与排障。

## 使用方式（概念级）

1) Host 注册多个内核变体（`kernelId → kernelUrl`）；当存在多个变体时必须显式提供 `defaultKernelId`（用于默认选择与 fallback 目标）。  
2) 每次运行时指定 `requestedKernelId`（可选）与 strict/fallback 策略（默认 `strict=true`；fallback 仅在显式允许时启用，且目标固定为 `defaultKernelId`）。  
3) 运行结果必须可解释：包含 `requested/effective kernelId`、`fallbackReason`（若发生）、以及从 TrialRunReport 提取的 `kernelImplementationRef`（复用 045 契约）。

## 典型用法（面向 consumer）

- 教学页面（默认）：不暴露内核选择 UI，默认运行 `core`（单内核默认策略）。
- Debug 页面（按需）：允许选择 `core-ng` / `core` 做对照，并展示 `kernelImplementationRef`；对照场景 strict by default（不允许隐式 fallback）。

### 最小代码形态（伪代码）

```ts
import { createSandboxClient } from '@logix/sandbox'

const client = createSandboxClient({
  kernelRegistry: {
    kernels: [
      { kernelId: 'core', kernelUrl: '/sandbox/logix-core.js' },
      { kernelId: 'core-ng', kernelUrl: '/sandbox/logix-core-ng.js' },
    ],
    defaultKernelId: 'core',
  },
})

const { kernels, defaultKernelId } = client.listKernels()
// 展示 kernels/defaultKernelId（debug-only）

const result = await client.trialRunModule({
  moduleCode: 'export const AppRoot = {}',
  kernelId: 'core-ng',
  strict: true,
})

// 展示结果摘要（可解释、可序列化）
result.requestedKernelId
result.effectiveKernelId
result.fallbackReason
result.kernelImplementationRef
```

## 资产与挂载提示（Vite）

- 仓库内的 Vite 项目通常通过 `logixSandboxKernelPlugin()` 把 `@logix/sandbox/public/sandbox/*` 挂到 `/sandbox/*`。
- 当前默认只提供 `/sandbox/logix-core.js`；如需做 `core`/`core-ng` 的“不同 kernelUrl”真实对照，需要在同目录准备第二份 kernel bundle（例如 `/sandbox/logix-core-ng.js`）。在资产未就绪前，可先将不同 `kernelId` 暂时映射到同一个 `kernelUrl`，仅用于验证 UI/证据字段链路。

## 迁移说明（占位）

若本特性升级 `@logix/sandbox` 的配置/返回类型：

- 单内核用法应仍然可用（作为新设计的一等形态），但字段名/结构可能变化；
- consumer 不应解析内部对象图：只读取 RunResult/TrialRunReport 中的可序列化摘要字段；
- 对照结论以 `kernelImplementationRef` 为准，避免只看 `kernelId` 造成误判。
