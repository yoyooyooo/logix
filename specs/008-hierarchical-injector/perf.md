# Perf: 008 层级 Injector（resolveModuleRuntime）

> 目标：为 008 的核心热路径改动提供“可复现的基线证据”，并在实现完成后补齐对比数据。  
> 运行脚本：`pnpm perf bench:008:resolve-module-runtime`

## 运行方式

- 默认：`pnpm perf bench:008:resolve-module-runtime`
- 调整迭代次数：`ITERS=20000 pnpm perf bench:008:resolve-module-runtime`
- 建议：同机同 Node 版本运行 3 次取中位数（微基准噪声较大）。

## 验收口径（008 的 perf gate）

- `$.use(ModuleTag) (hit)`：相对 “Before 基线” 回归不超过 15%（同机同 Node 版本、取中位数）。
- `$.use(ModuleTag) (no provider)`：语义从“看似能跑（fallback）”变为稳定失败（strict 默认），这里更偏正确性证据，不以性能为 gate。

## 变更前基线（Before）

- Date: 2025-12-15T17:23:53+08:00
- Commit/Branch: `008-hierarchical-injector`
- Command: `pnpm perf bench:008:resolve-module-runtime`

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
      "totalMs": 13.385625000000005,
      "nsPerOp": 669.2812500000002
    },
    "$.use(ModuleTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 26.01583400000004,
      "nsPerOp": 1300.791700000002
    },
    "$.use(ModuleTag) (no provider)": {
      "ok": true,
      "iterations": 2000,
      "totalMs": 2.752207999999996,
      "nsPerOp": 1376.103999999998
    }
  }
}
```

## 变更后对比（After）

- Date: 2025-12-15T21:00:16+08:00
- Command: `pnpm perf bench:008:resolve-module-runtime`

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
      "totalMs": 12.604082999999946,
      "nsPerOp": 630.2041499999973
    },
    "$.use(ModuleTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 27.640125000000012,
      "nsPerOp": 1382.0062500000006
    },
    "$.use(ModuleTag) (no provider)": {
      "ok": false,
      "error": "MissingModuleRuntimeError: [MissingModuleRuntimeError] Cannot resolve ModuleRuntime for ModuleTag.\n\ntokenId: PerfTarget\nentrypoint: logic.$.use\nmode: strict\nfrom: <unknown module id>\nstartScope: moduleId=<unknown>, instanceId=i1\n\nfix:\n- Provide the child implementation in the same scope (imports).\n  Example: ParentModule.implement({ imports: [PerfTarget.impl], ... })\n- If you intentionally want a root singleton, provide it at app root (Runtime.make(...,{ layer }) / root imports),\n  and use Root.resolve(ModuleTag) (instead of $.use) at the callsite.\n    at <anonymous> (/Users/yoyo/Documents/code/personal/intent-flow/packages/logix-core/src/internal/runtime/BoundApiRuntime.ts:378:19)"
    }
  }
}
```

关键差异：

- `$.use(ModuleTag) (no provider)`：由“看似能跑（全局 fallback）”变为稳定失败（strict 默认），符合 008 预期。
