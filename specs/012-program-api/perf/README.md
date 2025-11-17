# Perf Baseline: 012 Process

本文件定义 `012-program-api` 的性能基线与判定口径，用于满足 **NFR-001 / NFR-002 / SC-005 / SC-006** 与宪章“性能与可诊断性优先”。

## 1) 需要测什么（热路径）

- **触发判定/调度热路径**：模块事件分发 → Process 触发判定 → 并发策略调度 →（可选）跨模块 dispatch
- **诊断开销分档**：`off` vs `light` vs `full`（同一场景下的时间/分配差异）

## 2) 场景（最小集）

- **S0（0 Process）**：未安装任何 Process 时的触发判定路径（应接近零成本，不引入额外全量扫描/分配）
- **S1（5 Process）**：安装少量 Process（例如 5 个）后，同一触发源高频触发的调度路径（对齐 `research.md` 的 Decision 8）

每个场景都必须覆盖 diagnostics：`off` / `light` / `full`。

## 3) 运行口径（可复现）

- 固定 Node.js 版本（Node 20+，建议写入报告元信息）
- 固定输入（同一 trigger 模式、同一 Process 数量、同一工作量）
- 每个组合重复运行 **30 次**，丢弃 warmup
- 至少记录两类指标：
  - 时间：`p50` / `p95`
  - 分配：至少一类可量化指标（如 bytes、次数或等价证据）

## 4) 判定口径（PASS / FAIL）

本特性 baseline 的最小口径（对齐 Decision 8）：

- **baseline（S1.legacy）**：安装少量“裸 processes”（不携带 Process meta；用 actions$ 订阅模拟旧写法的长期监听）
- **current（S1.off）**：安装少量 Process（默认 5 个）且 `diagnosticsLevel=off`

差异使用：

`deltaPct = (current.p95 - baseline.p95) / baseline.p95 * 100`

- **diagnostics=`off`（生产默认）**：
  - `p95 deltaPct ≤ 1%`（NFR-002 工程预算）
  - 且 `p95 deltaPct ≤ 5%`（SC-005）
- **diagnostics=`light/full`（诊断开启）**：
  - 必须给出相对 `off` 的额外开销证据（不要求固定阈值，但必须可解释）
- **SC-006（诊断关闭近零成本）**：
  - diagnostics=`off` 时不得产生/存储高频的 `process:trigger/process:dispatch` 事件（或等价证据显示接近 0），并在报告中给出可对比的证据字段。

## 5) 报告最小结构（建议）

报告必须包含（可为 JSON/Markdown，或脚本落盘产物的摘要）：

- 场景（S0/S1）与 Process 数量
- diagnostics 等级（off/light/full）
- `p50/p95` 时间与分配指标
- 与 baseline 的 `deltaPct`
- PASS/FAIL 总结（按本文件第 4 节）
