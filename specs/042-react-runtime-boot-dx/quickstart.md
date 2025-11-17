# Quickstart: 避免 React 冷启动同步卡顿（策略与基线）

**Feature**: `042-react-runtime-boot-dx`  
**Created**: 2025-12-27  

本 quickstart 描述“目标用法与心智模型”；实现完成后应同步更新为最终 API 与示例落点。

## 1. 你需要记住的 5 个关键词（≤5）

- boot policy
- suspend
- yield
- key
- baseline

## 2. 默认优化阶梯（从轻到重）

1. **观测**：先启用诊断或基线用例，确认同步阻塞入口点（Provider / ModuleImpl / ModuleTag）。
2. **启用策略**：选择合适的启动/解析策略（sync vs suspend vs defer），并明确 fallback 行为。
3. **稳定 key / 分区**：对 suspend 模式提供稳定 `key`，并用 label/key 做分区，避免资源错绑。
4. **引入 yield**：当初始化存在同步重活时，使用 cooperative yield 让异步路径尽早 pending。
5. **固化 baseline**：将关键指标纳入 browser perf-boundaries，并设置阈值 gate。

## 2.1 关于 `sync / suspend / defer` 的直觉

- `sync`：render 期同步拿到结果（可能卡住主线程）
- `suspend`：render 期拿不到就挂起（throw Promise），由 Suspense fallback 接管
- `defer`：render 期不做冷启动重活，先用统一 `fallback` 承接就绪前 UI；在 commit 后完成“配置快照稳定 +（可选）关键模块预初始化”，ready 后再 mount 业务子树

实施阶段的承诺：交付 `sync | suspend | defer` 三条主路径；默认推荐 `suspend`，`defer` 用于“明确不接受同步阻塞、且愿意用统一 fallback 承接冷启动”的页面/路由布局。

重要说明（避免误解）：

- `defer` **只保证** `preload` 列表内模块在子树 mount 时就绪；未 preload 的模块仍按默认解析策略（suspend/sync）执行，可能触发二次 fallback（预期行为）。

### Troubleshooting：启用了 `defer` 依然卡顿？

- 先检查 `policy.preload`：本页/本路由“必用模块”是否都已预加载；否则子组件仍可能在首次 `useModule` 时触发二次 `suspend`（fallback 闪烁）或回退到 `sync`（同步阻塞）。
- 如果 dev/test guardrails 提示 “render 期 sync init / blocking”，优先：补齐 preload 列表，或显式切回 `suspend`，并配合 `yield` 策略定位同步重活入口点。

### 最简切换示例（sync ↔ suspend）

```tsx
// 默认（suspend）+ 统一 fallback
<RuntimeProvider runtime={runtime} fallback={<Loading />}>
  <App />
</RuntimeProvider>

// 显式切回 sync（确定性优先，适合测试/诊断）
<RuntimeProvider runtime={runtime} policy={{ mode: "sync", syncBudgetMs: 5 }} fallback={<Loading />}>
  <App />
</RuntimeProvider>

// 显式使用 defer（延后冷启动；可选 preload）
<RuntimeProvider runtime={runtime} policy={{ mode: "defer", preload: [CounterImpl] }} fallback={<Loading />}>
  <App />
</RuntimeProvider>
```

## 2.2 Provider “异步”对 `useModule` 的影响（必须注意）

`RuntimeProvider` 的配置快照变更会递增 `configVersion`，而 `useModule` 的 ModuleCache 会在版本变化时 dispose 并重建；因此如果 Provider 先用默认快照让子树 mount，随后异步更新快照，很可能导致模块实例被动重建与抖动。

推荐策略：

- 若选择 async：优先 gate 子树（显示 fallback）直到 cache-critical 快照就绪，再 mount 业务子树。
- 或者保证快照更新不会触发 cache 版本变化（把 cache-critical 字段冻结，或将快照更新与 cache 版本解耦）。

## 2.3 DX 统一约定：只用一个 `fallback`

对于业务侧，推荐只记住一条：**当你选择 Provider 级的 `suspend/defer`，以及 Provider 需要等待 layer/配置就绪时，都使用同一个 `RuntimeProvider.fallback`**。不要再额外在外面包一层“另一套 fallback”，避免心智分裂与组合爆炸。

## 2.4 `yield` 的副作用与如何调参

`yield` 的目标是把“同步重活”从渲染关键路径上挪开，但它可能带来一个副作用：原本同步可用的模块会短暂进入 pending（表现为 fallback 闪一下）。

建议：

- 默认优先使用 microtask 级别的 yield（例如 `Effect.yieldNow()`），并提供关闭/切换策略的入口。
- `onlyWhenOverBudgetMs` 的“首次”以 runtime/session 维度记忆，避免 dev remount/HMR 下反复 fallback 闪烁。
- 如果你更在意“绝不闪烁/确定性”，可以选择 `sync`（配预算与告警）或关闭 yield。
- 开发环境会提供超阈值同步阻塞告警（DX guardrails），帮助你定位到底是哪条链路需要切换策略。

## 2.5 DX Guardrails 告警长什么样

告警应包含：入口点、耗时、修复建议（可复制片段）、以及指向用户文档的指针（最终在 `apps/docs`）。

示例（仅示意）：

```text
[Logix][React] Render-phase sync blocking detected (12ms > 5ms)
  entrypoint=react.useModule
  ownerId=CounterModule
  key=...
  Fix: 建议切换到 policy.mode="suspend"（默认），并提供 RuntimeProvider.fallback；必要时启用 yield 策略。
  Docs: apps/docs/content/docs/guide/essentials/react-integration.md
```

## 3. 基线与回归（在哪里放）

- 回归测试（perf boundary）建议落点：`packages/logix-react/test/browser/perf-boundaries/`
- 证据化对比（PerfReport/PerfDiff）建议通过 `$logix-perf-evidence` 体系落盘到 `specs/042-react-runtime-boot-dx/perf/`（推荐 `after.worktree.json` 作为 worktree 对比样本）
- 本次证据与结论汇总：`specs/042-react-runtime-boot-dx/perf/README.md`

补充建议：

- perf 阈值优先用“相对基线/相对阈值”（relative budgets），避免把不同设备/浏览器的性能差异误判为回归。

### 最短闭环（建议）

占位符约定：

- `${GIT_SHA}`：基线代码对应的 commit（或自定义标识）
- `${ENV_ID}`：同机同配置标识（同机同浏览器版本/headless/profile 才可对比）

- 采集（after）：`pnpm perf collect -- --out specs/042-react-runtime-boot-dx/perf/after.worktree.json`
- 对比（diff）：`pnpm perf diff -- --before specs/042-react-runtime-boot-dx/perf/before.${GIT_SHA}.${ENV_ID}.json --after specs/042-react-runtime-boot-dx/perf/after.worktree.json --out specs/042-react-runtime-boot-dx/perf/diff.before.${GIT_SHA}.${ENV_ID}__after.worktree.json`
