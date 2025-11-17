# 017 推荐默认值（profile=quick）

- 生成时间：2025-12-20T14:12:31.757Z
- Winner：`executionBudgetMs=200,decisionBudgetMs=0.5`
- 证据：`specs/014-browser-perf-boundaries/perf/tuning/sweep.017.executionBudgetMs=200,decisionBudgetMs=0.5.quick.json`

## 推荐配置（可复制）

```ts
stateTransaction: { traitConvergeMode: "auto", traitConvergeBudgetMs: 200, traitConvergeDecisionBudgetMs: 0.5 }
```

## 评分（commit.p95<=50ms @ convergeMode=auto）

- worstMaxLevel: 200
- sumMaxLevel: 5000

## 切片明细（winner）

| dirtyRootsRatio | maxLevel | p95@maxLevel (ms) |
|---:|---:|---:|
| 0.005 | 2000 | 5.200000002980232 |
| 0.05 | 2000 | 48.8999999910593 |
| 0.25 | 800 | 35.599999994039536 |
| 0.75 | 200 | 9.599999994039536 |

> 说明：这里的 maxLevel 来自 suite=converge.txnCommit 的 budget=commit.p95<=50ms；沿 primaryAxis=steps 扫描得到。

- 机器可解析汇总：`specs/014-browser-perf-boundaries/perf/tuning/recommendation.017.quick.json`
