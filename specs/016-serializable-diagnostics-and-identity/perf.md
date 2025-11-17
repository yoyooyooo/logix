---
description: "Performance baseline and budgets for 016-serializable-diagnostics-and-identity (diagnostics overhead + JsonValue projection)"
---

# Perf: 016 可序列化诊断与稳定身份（性能基线与回归门槛）

> 本文是本特性的性能证据入口：用于记录“可复现测量方式 + 基线结果 + 回归阈值”，满足宪法对核心路径改动的要求。
> 运行脚本：`NODE_OPTIONS=--expose-gc pnpm perf bench:016:diagnostics-overhead`

## Hot Paths（必须覆盖）

- `Debug.record → DebugSink.toRuntimeDebugEventRef`：事件归一化、字段补全、（启用诊断时）meta 投影/裁剪
- `DevtoolsHub`：ring buffer 追加、snapshot 生成与订阅通知
- `JsonValue` 投影：循环引用/深度/宽度/字符串长度裁剪（必须在 off 档位不进入热路径）

## Method（可复现口径）

- 运行环境：Node.js 20+（记录 `node -v`）、同一台机器本地跑（避免 CI 噪音）
- 统计口径：对齐 009
  - 每组跑 30 次，丢弃前 5 次 warmup
  - 输出 p50/p95（ms）
  - 至少输出 1 类额外开销指标（例如：事件对象数/JSON 长度统计/GC 前后 heapUsed 差值）
- 输入矩阵（参数化）：
  - `diagnosticsLevel=off|light|full`
  - `instanceCount=1|4|16`
  - `txnCount=10_000|100_000`
  - `eventsPerTxn=1|3`

> 备注：本脚本直接驱动 `Debug.record` 生成高频事件，并按档位切换导出面：
> - `off`：无 sinks（`Debug.noopLayer`）
> - `light|full`：启用 `Debug.devtoolsHubLayer({ diagnosticsLevel })`（写入 `DevtoolsHub` ring buffer；`meta` 在 `toRuntimeDebugEventRef` 内按档位裁剪）

## Budgets（默认门槛）

- `off` 档位：相对同脚本的 `off` 基线，任何新增逻辑的 p95 开销必须可证明“接近零成本”
  - 默认门槛：p95 ≤ +5%
  - 禁止：递归 JsonValue 扫描、深拷贝 state/cause、额外 O(n) 遍历
- `light|full` 档位：
  - 单条导出事件 `meta` JSON 化后体积默认 ≤ 4KB（超限必须截断/省略并标记 `downgrade.reason=oversized`）
  - dropped/oversized 必须计数且可解释

## Baseline Results（必须在实现前填充）

> 填写格式建议：每行一个矩阵点，含 p50/p95 与关键统计。

## 环境元信息（本次基线）

- Date: 2025-12-19 01:46:24 +0800
- Git branch / commit: `dev` / `534dfd33408e18194be65e58c38d8daebb01369a`
- OS: macOS 15.6.1 (24G90)
- CPU: Apple M2 Max
- Memory: 64GB
- Node.js: v22.21.1
- pnpm: 9.15.9
- Notes: `NODE_OPTIONS=--expose-gc`；`RUNS=30`；`WARMUP_DISCARD=5`；`TXN_COUNT=10000`；`EVENTS_PER_TXN=1`；`INSTANCE_COUNT=1`；`BUFFER_SIZE=500`

| diagnosticsLevel | instanceCount | txnCount | eventsPerTxn | p50 (ms) | p95 (ms) | extra metrics | Notes |
|------------------|---------------|----------|--------------|----------|----------|--------------|-------|
| off | 1 | 10_000 | 1 | 70.808 | 85.109 | heapΔ(p50/p95)=184032B/259728B | baseline |
| light | 1 | 10_000 | 1 | 112.972 | 175.846 | heapΔ(p50/p95)=180776B/224728B | DevtoolsHub(light) |
| full | 1 | 10_000 | 1 | 116.370 | 176.015 | heapΔ(p50/p95)=12296B/51832B | DevtoolsHub(full) |
