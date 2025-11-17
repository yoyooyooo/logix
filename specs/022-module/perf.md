# Perf: 022 Module（$.use(Module) 拆壳开销）

> 目标：为 022 的 `$.use(...)` 热路径新增 “Module（定义对象）拆壳” 分支提供可复现的 Before/After 基线证据。  
> 运行脚本：`pnpm perf bench:useModule`

## 运行方式

- 默认：`pnpm perf bench:useModule`
- quick：`pnpm perf bench:useModule:quick`
- 调整迭代次数：`ITERS=20000 pnpm perf bench:useModule`
- 建议：同机同 Node 版本运行 3 次取中位数（微基准噪声较大）。

## 验收口径（022 的 perf gate）

- diagnostics off：`$.use(Module) (hit)` 相对 `$.use(ModuleTag) (hit)` 额外开销不超过 1%（同机同 Node 版本、取中位数）。
- `$.use(ModuleTag) (hit)`：相对 “Before 基线” 回归不超过 1%（同机同 Node 版本、取中位数）。

## 变更前基线（Before）

- Date: 2025-12-22T21:52:46+08:00
- Branch: `022-module`
- Command: `pnpm perf bench:useModule`
- Raw: `specs/022-module/perf/before.useModule.json`

### 结果

```json
{
  "meta": {
    "node": "v22.21.1",
    "platform": "darwin/arm64",
    "iters": 20000
  },
  "results": {
    "effect.serviceOption (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 12.751291999999921,
      "nsPerOp": 637.5645999999961
    },
    "$.use(ModuleTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 27.90741700000001,
      "nsPerOp": 1395.3708500000005
    },
    "$.use(Module) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 25.06174999999996,
      "nsPerOp": 1253.087499999998
    },
    "$.use(ModuleTag) (no provider)": {
      "ok": false,
      "error": "MissingModuleRuntimeError: [MissingModuleRuntimeError] Cannot resolve ModuleRuntime for ModuleTag.\\n\\ntokenId: PerfTarget\\nentrypoint: logic.$.use\\nmode: strict\\nfrom: <unknown module id>\\nstartScope: moduleId=<unknown>, instanceId=i1\\n\\nfix:\\n- Provide the child implementation in the same scope (imports).\\n  Example: ParentModule.implement({ imports: [PerfTarget.impl], ... })\\n- If you intentionally want a root singleton, provide it at app root (Runtime.make(...,{ layer }) / root imports),\\n  and use Root.resolve(ModuleTag) (instead of $.use) at the callsite.\\n    at <anonymous> (/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/BoundApiRuntime.ts:397:19)"
    },
    "$.use(Module) (no provider)": {
      "ok": false,
      "error": "MissingModuleRuntimeError: [MissingModuleRuntimeError] Cannot resolve ModuleRuntime for ModuleTag.\\n\\ntokenId: PerfTarget\\nentrypoint: logic.$.use\\nmode: strict\\nfrom: <unknown module id>\\nstartScope: moduleId=<unknown>, instanceId=i1\\n\\nfix:\\n- Provide the child implementation in the same scope (imports).\\n  Example: ParentModule.implement({ imports: [PerfTarget.impl], ... })\\n- If you intentionally want a root singleton, provide it at app root (Runtime.make(...,{ layer }) / root imports),\\n  and use Root.resolve(ModuleTag) (instead of $.use) at the callsite.\\n    at <anonymous> (/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/BoundApiRuntime.ts:397:19)"
    }
  }
}
```

## 变更后对比（After）

- Date: 2025-12-23T05:25:19+08:00
- Branch: `dev`
- Command: `pnpm perf bench:useModule`
- Raw: `specs/022-module/perf/after.useModule.json`

### 结果

```json
{
  "meta": {
    "node": "v22.21.1",
    "platform": "darwin/arm64",
    "iters": 20000
  },
  "results": {
    "effect.serviceOption (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 10.382791999999995,
      "nsPerOp": 519.1395999999997
    },
    "$.use(ModuleTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 25.850416999999993,
      "nsPerOp": 1292.5208499999997
    },
    "$.use(Module) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 25.17824999999999,
      "nsPerOp": 1258.9124999999997
    },
    "$.use(ModuleTag) (no provider)": {
      "ok": false,
      "error": "MissingModuleRuntimeError: [MissingModuleRuntimeError] Cannot resolve ModuleRuntime for ModuleTag.\n\ntokenId: PerfTarget\nentrypoint: logic.$.use\nmode: strict\nfrom: <unknown module id>\nstartScope: moduleId=<unknown>, instanceId=i1\n\nfix:\n- Provide the child implementation in the same scope (imports).\n  Example: ParentModule.implement({ imports: [PerfTarget.impl], ... })\n- If you intentionally want a root singleton, provide it at app root (Runtime.make(...,{ layer }) / root imports),\n  and use Root.resolve(ModuleTag) (instead of $.use) at the callsite.\n    at <anonymous> (/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/BoundApiRuntime.ts:522:19)"
    },
    "$.use(Module) (no provider)": {
      "ok": false,
      "error": "MissingModuleRuntimeError: [MissingModuleRuntimeError] Cannot resolve ModuleRuntime for ModuleTag.\n\ntokenId: PerfTarget\nentrypoint: logic.$.use\nmode: strict\nfrom: <unknown module id>\nstartScope: moduleId=<unknown>, instanceId=i1\n\nfix:\n- Provide the child implementation in the same scope (imports).\n  Example: ParentModule.implement({ imports: [PerfTarget.impl], ... })\n- If you intentionally want a root singleton, provide it at app root (Runtime.make(...,{ layer }) / root imports),\n  and use Root.resolve(ModuleTag) (instead of $.use) at the callsite.\n    at <anonymous> (/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/BoundApiRuntime.ts:522:19)"
    }
  }
}
```
