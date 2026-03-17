# 2026-03-19 · P1-6 owner-aware resolve engine v2（收窄到 config-bearing gate）

## 结论类型

- `accepted_with_evidence`
- `react-controlplane-boundary-fix`

## 问题与目标

母线 `perf(p1-6): owner-aware resolve engine` 的 `bootConfigOwnerLocked = Boolean(layer)` 将首屏 gating 扩到全部带 `layer` 的 `RuntimeProvider`。

本次只做边界修正：

- 仅 `config-bearing` layer 启用 owner-aware async gate。
- 纯 Env layer 不进入 config 首屏 gating。
- 保留 config-bearing 路径的 owner-aware 令牌语义与测试证据闭环。

## 实施范围

已修改：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
- `docs/perf/archive/2026-03/2026-03-19-p1-6-owner-aware-resolve-v2.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-6-owner-aware-resolve-v2.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-6-owner-aware-resolve-v2.react-controlplane-validation.json`

未改动（保持禁区）：

- `packages/logix-core/src/internal/runtime/core/**`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/src/internal/hooks/useProcesses.ts`
- `.codex/skills/logix-perf-evidence/assets/matrix.json`

## 关键修正

### 1) boot gate 收窄

`RuntimeProvider` 新增 config 快照对比判定：

- `layer` 未 ready 前维持保守锁定。
- `layer` ready 后，比较 `baseRuntime` 与 `runtimeWithBindings` 的 `ReactRuntimeConfigSnapshot`。
- 只有快照确实变化时，`bootConfigOwnerLocked` 才保持 `true`。

结果：

- 纯 Env layer（不改变 React config 快照）不会再因为 config gate 卡首屏。
- config-bearing layer 仍会保持 owner-aware async gate。

### 2) owner 路径与 gate 绑定

async resolve token 选择改为：

- `config-bearing`：`runtime.layer-bound`
- 其他路径：`runtime.base`

纯 Env layer 不再占用 layer-bound owner 通道。

### 3) 首屏 ready 判定修正

增加 `layerConfigSyncGateReleased`：

- 当同步快照已拿到、无 over-budget，且 layer 已 ready 且判定为非 config-bearing 时，直接放行 `isConfigReady`。

避免“layer 已就绪但还等一次无意义 async config resolve”的额外 fallback。

## 验证与证据

### React 控制面最小验证

```bash
pnpm --filter @logixjs/react typecheck:test
pnpm --filter @logixjs/react exec vitest run test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks
pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks
pnpm --filter @logixjs/react exec vitest run test/integration/runtimeProviderTickServices.regression.test.tsx -t "should apply RuntimeProvider.layer overrides and still re-render immediately" --pool forks
```

结果：

- `typecheck:test` 通过。
- `reactConfigRuntimeProvider.test.tsx`：`9 passed, 0 failed`。
- `runtime-bootresolve-phase-trace.test.tsx`：`2 passed, 0 failed`。
- `runtimeProviderTickServices.regression` 目标用例：`1 passed, 6 skipped`。

证据落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-6-owner-aware-resolve-v2.react-controlplane-validation.json`

### probe 队列

```bash
python3 fabfile.py probe_next_blocker --json
```

最终落盘结果：`status: clear`，`blocker: null`。

证据落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-6-owner-aware-resolve-v2.probe-next-blocker.json`

## 收口判断

- 过宽 gating 已收窄回 config-bearing 路径。
- 纯 Env layer 不再被错误纳入 config 首屏 gate。
- owner-aware 目标仍成立（config-bearing 仍走 layer-bound owner）。
- current probe 队列保持绿色。
