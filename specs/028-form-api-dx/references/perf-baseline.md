# 028 Form API · 性能基线（可复现记录）

> 本文件用于记录 `028-form-api-dx` 的关键交互热路径基线与对比口径。
> 模板先固定“记录结构”；具体数值在任务 `T042` 填充。

## 0) 目标与口径

- **覆盖交互**：`setValue`、`blur`、`array ops`（append/remove/swap/move）、`submit`。
- **测量脚本**：`pnpm perf bench:028:form-interactions`（输出 JSON）。
- **统计口径**：以 `p50/p95` 为主；包含 runs/warmup/环境信息，便于复现与交接。
- **回归门槛（对齐 plan.md）**：热路径 p95 不应超过当前基线的 +5%（诊断关闭）；分配/内存不超过 +10%（如可测）。

## 1) 环境信息（填写）

- Date: 2025-12-25T01:11:12+08:00
- Machine/CPU: Apple M2 Max
- OS: macOS 15.6.1 (24G90)
- Node: v22.21.1
- pnpm: 9.15.9
- Repo revision (git sha): 30070c6654eb7abb069616a82d77730bdcbac648

## 2) Before（填写）

> 在开始大规模重构/改动热路径之前运行一次脚本，记录为 Before。

### setValue

```text
runs=N/A
warmupDiscard=N/A
p50=N/A
p95=N/A
notes=未在大规模热路径重构前记录；当前仓库已进入拆分阶段（以 After 为现基线）。
```

### blur

```text
runs=N/A
warmupDiscard=N/A
p50=N/A
p95=N/A
notes=同上
```

### array ops

```text
append+remove: N/A
swap: N/A
move: N/A
notes=同上
```

### submit

```text
runs=N/A
warmupDiscard=N/A
p50=N/A
p95=N/A
notes=同上
```

## 3) After（填写）

> 完成本特性实现后再运行一次脚本，记录为 After，并明确与 Before 的差异。

### setValue

```text
runs=30
warmupDiscard=5
p50=0.954ms
p95=7.049ms
notes=ROWS=50
```

### blur

```text
runs=30
warmupDiscard=5
p50=0.570ms
p95=1.978ms
notes=ROWS=50
```

### array ops

```text
append+remove: p50=1.871ms p95=8.282ms
swap:          p50=0.649ms p95=3.028ms
move:          p50=0.509ms p95=1.103ms
notes=RUNS=30 WARMUP_DISCARD=5 ROWS=50
```

### submit

```text
runs=30
warmupDiscard=5
p50=1.516ms
p95=5.820ms
notes=ROWS=50
```

## 4) Diff（填写）

```text
setValue:  p95(before)=N/A  p95(after)=7.049ms  ratio=N/A  delta=N/A
blur:      p95(before)=N/A  p95(after)=1.978ms  ratio=N/A  delta=N/A
array ops: see above (Before=N/A)
submit:    p95(before)=N/A  p95(after)=5.820ms  ratio=N/A  delta=N/A
```
