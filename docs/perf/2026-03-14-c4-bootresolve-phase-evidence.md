# 2026-03-14 · C-4：`react.bootResolve.sync` phase evidence

## 目标

在连续否掉：

- `C-2 config reload skip`
- `C-3 readSync scope-make fastpath`

之后，给 `react.bootResolve.sync` 补一份可复用的 phase evidence，避免继续盲切 runtime。

本刀不追求提速，只做两件事：

1. 把关键 trace 补齐到可读：
   - `trace:react.provider.gating`
   - `trace:react.moduleTag.resolve.durationMs`
2. 新增 browser phase probe，直接输出：
   - `provider.gating`
   - `config snapshot`
   - `impl init`
   - `tag init`
   - `moduleTag resolve`

## 实现

文件：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/hooks/useModuleRuntime.ts`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx`

做法：

- `RuntimeProvider` 在 ready 后发 `trace:react.provider.gating`
  - 数据：`durationMs / policyMode / configLoadMode / syncOverBudget / syncDurationMs`
- `useModuleRuntime` 在 tag resolve 后发 `trace:react.moduleTag.resolve`
  - 新增：`durationMs / cacheMode`
- 两类 trace 都收紧到：
  - `currentDiagnosticsLevel !== 'off'`
  - 避免 phase probe 把主 perf suite 一起拉进 trace 路径

## 验证

### 1. 邻近 tests

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-react/node_modules/vitest/vitest.mjs run packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx packages/logix-react/test/RuntimeProvider/runtime-logix-chain.test.tsx packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx
```

结果：

- `Test Files  4 passed (4)`
- `Tests  13 passed (13)`

### 2. typecheck

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node packages/logix-react/node_modules/typescript/bin/tsc -p packages/logix-react/tsconfig.test.json --noEmit
pnpm typecheck
```

结果：

- `logix-react` 类型检查通过
- workspace `typecheck` 全部通过

### 3. browser phase probe

命令：

```sh
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx
```

结果摘要：

```json
[
  {
    "keyMode": "explicit",
    "yieldStrategy": "none",
    "providerGatingMs": 3.7,
    "configSnapshotSyncMs": 0.1,
    "implInitMs": 1.0,
    "tagInitMs": 0.0,
    "tagResolveMs": 0.0,
    "bootToImplReadyMs": 5.4,
    "bootToTagReadyMs": 5.4
  },
  {
    "keyMode": "auto",
    "yieldStrategy": "none",
    "providerGatingMs": 2.4,
    "configSnapshotSyncMs": 0.1,
    "implInitMs": 0.7,
    "tagInitMs": 0.0,
    "tagResolveMs": 0.0,
    "bootToImplReadyMs": 3.6,
    "bootToTagReadyMs": 3.6
  },
  {
    "keyMode": "explicit",
    "yieldStrategy": "microtask",
    "providerGatingMs": 2.3,
    "configSnapshotSyncMs": 0.1,
    "implInitMs": 0.7,
    "tagInitMs": 0.0,
    "tagResolveMs": 0.0,
    "bootToImplReadyMs": 3.5,
    "bootToTagReadyMs": 3.5
  },
  {
    "keyMode": "auto",
    "yieldStrategy": "microtask",
    "providerGatingMs": 2.3,
    "configSnapshotSyncMs": 0.0,
    "implInitMs": 0.7,
    "tagInitMs": 0.0,
    "tagResolveMs": 0.1,
    "bootToImplReadyMs": 3.3,
    "bootToTagReadyMs": 3.3
  }
]
```

读法：

- 在已捕获的 phase 里，`provider.gating` 是主段
- `config snapshot` 只有 `~0ms ~ 0.1ms`
- `moduleTag resolve` 只有 `~0ms ~ 0.1ms`
- `impl init` 约 `0.7ms ~ 1.0ms`

## browser perf acceptance

### quick

证据：

- `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-current.json`
- `specs/103-effect-v4-forward-cutover/perf/after.local.quick.bootresolve-phase-evidence.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-current__phase-evidence.r2.json`

结论：

- 本刀不以“提升 quick 数字”为目标
- 现有 quick diff 只能当 triage 口径，不拿它下“性能提升/回退”的硬结论
- 这刀的主要目标是补 phase evidence，不是优化

### soak

证据：

- `specs/103-effect-v4-forward-cutover/perf/after.local.soak.bootresolve-phase-evidence.r2.json`

结果：

- soak collect 成功
- 原 `react.bootResolve` suite 的预算继续通过
- 说明这把 evidence instrumentation 没把 suite 直接打坏

## 裁决

- 这刀保留为 evidence cut
- 不作为 runtime 提速刀统计
- 当前最可信的下一候选已收敛为：
  - `react.bootResolve.sync` 的 `provider.gating`

## 当前结论

`react.bootResolve.sync` 当前已明确排除：

- `config reload skip`
- `readSync scope-make fastpath`

当前最可信的主税点排序：

1. `provider.gating`
2. `impl init`
3. `config snapshot`
4. `moduleTag resolve`

下一轮若继续，只应围绕 `provider.gating` 开唯一下一刀。
