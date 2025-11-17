# Quickstart: 运行时可观测性加固

**Feature**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/plan.md`  
**Created**: 2025-12-23

本 quickstart 用于实现阶段的快速对齐与验收准备（不包含具体代码实现细节）。

## 1) 目标回顾（验收口径）

- 事务队列边界不再断链：同一触发链路的事件可稳定聚合，且继承调用点诊断作用域。
- Devtools 事件窗口在高频满载写入下保持可用：避免持续线性搬移导致的资源峰值。
- 长时间运行无泄漏：实例销毁后派生缓存可回收；外部订阅可可靠检测快照变化而不丢更新。

## 2) 实现后自测清单（建议顺序）

### A. 链路贯穿

- 在同一条链路内触发“入队事务 → 执行 → 事件产出”的闭环，验证：
  - 事件的链路标识一致（不出现“另起炉灶”的链路）
  - 运行时标签/诊断分档/局部输出通道对入队事务生效

### B. 事件窗口性能

- 在窗口未满与窗口已满两种状态下连续写入大量事件，验证：
  - 事件窗口始终有上界（Recording Window）
  - 满载写入不会出现持续的线性搬移开销（可通过基线对比验证）

### C. 缓存回收

- 反复创建/销毁大量实例，验证：
  - `latestStates/latestTraitSummaries` 的条目规模能随活跃实例收敛
  - 不随历史实例数线性增长

### D. 快照订阅契约

- 模拟一个外部订阅者仅依赖“变更令牌/版本号”判断是否需要刷新视图，验证：
  - 快照发生对外可见变化时，令牌一定变化
  - 令牌未变化时，快照对外可见字段保持不变（避免 tearing）
  - 订阅通知允许合并，但不得静默丢失更新
  - React 场景：`useSyncExternalStore` 推荐订阅 token（而不是快照引用），并在 token 变化后重读快照

## 3) 建议的质量门（实现阶段）

- 类型/静态：`pnpm typecheck`
- 代码规范：`pnpm lint`
- 单测：`pnpm -C packages/logix-core test`（必要时再跑 `pnpm test`）

## 4) 交付物检查

- `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/research.md`：关键决策已固化
- `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/data-model.md`：实体/键/转换清晰
- `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/contracts/devtools-snapshot.graphql`：快照订阅契约已表达

## 5) 性能基线（Phase 4 / NFR-001）

- 运行基线脚本（推荐开启 GC 以降低噪音）：
  - `NODE_OPTIONS=--expose-gc pnpm perf bench:027:devtools-txn`
- 产物（默认）：
  - `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/perf/after.worktree.r1.json`
- 指标解读（对齐 spec）：
  - `gate.sc002.p50Ratio5000Over500 <= 1.1`：对应 **SC-002**（窗口 500→5000，100k 写入总耗时增长 ≤ 10%）
  - `suites.txnQueue.*`：`enqueueTransaction` 入队→完成的总耗时分位（热路径基线）
  - `suites.cleanupCurve.*`：create/destroy + latest\* 回收路径的耗时与内存分位（对齐 **SC-003** 的规模模型）
