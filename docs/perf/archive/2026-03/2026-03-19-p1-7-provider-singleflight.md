# 2026-03-19 · P1-7' Provider 单飞控制面显式化（neutral/config lane 分轨）

## 结论类型

- `accepted_with_evidence`
- `react-controlplane-singleflight-explicit-lanes`

## 目标

- 在已吸收 `P1-6 / P1-6 v2` 的 owner-aware 语义上，继续收敛 Provider 单飞控制面。
- 把 neutral lane 与 config lane 显式分轨，减少 neutral 路径的重复 config snapshot load / render churn。
- 保持 `owner conflict` 已收敛结论，不回到旧题目。

## 实施范围

已修改：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `docs/perf/archive/2026-03/2026-03-19-p1-7-provider-singleflight.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-7-provider-singleflight.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-7-provider-singleflight.probe-next-blocker.json`

未修改（禁区保持）：

- `packages/logix-core/src/internal/runtime/core/**`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/src/internal/hooks/useProcesses.ts`
- `.codex/skills/logix-perf-evidence/assets/matrix.json`

## 关键改动

### 1) Provider config resolve token 显式引入 lane 维度

`RuntimeProvider` 的 config resolve token 从：

- `owner + phase`

扩展到：

- `owner + lane + phase`

其中 lane 明确分为：

- `neutral`
- `config`

并在 `trace:react.runtime.config.snapshot(mode=async)` 里回写 `lane` 字段，便于后续 probe 直接区分控制面路径。

### 2) neutral lane 的 phase 规则改为“按 loadMode 受控”

neutral lane 不再无条件跟随 `providerReady` 进入第二个 phase。规则为：

- `loadMode=none/async`：neutral lane 固定 `boot` token，只允许一次 provider-local singleflight。
- `loadMode=sync`：保留一次 `ready` 刷新窗口，用于吸收 boot 后同一 provider 内的配置变更。

该规则把 R3 失败切口里的“neutral settle 触发重复 async config load”从控制面语义上切断，同时保留原有动态 config 刷新正确性。

### 3) config lane 继续沿用 owner-aware phase 语义

config-bearing 场景继续使用 `runtime.layer-bound` owner 与 `boot/ready` phase 语义，不把 owner-aware 收敛成果回退为旧单飞题目。

## 验证与证据

### React 控制面验证

```bash
pnpm --filter @logixjs/react typecheck:test
pnpm --filter @logixjs/react exec vitest run test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks
pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks
```

结果：

- `typecheck:test` 通过。
- `reactConfigRuntimeProvider.test.tsx`：`9 passed, 0 failed`。
- `runtime-bootresolve-phase-trace.test.tsx`：`2 passed, 0 failed`。

证据落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-7-provider-singleflight.react-controlplane-validation.json`

### probe 队列验证

```bash
python3 fabfile.py probe_next_blocker --json
```

结果：

- `status: clear`
- `blocker: null`

证据落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-7-provider-singleflight.probe-next-blocker.json`

## 收敛判断

- 单飞控制面已显式分轨，neutral lane 与 config lane 的 token 口径可直接区分。
- neutral lane 在 `none/async` 路径下不会再自动 replay 到 ready-phase，重复 async snapshot load 风险被约束。
- `loadMode=sync` 下保留一次 ready 刷新，动态 config 更新相关正确性用例保持通过。
- current probe blocker 未新增。
