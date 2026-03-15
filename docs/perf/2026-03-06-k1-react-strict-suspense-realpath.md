# 2026-03-06 · K-1：`react.strictSuspenseJitter` 改成真实 state-level suspend 路径

本刀的目标不是继续捏内核常数，而是把 `react.strictSuspenseJitter` 从“测错对象的伪瓶颈”修正成真实的 React StrictMode + Suspense 交互边界。

旧版 suite 有两个根本问题：

- `mountCycles` 实际上只是连续点击次数，计时窗口覆盖了“从第 1 次点击到最后一次稳定”的总耗时，所以数值几乎线性随点击次数增长；
- `suspenseCycles` 虽然在 state 里切 `ready`，但组件根本没有因为 `ready=false` 进入 Suspense，导致这条 suite 名字里有 `Suspense`，实际上并没有测到真实 suspend/fallback 路径。

## 结论（已完成）

- 现在这条 suite 改成了 **现有 runtime 内的真实 state-level suspend 路径**：
  - `tick` 先把 `ready=false`；
  - 再等待 `suspenseCycles` 个 async step；
  - 最后把 `ready=true`；
  - `SuspenseChild` 在 `ready=false` 时抛出等待 `ready=true` 的 promise，真正进入 React Suspense fallback。
- 计时也改成 **单次 interaction→stable**：
  - 前 `mountCycles-1` 次只做预热；
  - 只测最后一次交互的开始到稳定。
- 结果：这条 suite 在真实 suspend 路径下重新落回预算内，`p95<=100ms` 对所有 `mountCycles(1/3/5) × suspenseCycles(0/1/3)` 全部通过。

## 改了什么

### 1) browser suite 语义重建

文件：`packages/logix-react/test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx`

- `tick` 的逻辑从“同步改 state”改成：
  - 先 `ready=false` + `value += 1`
  - 再异步等待 `suspenseCycles`
  - 最后 `ready=true`
- `SuspenseChild` 现在在 `ready=false` 时会抛出 `waitForReady(module)` promise；该 promise 通过 `requestAnimationFrame + module.getState` 轮询，在 `ready=true` 时 resolve。
- `mountCycles` 现在是“预热后第 N 次交互”的语义，不再是把 N 次点击的总耗时堆进一条样本。

### 2) matrix 明确记录新语义与校验证据

文件：`.codex/skills/logix-perf-evidence/assets/matrix.json`

- 为 `react.strictSuspenseJitter` 增加 `requiredEvidence`：
  - `react.suspenseFallbackRenders`
- `notes` 改成明确说明：
  - 这是 StrictMode + state-level suspend 的真实路径；
  - `mountCycles` 是预热后被计时的第 N 次交互；
  - `suspenseCycles` 是 tick 后额外的 async wait 次数；
  - 指标是单次 interaction→stable，而不是多次点击总耗时。

## 证据

### 旧报告（仅作“为何不可信”的反例，不可做 before/after diff）

- 参考：`specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw90.i1-state-writeback-batched.full-matrix.json`

旧值的特征非常明显：

- `mountCycles=1` 约 `p95 59~73ms`
- `mountCycles=3` 约 `p95 148~156ms`
- `mountCycles=5` 约 `p95 238~257ms`

这几乎就是“点击次数线性累加”，不是单次 suspense 抖动边界。

### 新报告（真实路径）

- After: `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw101.react-strict-suspense-realpath.targeted.json`

关键结果：

- `suspenseCycles=0`：`mountCycles=1/3/5` 的 `p95` 为 `60.6 / 50.1 / 58.5 ms`
- `suspenseCycles=1`：`mountCycles=1/3/5` 的 `p95` 为 `57.2 / 60.5 / 50.1 ms`
- `suspenseCycles=3`：`mountCycles=1/3/5` 的 `p95` 为 `70.2 / 60.4 / 55.8 ms`
- 全部都在 `p95<=100ms` 预算内。

同时 `react.suspenseFallbackRenders` 现在与 `suspenseCycles`/交互次数有可解释的关系：

- `suspenseCycles=0` 时为 `0`
- `suspenseCycles>0` 时，`mountCycles=1/3/5` 分别对应 `1/3/5`

这说明 suite 终于测到了真实 fallback，而不是空转 state 字段。

## 本刀裁决

- 旧版 `react.strictSuspenseJitter` 的失败不再视为“React 内核性能红线”。
- 当前这条边界已经从伪失败改成真实、可解释、可复测的通过态。
- 后续如果 React suspend 路径真的再退化，这条 suite 现在会给出可信的 fallback 证据，而不是继续输出线性点击总耗时。

## 回归验证

- `pnpm -C packages/logix-react typecheck:test`
- `pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw101.react-strict-suspense-realpath.targeted.json`

## 给后续 agent 的明确结论

- 不要再把旧 `react.strictSuspenseJitter` 的线性增长结果当成 React suspend 真实性能问题。
- 这条 suite 现在已经可以作为真实 React Strict/Suspense 交互边界来用。
- 下一刀若继续做“收益大的硬骨头”，应回到真正还在主线上产生压力的内核路径，而不是在这条已纠偏的伪瓶颈上继续浪费刀数。
