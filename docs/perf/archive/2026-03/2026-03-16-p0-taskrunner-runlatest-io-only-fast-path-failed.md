# 2026-03-16 · P0 TaskRunner `runLatest` io-only fast path 失败结论

## 这刀做了什么

尝试给 `TaskRunner` 增加一条更窄的 setup-time 快路径，只覆盖同时满足以下条件的场景：

- `mode === 'latest'`
- `config.pending` 为空
- `config.success` 为空
- `config.failure` 为空

试探内容：

- 把 invalid-usage 诊断描述、unhandled-failure 诊断描述、默认 origins 的准备前移到 setup 期
- 为 `runLatest` 的 io-only 任务单独走一条生命周期
- 这条生命周期跳过通用 `runTaskLifecycle(...)` 里的：
  - `defaultOrigins(...)` / origins 合并
  - `Effect.exit(io)` + success/failure 分流
  - `getCanWriteBack` 相关写回判断

当前代码已全部回退，不保留实现与临时 bench。

## 语义守门

临时语义守门覆盖过两类关键点：

- 现有 `TaskRunner.test.ts` 全量通过
- io-only `runLatestTask` 在旧任务被 latest 中断时，不产生 `task_runner::unhandled_failure`

由于最终不保留代码，这些临时测试已随实现一起回退。

## 贴边证据

使用临时 micro-bench 对比：

- `current`: 含本次 setup-time fast path 的实现
- `legacy`: 保留原通用 `runTaskLifecycle(...)` 壳的对照实现
- 场景：interrupt-heavy latest traffic
  - payload 序列前 `N-1` 个任务执行 `Effect.never`
  - 最后一个任务执行 `Effect.void`
  - 目标是放大 `runLatest` 下“旧任务频繁被中断”的壳税

### 默认规模（`payloadCount=128,512`）

一次复测结果：

- `128`
  - `legacy.p95=0.651ms`
  - `current.p95=0.543ms`
  - `p95.ratio=0.834`
- `512`
  - `legacy.p95=1.310ms`
  - `current.p95=1.390ms`
  - `p95.ratio=1.061`

结论：

- 小规模样本偶尔有正向
- `512` 这一档已出现明确回退

### 放大规模（连续两次复测，`payloadCount=1024,2048`）

复测 A：

- `1024`
  - `legacy.p95=2.583ms`
  - `current.p95=2.208ms`
  - `p95.ratio=0.855`
- `2048`
  - `legacy.p95=3.622ms`
  - `current.p95=4.261ms`
  - `p95.ratio=1.176`

复测 B：

- `1024`
  - `legacy.p95=2.703ms`
  - `current.p95=2.169ms`
  - `p95.ratio=0.803`
- `2048`
  - `legacy.p95=3.600ms`
  - `current.p95=4.168ms`
  - `p95.ratio=1.158`

结论：

- `1024` 有正向收益
- `2048` 连续两次都明显更慢
- 该切口没有形成稳定、单调的硬收益

## 裁决

- 不保留代码
- 只保留 docs/evidence-only
- 当前结果分类：`discarded_or_pending`

## 原因

- 这条 setup-time 快路径对部分 interrupt-heavy latest 样本有效
- 但收益只停留在局部规模
- 一旦 payload 继续放大，回退会反过来吞掉前面的局部收益

在没有新的、可稳定复现的贴边证据前，不建议把 `runLatest` io-only fast path 合入 `v4-perf`。
