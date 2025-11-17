# Contracts: Perf Evidence Suites (068)

**Spec**: `specs/068-watcher-pure-wins/spec.md`  
**Plan**: `specs/068-watcher-pure-wins/plan.md`

本文件定义本 spec 必须新增/复用的 perf suites（Node + Browser），用于满足 `NFR-001` 与 `SC-001~SC-005` 的“可复现、可对比、可判定”要求。

## Suite A (Node): Action fan-out / topic-index 对照

### Goal

- 验证 `$.onAction("tag")` 场景下，dispatch 延迟与吞吐主要随“相关 watcher 数”放大，而不是随“系统总 watcher 数”放大。
- 验证引入 topic-index 后，相关 tag 的 dispatch 不被无关 tag watcher 显著拖慢（在预算内）。

### Test shape (conceptual)

- 单模块实例：
  - 创建 N 个 `tag watcher`（分布在多个 tag 上，确保存在大量无关 watcher）
  - 创建 M 个 `predicate watcher`（代表必须订阅全量流的场景）
  - 高频 dispatch 某一个目标 tag 的 action
- 观测：
  - dispatch 侧：p50/p95 延迟、吞吐
  - publish 背压：publish 等待时间分布（若可观测）

### Pass/Fail

- before/after diff：`summary.regressions == 0`
- after 相对 before：在“无关 tag watcher 很多”的场景中，目标 tag 的关键指标出现可判定改善（SC-002）。

## Suite B (Browser): watcher 压力（onState/onAction 混合）

### Goal

- 验证在 React 环境下大量 watcher 不出现泄漏/灾难性退化（SC-001）。
- 验证 `onState` 的“声明依赖→增量通知”在无关字段提交时不触发 handler（SC-003）。

### Test shape (conceptual)

- React 挂载模块实例，启动：
  - 大量 `onAction("tag")` watcher（tag topic）
  - 大量 `onState(selector)` watcher（包含可静态推导 reads 的 selector）
- 驱动：
  - 高频 dispatch
  - 高频状态提交（包含“无关字段提交”的对照）
- 观测：
  - handler 触发次数（无关字段提交应为 0）
  - 资源计数（销毁后回落）

### Pass/Fail

- before/after diff：`summary.regressions == 0`
- `SC-003`/`SC-001` 的判定条件必须被自动化用例覆盖。

## Suite C (Node or Browser): 编译期优化 on/off 的可比对照（保守正确 + 回退可解释）

### Goal

- 覆盖 `SC-005`：同一套核心用例在“未启用编译期优化”与“启用编译期优化”下行为一致。
- 在可静态化子集中产出可判定收益；在不可静态化子集中稳定回退并输出原因锚点。

### Test shape (conceptual)

- 同一份测试场景，提供两组 selector/watchers：
  - `static lane`：可被证明静态化（依赖集合可判定）
  - `dynamic lane`：不可分析（必须走保守回退）
- 对照运行两次：
  - `compilationEnhancement=off`：基线（纯运行时）
  - `compilationEnhancement=on`：启用编译期优化（若可用则使用静态化产物，否则自动回退）
- 观测：
  - 行为一致性（handler 触发计数、最终状态、关键事件序列）
  - 性能指标（与 suite A/B 同口径）
  - 回退原因锚点是否出现且可序列化（仅在 dynamic lane 预期出现）

### Pass/Fail

- 行为一致性：两次运行的可观测行为一致（以用例断言为准）。
- 性能：`compilationEnhancement=on` 在 static lane 子集上出现可判定改善；dynamic lane 子集无回归。
- 解释性：dynamic lane 子集必须稳定产出回退原因锚点。

## Evidence output paths

- 所有证据落盘到：`specs/068-watcher-pure-wins/perf/*`
- 命名约定（示例）：
  - `before.node.watcher.fanout.<sha|local>.<envId>.default.json`
  - `after.node.watcher.fanout.<sha|local>.<envId>.default.json`
  - `diff.node.watcher.fanout.before...__after....json`
  - `before.browser.watcher.pressure.<sha|local>.<envId>.default.json`
  - `after.browser.watcher.pressure.<sha|local>.<envId>.default.json`
  - `diff.browser.watcher.pressure.before...__after....json`
  - `before.node.compilation-onoff.<sha|local>.<envId>.default.json`
  - `after.node.compilation-onoff.<sha|local>.<envId>.default.json`
  - `diff.node.compilation-onoff.before...__after....json`
