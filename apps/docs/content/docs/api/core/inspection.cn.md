---
title: 模块检查
description: 模块结构摘要（Manifest）与依赖预检（试运行）API。
---

当你想把一个 `Module` 当作“可交付资产”来长期演进时，除了直接运行它，通常还需要两类能力：

- **结构摘要（Manifest）**：把模块的 schema/actions/traits 等关键信息导出成可 diff 的 JSON，用于 CI 与审阅。
- **依赖预检（试运行）**：在受控窗口内启动一次模块装配，导出“缺失依赖/配置”等可行动信息，避免“脚本为什么不退出/为什么启动失败”只能靠猜。

## 导出 Manifest（结构摘要）

```ts
import { writeFileSync } from 'node:fs'
import * as Logix from '@logixjs/core'

import { AppRoot } from './app.root.js'

const manifest = Logix.Reflection.extractManifest(AppRoot, {
  includeStaticIr: true,
  budgets: { maxBytes: 200_000 },
})

writeFileSync('dist/module-manifest.json', JSON.stringify(manifest, null, 2))
```

`module-manifest.json` 中的 `servicePorts`（如存在）会列出模块声明的输入服务依赖：`{ port, serviceId, optional? }[]`（排序稳定，可用于 diff/门禁与解释）。

## 对比 Manifest（CI / Breaking 检测）

```ts
import * as Logix from '@logixjs/core'

const diff = Logix.Reflection.diffManifest(before, after, {
  // 可选：只关注允许变化的 meta keys，避免 CI 噪音
  metaAllowlist: ['owner', 'team'],
})

// diff.verdict: PASS | WARN | FAIL
```

## 受控试运行（依赖预检 + 证据摘要）

试运行会在一个**受控窗口**内启动模块，并在主流程结束后**关闭 Scope**收束资源，最终输出 `TrialRunReport`：

- 缺失服务/缺失配置（可行动）
- 控制面覆写证据（解释“为什么选了这个实现”）
- 可选事件序列（用于定位/回放；可裁剪）

```ts
import { Effect } from 'effect'
import * as Logix from '@logixjs/core'
import { AppRoot } from './app.root.js'

const main = Effect.gen(function* () {
  const report = yield* Logix.Observability.trialRunModule(AppRoot, {
    // CI/可复跑场景：请显式提供 runId，避免不可对比
    runId: 'run:commit-<sha>:app',
    buildEnv: { config: { FEATURE_FLAG_X: true } },

    diagnosticsLevel: 'light',
    maxEvents: 200,

    // 两段超时：试跑窗口 + 释放收束
    trialRunTimeoutMs: 3_000,
    closeScopeTimeout: 1_000,

    budgets: { maxBytes: 500_000 },
  })

  console.log(report.ok, report.error?.code)
  console.log(report.environment?.missingServices, report.environment?.missingConfigKeys)
})

Effect.runPromise(main)
```

若模块声明了 `services`，试运行报告的 `servicePortsAlignment`（如存在）会给出“声明端口 ↔ 环境可 resolve”的对齐结果（missingRequired/missingOptional），用于端口级定位缺失依赖。

## 为什么必须显式 `runId` / 关闭 `Scope`

- `runId` 用于把一次试运行的产物（报告/事件）稳定地标识出来，便于在 CI、不同机器、不同时间重复对比。
- 模块内部可能启动**常驻监听**或后台流程；主进程无法安全推断“什么时候可以退出”。因此运行入口必须在结束时**显式关闭 Scope**，让 finalizer 有机会执行，并在超时后给出可解释失败。

更完整的“运行/退出/释放”心智模型见：`Runtime` 文档页（`Core Concepts → Runtime`）。
