# 2026-03-06 · S-6：browser perf collect stabilization

本刀目标不是继续优化 runtime，而是把 browser perf collect 的“fresh worktree / fresh cache 首轮噪声”收口到 test/browser 基础设施层。

## 问题定性

- `S-5` 已经说明：`react.strictSuspenseJitter` 的 `Failed to fetch dynamically imported module` 更像 browser 首轮预热噪声，而不是 live runtime bug。
- 真正需要处理的是 collect 入口前后的基础设施抖动：
  - Vite 首次 `optimizeDeps` 发现新依赖时触发 reload；
  - browser perf 图首次 transform 时产生瀑布式预热；
  - fresh worktree 下如果直接进 collect，更容易把这些启动成本误当成 suite 失败。

## 本轮改动

文件：`packages/logix-react/vitest.config.ts`

- 给 `@logixjs/react` 的 Vitest 配置增加 worktree-local `cacheDir`：
  - `.vitest-browser-cache`
  - 目的不是提速，而是让 browser collect / prewarm 的缓存落在当前 worktree，而不是共享 `node_modules/.vite`。
- 对 collect 默认会触达的 browser 范围，提前声明：
  - `optimizeDeps.entries`
  - `server.warmup.clientFiles`
- 预热范围只覆盖 collect 相关 suite：
  - `test/browser/browser-environment-smoke.test.tsx`
  - `test/browser/watcher-browser-perf.test.tsx`
  - `test/browser/perf-boundaries/**/*.test.ts(x)`

文件：`scripts/browser-perf-prewarm.ts`

- 新增显式预热入口：
  - 默认跑 `test/browser/browser-environment-smoke.test.tsx`
  - 复用 browser project + `--maxWorkers 1`
  - 默认带 `NODE_ENV=production` 与 `VITE_LOGIX_PERF_HARD_GATES=off`
- 目的：在 fresh worktree / fresh cache 下，先把 collect 相关依赖优化与 transform warmup 前移，再进入真正的 perf collect。

## 推荐用法

fresh worktree 首次 collect 前，先跑：

```bash
pnpm exec tsx scripts/browser-perf-prewarm.ts
```

然后再跑真实 collect，例如：

```bash
pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx --out /tmp/logix-react.react-strict-suspense-jitter.s6.json
```

如果想让预热更贴近目标，也可以直接把目标 browser test 传给预热脚本：

```bash
pnpm exec tsx scripts/browser-perf-prewarm.ts test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx
```

## 验证

在 fresh browser cache 条件下，实际执行：

```bash
pnpm exec oxlint packages/logix-react/vitest.config.ts scripts/browser-perf-prewarm.ts
node -e "const fs=require('node:fs'); fs.rmSync('packages/logix-react/.vitest-browser-cache',{recursive:true,force:true})"
pnpm exec tsx scripts/browser-perf-prewarm.ts
pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx --out /tmp/logix-react.react-strict-suspense-jitter.s6.json
```

结果：
- `oxlint` 通过，新增 TS 文件无语法错误；
- 预热入口在 fresh cache 下通过，默认 smoke suite 首轮运行成功；
- 随后的 targeted collect 可通过，并正常产出 `LOGIX_PERF_REPORT` 与 `/tmp/logix-react.react-strict-suspense-jitter.s6.json`；
- `react.strictSuspenseJitter` quick collect 全绿，`p95<=100ms` 阈值保持通过；
- 本刀未改 runtime core，也未改变 perf suite 的预算/阈值语义。

## 收口

- `S-6` 关闭为 browser collect 基础设施稳定化，不升级成 runtime 主线。
- 后续 broad/full collect 若再次在首轮挂住，优先先看：
  - 是否遗漏 prewarm；
  - 是否是新的 browser 依赖图变更；
  - 是否是 fresh worktree 环境缺少依赖安装。
- 只有在 clean/comparable 条件下稳定复现同一 suite 的真实行为回归，才重新升级到 runtime 方向。
