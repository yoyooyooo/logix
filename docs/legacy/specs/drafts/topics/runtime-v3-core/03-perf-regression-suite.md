---
title: Runtime v3 Core · 性能回归用例（高 ROI）
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - ../../../../../specs/014-browser-perf-boundaries/perf.md
  - ../runtime-observability/README.md
---

# 性能回归用例（高 ROI）

本节目标：把“性能/泄漏”从主观感受变成**可回归的门禁**，优先覆盖最容易退化、且最能暴露系统性问题的路径。

## 0. 总原则

- 核心路径的性能结论一律以 014 跑道为准：`specs/014-browser-perf-boundaries/perf.md`
- 不追求极其精确的数值；追求“可判定的退化/泄漏信号”。

## 1. 已有跑道（不要再分叉）

- browser perf boundaries：`packages/logix-react/test/browser/perf-boundaries/*`
  - converge runtime / steps
  - diagnostics overhead
  - strict+suspense jitter
  - form/list scope check 等

## 2. 还缺的高 ROI 回归集（建议新增）

### 2.1 watcher 压力：单模块高频 runFork/runParallel

目标：验证高频 action 下 Fiber/订阅不会线性泄漏，且吞吐/延迟不出现灾难性退化。

建议最小观测：

- `module:init` / `module:destroy` 成对
- `lifecycle:error` 不能静默丢失
- 在 N 次 dispatch 后，资源指标不继续增长（fiber/订阅上界；可先用 debug 计数器近似）

### 2.2 watcher 压力：多模块 + Link + imports(strict) + Root.resolve

目标：覆盖最容易出现“跨模块订阅/Scope 未关闭/错误归属不清”的链路。

要求：

- Link 抛错不会静默停止（至少有可观测错误事件）
- Scope 关闭后不会继续有事件流出

### 2.3 React：StrictMode + Suspense + ModuleCache GC

目标：覆盖 render abort / 重试 / mount/unmount 抖动下的资源正确回收与复用。

至少覆盖：

- `gcTime` 的保活语义（Unmount → wait < gcTime → Remount → 状态保留）
- pending 构建在未 commit 情况下不会形成僵尸 Entry
- key ownership 违规在 dev/test 必须 fail fast

## 3. 观测与采集建议（先用现有能力）

- Debug 事件：`Logix.Debug.makeRingBufferSink()` / `makeModuleRuntimeCounterSink()`（见 `packages/logix-core/src/Debug.ts`）
- Devtools evidence：只要是回归用例，就要求能导出 EvidencePackage（`packages/logix-core/src/Observability.ts`）
