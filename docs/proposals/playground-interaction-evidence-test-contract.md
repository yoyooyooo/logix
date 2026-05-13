---
title: Playground Interaction Evidence Test Contract
status: consumed
owner: packages/logix-playground
target-candidates:
  - specs/166-playground-driver-scenario-surface/spec.md
  - specs/166-playground-driver-scenario-surface/ui-contract.md
  - specs/166-playground-driver-scenario-surface/notes/verification.md
  - docs/ssot/runtime/17-playground-product-workbench.md
consumed-into:
  - specs/166-playground-driver-scenario-surface/spec.md
  - specs/166-playground-driver-scenario-surface/ui-contract.md
  - specs/166-playground-driver-scenario-surface/notes/verification.md
  - packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx
  - packages/logix-playground/test/support/interactionEvidenceHarness.tsx
last-updated: 2026-04-29
---

# Playground Interaction Evidence Test Contract

## 消费状态

本提案已消费到 166 active spec、UI selector contract、verification notes 和 `packages/logix-playground` 交互证据矩阵测试。保留本文作为裁决来源记录，不再作为默认事实源。

## 目标

把 Playground 里所有“触发方式 + 诊断 + 日志 + 状态反馈”的测试覆盖收敛成一套终局合同。

本提案不扩大 Logix public API，不改变 Driver / Scenario 的产品边界，不把 Playground 私有测试 helper 升格为 Runtime truth source。

## 问题

当前测试覆盖按组件和功能逐步追加，已经能覆盖 action、driver、scenario、console、projection 的若干局部行为，但缺少一条可复用的证据合同：

- 同一业务触发可以从 reflected action、raw dispatch、curated driver、scenario step 进入，但测试没有统一断言它们最终落到相同 session evidence path。
- 日志、diagnostics、trace、projection 的断言分散，容易只测 UI 存在，不测证据归属。
- 触发入口和 session runner 的关系容易退化成“点击一次，history replay 暴露 N 条 dispatch log”这类问题。
- UI 测试查询仍有漂移，例如 `Diagnostics` 同时出现在 inspector tab 和 bottom tab，`Advanced Show` 入口已变化但测试仍按旧文案查询。
- 浏览器测试更多关注布局和压力，不足以证明 action / driver / scenario 触发链路的 evidence invariant。

## 当前证据

已发生的实际问题：

```text
[info] session op22: dispatch accepted increment
[info] runner: dispatch increment
...重复多条 runner: dispatch increment...
[info] session op22: dispatch completed increment
```

根因是 Program session 为了恢复状态会重放 action history，旧 wrapper 把被重放的每个 action 都合成 runner dispatch log。这个问题说明测试必须区分：

- replay for state reconstruction
- current operation evidence
- transport / runtime real logs
- product-level Driver / Scenario execution state

当前 `packages/logix-playground` 完整测试还暴露两个独立 UI 合同漂移：

- `test/host-command-output.contract.test.tsx` 用 `getByRole('button', { name: 'Diagnostics' })`，但当前界面存在 inspector `Diagnostics` 与 bottom `Diagnostics` 两个按钮。
- `test/raw-dispatch-advanced.contract.test.tsx` 查询 `Advanced Show`，但当前 raw dispatch 入口已经不在默认 State lane 可见路径。

## 设计原则

### P1 - 测 evidence path，不测单点组件幻觉

一次触发的验收必须至少覆盖：

- trigger receipt
- session op identity
- runner / runtime output
- Program state
- console log
- diagnostics 或 trace 中的 evidence projection
- stale / failure 分类，若该用例属于负向路径

### P2 - 所有触发入口归一到 Program session operation

终局测试默认把以下入口视为同一类 session operation consumer：

- reflected action button
- raw dispatch advanced
- curated driver
- scenario driver step

它们可以有不同 UI affordance，但落入当前 session 时必须共享这些不变量：

- `sessionId` 属于当前 ProjectSnapshot。
- `operationSeq` 单调递增。
- 当前 op 只有一条 synthetic runner dispatch log。
- state 来自当前 snapshot 的 runtime execution。
- stale completion 不得更新当前 state、logs、trace、diagnostics。

### P3 - Host command 与 business interaction 分层

`Run / Check / Trial / Reset` 是 host command。它们不等价于业务 dispatch：

- `Run` 写 Run Result。
- `Check` / `Trial` 写 Diagnostics。
- `Reset` 重启 session 并清空 session-derived evidence。
- 它们不得制造 action dispatch log。

### P4 - Diagnostics / Trace 是证据面，不是 UI 标签

测试不能只断言 tab 可点击。必须断言：

- Diagnostics detail 中出现 control-plane report 或 classified failure。
- Trace / Snapshot lane 中出现 authority bundle、evidence gap 或 debug-event-batch 分类。
- Driver / Scenario 只在执行后以 output evidence 进入 projection，声明本身不是 truth input。

### P5 - selectors 必须表达区域身份

不再用全局同名文本查询触发关键路径。测试查询优先使用：

- `data-playground-region`
- `data-playground-section`
- `data-playground-tab`
- region-scoped `within(...)`
- 语义角色 + 区域约束

## 推荐方案

### 方案 A：继续补零散组件测试

优点：

- 改动少。
- 速度快。

缺点：

- 不能阻止 action / driver / scenario evidence path 漂移。
- 新增入口会继续复制局部 fake runner。
- 很难覆盖 stale / superseded / replay / diagnostics 联动。

### 方案 B：建立 Interaction Evidence Matrix Harness

优点：

- 把触发入口、结果、日志、诊断、trace 统一成表驱动测试。
- 可以复用同一套 fake transport / runtime invoker 模拟 success、compile failure、runtime failure、stale completion、history replay。
- 未来新增 Driver example、Scenario step、service-source trigger 时只扩矩阵。
- 和 166 的 Logic-first runtime workbench 终局一致。

缺点：

- 需要先整理测试支撑文件。
- 会暴露当前 UI 选择器漂移，需要同步修测试合同。

采纳：方案 B。

## 终局合同矩阵

### Trigger Matrix

| trigger | owner | expected operation | default evidence |
| --- | --- | --- | --- |
| reflected action button | `ActionManifestPanel` / `PlaygroundShell` | session dispatch | state + console + snapshot |
| raw dispatch advanced | `RawDispatchPanel` | session dispatch | state + console + parse error |
| curated driver | `DriverPanel` / `driverRunner` | session dispatch | driverExecution + state + console + projection |
| scenario driver step | `scenarioRunner` | awaited session dispatch | scenario step result + state + console + scenario evidence |
| Run | `HostCommandBar` | host command | Run Result only |
| Check | `HostCommandBar` | host command | Diagnostics report |
| Trial | `HostCommandBar` | host command | Diagnostics report |
| Reset | `HostCommandBar` / session | session restart | lifecycle log + cleared action history |

### Result Matrix

| result | required assertions |
| --- | --- |
| success | state changed, op incremented, current synthetic dispatch log exactly once |
| payload parse failure | no runner call, no op increment, visible parse error |
| compile failure | classified failure, previous state preserved, diagnostics/console error |
| runtime failure | classified failure, previous state preserved, `dispatch failed` log |
| running disabled | click cannot enqueue another session dispatch |
| stale completion | old result cannot mutate current session |
| history replay | replay may affect state, replay dispatch logs cannot leak |

### Evidence Matrix

| evidence | invariant |
| --- | --- |
| console | session accepted/completed or failed logs carry opSeq |
| runner dispatch log | one synthetic dispatch log per current dispatch op |
| diagnostics | Check/Trial/failure detail is region-scoped |
| trace | debug-event-batch / evidence-gap visible in bottom trace/snapshot lanes |
| projection | Driver/Scenario execution output enters projection only after execution |
| sessionActions | reset/source edit clears old action history |

## 实现草图

### 新增测试支撑

新增 `packages/logix-playground/test/support/interactionEvidenceHarness.tsx`，负责：

- render `PlaygroundPage` with `ProgramSessionRunnerProvider` and optional runtime invoker override。
- expose scoped helpers:
  - `runAction(actionTag)`
  - `runDriver(label)`
  - `openInspectorTab(tab)`
  - `openBottomTab(tab)`
  - `consoleText()`
  - `programStateText()`
  - `diagnosticsText()`
  - `traceText()`
- provide fake runners:
  - `makeReplayLogRunner`
  - `makeFailingRunner`
  - `makeDeferredRunner`
  - `makeRecordingRunner`

支撑文件只服务测试，不进入 production bundle。

### 新增合同测试

新增 `packages/logix-playground/test/interaction-evidence-matrix.contract.test.tsx`，覆盖：

- reflected action 与 curated driver 共享同一 session output path。
- 连续 driver 点击三次只出现三条 runner dispatch log。
- mixed action history 不泄漏历史 synthetic dispatch log。
- raw dispatch parse failure 不调用 runner。
- scenario waits for dispatch settle before expect reads state。
- runtime failure preserves previous state and records classified failure。
- reset clears action history and old dispatch logs。

新增 `packages/logix-playground/test/host-command-evidence.contract.test.tsx` 或修复现有 `host-command-output.contract.test.tsx`：

- 用 bottom drawer scoped selector 点击 bottom `Diagnostics`。
- Check/Trial 写 Diagnostics，不写 action dispatch log。

修复 `packages/logix-playground/test/raw-dispatch-advanced.contract.test.tsx`：

- 先切到 inspector Actions tab。
- 用 region-scoped advanced control 或 stable `data-playground-section` 查询。

### 选择器修复

生产 UI 可增加测试稳定属性，不改变用户视觉：

- inspector tabs: `data-playground-inspector-tab="diagnostics"`
- bottom tabs already use `data-playground-tab="diagnostics"`
- raw dispatch toggle: `data-playground-control="raw-dispatch-toggle"`

如果现有语义区域足够，优先改测试，不新增属性。

## 非目标

- 不引入新 runtime API。
- 不把 Scenario `expect` 改成 `runtime.compare`。
- 不要求浏览器测试覆盖所有 failure path。
- 不把 raw dispatch 升成默认文档路径。
- 不为测试新增 production-only fake runner。

## 验收标准

- 相关合同测试覆盖 action、raw dispatch、driver、scenario、Run、Check、Trial、Reset 八类入口。
- 所有 session dispatch 入口都断言 state、console、opSeq、current runner dispatch log。
- 至少一个测试证明 mixed action history 只暴露当前 op synthetic dispatch log。
- 至少一个测试证明 stale completion 不更新当前 session evidence。
- `host-command-output.contract.test.tsx` 不再因同名 `Diagnostics` 失败。
- `raw-dispatch-advanced.contract.test.tsx` 不再依赖旧 `Advanced Show` 文案。
- `pnpm -C packages/logix-playground typecheck` 通过。
- `pnpm -C packages/logix-playground typecheck:test` 通过。
- `pnpm -C packages/logix-playground test` 至少不再因上述两个 UI 查询漂移失败；若仍有无关失败，必须写入 verification note 分类。

## 升格去向

若本提案被采纳：

- `specs/166-playground-driver-scenario-surface/spec.md` 增补“Interaction Evidence Matrix”小节。
- `specs/166-playground-driver-scenario-surface/ui-contract.md` 增补 selector scoping rule。
- `specs/166-playground-driver-scenario-surface/notes/verification.md` 记录矩阵测试命令和结果。
- 本 proposal 状态改为 `consumed` 并写明去向。
