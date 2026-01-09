# 3. 当前浏览器压测结果

为了建立一个可操作的数量级基线，我们在 `@logixjs/react` 包中添加了一条基线测试：

- 用例位置：`packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
- 场景：
  - 使用 `PerfModule`（state `{ value: number }`，action 只有 `inc`）；
  - 为同一条 `"inc"` Action，在单个 Logic 中挂载不同数量的 `$.onAction("inc").runFork($.state.update(...))` watcher；
  - 在真实浏览器环境（Vitest Browser Mode + Playwright Chromium + vitest-browser-react）中：
    - 渲染 `<PerfApp>`（内部通过 `useModule / useSelector / useDispatch` 使用该 Module）；
    - 对 Button 做一次 click，测量 `start = performance.now()` 到 DOM 中出现 `Value: watcherCount` 的时间；
    - 每个 watcher 数量档位重复多次取平均。

## 3.1 测试环境

- 测试栈：
  - Vitest v4 Browser Mode（`@vitest/browser-playwright`）；
  - Playwright Chromium，headless；
  - `vitest-browser-react` 用于在浏览器中挂载 React 组件。
- 场景设定：
  - 单次测量只做一次 click → 等待单个 State 更新；
  - handler 形态为轻量 `state.update`：
    - `$.state.update(prev => ({ ...prev, value: prev.value + 1 }))`；
    - 主要目的是为每条 watcher 引入一个“非空 handler”，便于放大 fan-out 成本。

## 3.2 实测数据（示意）

在当前开发机器上的一组样本（多次运行细节略有波动，数量级稳定）：

- watchers = 1：
  - 首次 run 有冷启动（JIT、Browser/Playwright/DebugSink 初始化等），平均约 **45ms**；
  - 后续样本多在 20–30ms 之间。
- watchers = 8 / 32 / 64 / 128：
  - 平均 click→paint 延迟基本在 **25–31ms** 区间；
  - 在人眼层面可以视为“无明显差异”。
- watchers = 256：
  - 平均约 **40ms**；
  - 单次点击仍然流畅，但已经能感受到轻微的钝感。
- watchers = 512：
  - 平均约 **60ms**；
  - 在连续点击/高频交互时，人眼很容易感到明显的滞后。

> 注意：上述数字不是硬性指标，只是给出一个代表性硬件上的量级。  
> 真实项目应根据目标运行环境（PC / 移动 / 嵌入式）复跑 `watcher-browser-perf.test.tsx`，以此作为调优参考。
