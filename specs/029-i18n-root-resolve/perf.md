# Perf: 029 国际化接入与 `$.root.resolve(Tag)`（性能基线与回归门槛）

> 目标：为 029 触及核心路径（Root 解析 / message token 归一化）提供“可复现的性能证据”。  
> 运行脚本：
>
> - `pnpm perf bench:029:i18n-root-resolve`
> - `pnpm perf bench:029:i18n-token`

## 运行方式

- 默认：
  - `pnpm perf bench:029:i18n-root-resolve`
  - `pnpm perf bench:029:i18n-token`
- 调整迭代次数：`ITERS=20000 pnpm perf bench:029:i18n-root-resolve`
- 建议：同机同 Node 版本运行 3 次取中位数（微基准噪声较大）。

## Hot Paths（必须覆盖）

- `Logix.Root.resolve(Tag)`：root/global 解析开销（diagnostics off 仍应接近零成本）。
- `$.root.resolve(Tag)`：语法糖开销（必须与 `Root.resolve` 等价，且无额外分配/扫描）。
- `I18n.token(key, options)`：token 构造 + canonicalize（key 排序、剔除 undefined、预算/序列化约束）。

## Budgets（默认门槛）

- `$.root.resolve(Tag)`：相对 `Root.resolve(Tag)` 的额外开销 ≤ 1%（同机同 Node 版本，取中位数）。
- `Root.resolve(Tag)`：相对 “Before 基线” 回归不超过 1%（同机同 Node 版本，取中位数）。
- `I18n.token(...)`：单次调用应为 O(k log k)（k=options key 数）；常见小 token（k≤8）不得出现可观测的线性额外分配爆炸。

## 环境元信息（本机）

- OS: macOS 15.6.1 (24G90)
- CPU: Apple M2 Max
- Memory: 64GB
- Node.js: v22.21.1
- pnpm: 9.15.9

---

## 变更前基线（Before）

> 说明：Before 阶段只要求固化“现状能跑的 baseline”；尚未实现的能力（例如 `$.root.resolve` / `@logix/i18n`）允许在 JSON 里以 `ok:false` 形式记录缺失（作为“变更前”事实）。

- Date: 2025-12-24T19:39:22+0800
- Branch/Commit: `dev` / `30070c6654eb7abb069616a82d77730bdcbac648`
- Command:
  - `pnpm perf bench:029:i18n-root-resolve`
  - `pnpm perf bench:029:i18n-token`

### 结果：root resolve

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
      "totalMs": 11.46004099999999,
      "nsPerOp": 573.0020499999995
    },
    "Root.resolve(ServiceTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 12.39108299999998,
      "nsPerOp": 619.554149999999
    },
    "Root.resolve(ModuleTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 10.761833999999965,
      "nsPerOp": 538.0916999999982
    },
    "$.root.resolve(ServiceTag) (hit)": {
      "ok": false,
      "error": "Error: [MissingApi] $.root.resolve is not implemented\n    at <anonymous> (/Users/yoyo/Documents/code/personal/intent-flow/scripts/perf/029-i18n-root-resolve.root-resolve-baseline.ts:105:13)"
    }
  }
}
```

### 结果：message token

```json
{
  "meta": {
    "node": "v22.21.1",
    "platform": "darwin/arm64",
    "iters": 20000
  },
  "results": {
    "baseline token (canonicalize)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 18.812833000000012,
      "nsPerOp": 940.6416500000006
    },
    "@logix/i18n token (canonicalize)": {
      "ok": false,
      "error": "Error: [MissingApi] @logix/i18n is not available\n    at <anonymous> (/Users/yoyo/Documents/code/personal/intent-flow/scripts/perf/029-i18n-root-resolve.message-token-baseline.ts:102:5)"
    }
  }
}
```

---

## US1 变更后（After US1：`$.root.resolve`）

- Date: 2025-12-24T20:48:41+0800
- Command: `pnpm perf bench:029:i18n-root-resolve`

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
      "totalMs": 11.92595799999998,
      "nsPerOp": 596.297899999999
    },
    "Root.resolve(ServiceTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 12.48475000000002,
      "nsPerOp": 624.237500000001
    },
    "Root.resolve(ModuleTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 10.772791999999981,
      "nsPerOp": 538.6395999999991
    },
    "$.root.resolve(ServiceTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 13.039667000000009,
      "nsPerOp": 651.9833500000004
    }
  }
}
```

---

## US2 变更后（After US2：message token / `@logix/i18n`）

- Date: 2025-12-24T22:23:57+0800
- Command: `pnpm perf bench:029:i18n-token`

### 结果

```json
{
  "meta": {
    "node": "v22.21.1",
    "platform": "darwin/arm64",
    "iters": 20000
  },
  "results": {
    "baseline token (canonicalize)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 19.875584000000003,
      "nsPerOp": 993.7792000000002
    },
    "@logix/i18n token (canonicalize)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 16.695334000000003,
      "nsPerOp": 834.7667000000001
    }
  }
}
```

---

## US3 变更后（After US3：ready 两档语义）

> 若 US3 未触及上述热路径，可仅补齐一次“全量复测”结果以证明未回归。

- Date: 2025-12-24T23:12:33+0800
- Command:
  - `pnpm perf bench:029:i18n-root-resolve`
  - `pnpm perf bench:029:i18n-token`

### 结果：root resolve

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
      "totalMs": 12.110709000000043,
      "nsPerOp": 605.5354500000021
    },
    "Root.resolve(ServiceTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 12.100708000000054,
      "nsPerOp": 605.0354000000027
    },
    "Root.resolve(ModuleTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 10.291875000000005,
      "nsPerOp": 514.5937500000002
    },
    "$.root.resolve(ServiceTag) (hit)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 13.353291000000013,
      "nsPerOp": 667.6645500000006
    }
  }
}
```

### 结果：message token

```json
{
  "meta": {
    "node": "v22.21.1",
    "platform": "darwin/arm64",
    "iters": 20000
  },
  "results": {
    "baseline token (canonicalize)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 21.575500000000034,
      "nsPerOp": 1078.7750000000017
    },
    "@logix/i18n token (canonicalize)": {
      "ok": true,
      "iterations": 20000,
      "totalMs": 19.06620799999996,
      "nsPerOp": 953.3103999999979
    }
  }
}
```
