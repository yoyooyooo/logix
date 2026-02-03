# Quickstart: IR Reflection Loader（IR 反射与试运行提取）

**Date**: 2025-12-24  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/025-ir-reflection-loader/spec.md`

> 本 quickstart 面向平台/CI/脚本作者：如何在“不读 AST”的前提下提取 Manifest/StaticIR，并通过受控试跑导出可序列化证据与 Environment IR。

## 0) 作为 024 的载体：inspect program module（推荐）

如果你已经在用 024 的 `Runtime.runProgram/openProgram` 跑一个 “program module”（例如 `AppRoot`），那么 025 的首个落地载体就是它：

- **CI/平台侧**：对 `AppRoot` 运行 “inspect” 流程，产出 `module-manifest.json` 与 `trial-run-report.json`（可 diff）。
- **本地开发**：先 inspect 再跑 `runProgram`，失败时能直接定位“缺失依赖/控制面覆写/traits 结构漂移”等原因。

下面示例都用 `AppRoot` 表示该 program module（同一个对象也会被传给 024 的 program runner）。

**推荐脚本（已提供）**

```bash
pnpm exec tsx scripts/ir/inspect-module.ts \
  --module ./path/to/app.root.ts \
  --export AppRoot \
  --runId run:commit-<sha>:app \
  --out dist/ir
```

输出：

- `dist/ir/module-manifest.json`
- `dist/ir/trial-run-report.json`

可复跑比对（determinism smoke）：

```bash
pnpm exec tsx scripts/ir/inspect-module.ts \
  --module ./path/to/app.root.ts \
  --export AppRoot \
  --runId run:commit-<sha>:app \
  --out dist/ir.next \
  --compareDir dist/ir
```

## 1) 导出 Manifest IR（结构摘要）

目标：对某个用户导出的 `Module`，导出 `ModuleManifest` JSON，供 Studio/CI/Agent 消费与 diff。

**示例（Node 脚本）**

```ts
import { Effect } from "effect"
import { writeFileSync } from "node:fs"
import * as Logix from "@logixjs/core"

import { AppRoot } from "./app.root.js"

const main = Effect.gen(function* () {
  // 025：extractManifest 将返回可序列化 JSON（不包含 Schema 对象/闭包）
  const manifest = Logix.Reflection.extractManifest(AppRoot, {
    includeStaticIr: true,
    budgets: { maxBytes: 200_000 },
  })

  writeFileSync("dist/app.manifest.json", JSON.stringify(manifest, null, 2))
})

Effect.runPromise(main)
```

**CI 用法（建议）**

- 每次 PR 产出 `*.manifest.json` 工件；
- 对比前后两份 manifest 的 `digest` 或结构 diff；
- 对 `schemaKeys/logicUnits/actionKeys/staticIr.digest` 等字段做 breaking change 检测。
- 优先用 `Reflection.diffManifest(before, after)` 产出 `module-manifest-diff.json`（schema：`specs/025-ir-reflection-loader/contracts/schemas/module-manifest-diff.schema.json`），作为 CI gate 与 POC/UI 的共享口径。

## 2) 导出 Static IR（声明式推导关系依赖图）

目标：把模块内的“派生/联动/校验”等声明式关系导出为可 diff 的依赖图（FR-010）。

- Canonical 形态复用 `StateTrait.exportStaticIr`（`version/moduleId/digest/nodes/edges`）。
- `extractManifest(..., { includeStaticIr: true })` 可直接内嵌导出；或者单独导出 `StaticIR`（按 contracts/api.md）。

## 3) 受控试运行（Trial Run）导出 Environment IR + 证据包

目标：在 **Build Env（可控副作用）** 中试跑一次模块装配/初始化阶段，导出：

- `EnvironmentIR`：观测到的 `tagIds/configKeys` + 可行动违规摘要（例如缺失服务）。
- `RuntimeServicesEvidence`：控制面证据（scope/bindings/overridesApplied）。
- `EvidencePackage`：可选事件序列 + summary（均为 JsonValue）。

### 3.1 推荐入口：`Observability.trialRunModule(...)`

```ts
import { Effect } from "effect"
import * as Logix from "@logixjs/core"
import { AppRoot } from "./app.root.js"

const main = Effect.gen(function* () {
  const report = yield* Logix.Observability.trialRunModule(AppRoot, {
    // CI 必须显式提供 runId（禁止依赖默认 Date.now）
    runId: "run:commit-<sha>:app",
    source: { host: "node", label: "ci-trial-run" },

    buildEnv: { config: { FEATURE_FLAG_X: true } },
    diagnosticsLevel: "light",
    maxEvents: 200,
    // 两段超时：试跑窗口 + 释放收束（语义复用 024）
    trialRunTimeoutMs: 3_000,
    closeScopeTimeout: 1_000,
    budgets: { maxBytes: 500_000 },
  })

  // Environment IR：依赖观测摘要（best-effort 观测集合 + 违规摘要）
  console.log(report.environment)

  // 控制面证据：解释“为什么选了某个 impl”
  console.log(report.environment?.runtimeServicesEvidence?.scope)
})

Effect.runPromise(main)
```

### 3.2 资源释放：为什么需要主进程显式关闭 Scope

- 模块里的 `$.onAction/...` 可能产生 **常驻监听**；主进程无法推断“何时可以安全退出”。
- Trial Run 的语义是：**主流程返回 → 关闭 Scope → 取消所有 fibers → 导出证据**。
- 因此，Trial Run 不承诺“自动跑完所有逻辑”；它只保证“在给定窗口内跑一次并可靠收束”。
- 受控窗口超时（`trialRunTimeoutMs`）与释放收束超时（`closeScopeTimeout`）需要区分归因（TrialRunTimeout vs DisposeTimeout）。

实现上会复用 `Observability.trialRun`（已存在）：

- 内部 `Scope.make()`；
- 运行 program；
- `Scope.close(scope, exit)` 强制释放资源；
- 导出 EvidencePackage。

## 4) 与控制面的关系（为什么说“内核提前支撑”与控制面有交集）

- 控制面覆写/来源/优先级的单一事实源是 `RuntimeServicesEvidence`（scope=builtin/runtime_default/runtime_module/provider/instance）。
- 025 的 Trial Run 输出直接复用该证据（summary.runtime.services），避免平台再造一套“覆写解释模型”。
- 平台如需解释“为什么某个策略生效”，应该消费 `RuntimeServicesEvidence.bindings/overridesApplied`。

## 5) 常见问题

### Q: 为什么不直接导出 schemas（JSON Schema）？

因为 025 优先交付 “keys + 确定性结构摘要”，而仓库内尚未沉淀稳定的 `effect/Schema -> JSON Schema` 转换器。后续可作为扩展点引入，但必须同时满足：确定性（排序/$ref 命名）+ 体积预算 + JsonValue 可序列化硬门。
