# 2026-03-06 · S-6：browser perf collect stabilization

本刀目标不是继续优化 runtime，而是判定 browser perf collect 的首轮不稳定是否需要保留一层 test/browser 基础设施补丁。

## 结论

- 不保留代码修复。
- `packages/logix-react/vitest.config.ts` 上试探性的 browser 预热补丁并没有稳定 collect，反而会把 fresh cache 首轮运行放大成新的导入失败。
- 在回到 `HEAD` 配置后，targeted browser perf collect 在 fresh cache 首轮可以直接通过，并正常产出 `LOGIX_PERF_REPORT`。
- 因此本刀按 docs/evidence-only 收口：问题定性为当前 worktree 上一次错误预热探针，而不是需要进入主线的稳定化代码改动。

## 证据

试探性配置探针包含：
- worktree-local `cacheDir`
- `optimizeDeps.entries`
- `server.warmup.clientFiles`
- 额外的 `scripts/browser-perf-prewarm.ts`

在 fresh browser cache 下，这组探针会直接触发新的预热期导入失败：
- `react/jsx-dev-runtime`
- `react`
- `mutative`

最终表现仍然落成 browser 端的：
- `TypeError: Failed to fetch dynamically imported module`

这说明该方案不是“稳定化”，而是把 collect 前置预热变成了新的不稳定源。

## 验证

坏方案验证：

```bash
node -e "const fs=require('node:fs'); for (const p of ['packages/logix-react/.vitest-browser-cache','packages/logix-react/node_modules/.vite']) fs.rmSync(p,{recursive:true,force:true})"
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx
```

结果：
- 在预热阶段报 `Failed to resolve import`；
- suite 最终以 `Failed to fetch dynamically imported module` 失败；
- 因此不保留这组配置改动。

真实 collect 复核：

```bash
node -e "const fs=require('node:fs'); for (const p of ['packages/logix-react/.vitest-browser-cache','packages/logix-react/node_modules/.vite']) fs.rmSync(p,{recursive:true,force:true})"
pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx --out /tmp/logix-react.s6.browser-collect.quick.json
```

结果：
- fresh cache 首轮直接通过；
- 成功写出 `/tmp/logix-react.s6.browser-collect.quick.json`；
- `react.strictSuspenseJitter` 的 quick collect 全绿，未依赖“第二次重跑才过”。

## 收口

- `S-6` 关闭为 evidence-only，不引入仓库级代码补丁。
- 后续若再次遇到 browser collect 首轮失败，先检查：
  - 是否是新的临时预热/optimizeDeps 试探；
  - 是否是当前 worktree 依赖安装不完整；
  - 是否能在回到基线配置后直接复跑通过。
- 只有当基线配置在 clean/comparable 条件下也稳定首轮失败，才值得重新开启一刀并保留代码修复。
