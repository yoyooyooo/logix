# 010 Form API · 性能基线（可复现记录）

> 本文件用于记录 `010-form-api-perf-boundaries` 的关键热路径基线与诊断分档开销口径。
> 模板先固定“记录结构”；具体数值在任务 `T029` / `T075` 填充。

## 0) 目标与口径

- **主门槛（SC-002）**：`Diagnostics Level=off` 下，动态列表（100 行）+ 跨行唯一性规则的关键用例 `p95 <= 50ms`。
- **诊断分档**：`off` 不产出 `trait:*` trace；`light|full` 产出 Slim 且可序列化事件，并单独记录其 overhead（不与 `SC-002` 门槛混用口径）。
- **证据优先**：能引用现有 evidence 文件就不重复造跑道（014/016/009 等为主事实源）。

## 1) 环境信息（填写）

- Date: 2025-12-20T23:57:29+08:00
- Machine/CPU: Apple M2 Max
- OS: Darwin 24.6.0 (arm64)
- Node: v22.21.1
- pnpm: 9.15.9
- Repo revision (git sha): 534dfd33408e18194be65e58c38d8daebb01369a

## 2) US1 关键用例基线（Diagnostics=off）

- Test（添加于 T029）：`packages/logix-core/test/StateTrait.ListScopeCheck.Perf.off.test.ts`
- Scenario：动态列表 100 行；制造重复 → 解除重复；跨行唯一性一次扫描，多行写回；错误即时一致。

记录（填写）：

```text
rows=100
diagnostics=off
p50=0.43ms
p95=1.12ms
allocs(optional)=
notes=StateTrait.ListScopeCheck.Perf.off.test.ts (iters=30,warmup=5)
```

## 3) “off/light/sampled/full” 开销对齐（填写）

> T075：引用 014 的 browser perf evidence，并说明 gate 环境与口径差异。

- 014 interpretation：`specs/014-browser-perf-boundaries/perf/interpretation.latest.md`
- 016 micro-benchmark：`specs/016-serializable-diagnostics-and-identity/perf/after.worktree.r1.json`
- 014 evidence（default）：`specs/014-browser-perf-boundaries/perf/after.worktree.default.perf-boundaries.r2.json`

备注：

- `form.listScopeCheck` suite 在 014 中是新增点位，`before.*` 报告不包含该 suite；当前以 `after.worktree.*` 作为后续回归的基线入口。

记录（填写）：

```text
off:  (p50=56.9ms, p95=62.0ms)
light:(p50=53.7ms, p95=57.3ms)
full: (p50=50.7ms, p95=55.0ms)
notes=014 的 `diagnostics.overhead.e2e`（scenario=watchers.clickToPaint）属于 e2e 口径，噪声较大；稳定的“诊断档位成本上界”以 016 micro-benchmark 为准。runtime 类硬门（如 `auto<=full*1.05`）统一在 diagnostics=off 环境下判定。
```
