# 2026-03-20 · React controlplane phase-machine Stage E（owner/phase × preload in-flight 协同）

## 结论类型

- `docs/perf`
- `stage-e implementation evidence`

## 目标与边界

本次只推进 Stage E 的下一层协同：

- 在不改 public API、不改 core runtime 禁区文件的前提下，把 preload lane 升级为 owner/phase token 级协同。
- 重点消除同一 token 在 rerender 期间被 cleanup 中断并重复 dispatch 的风险。
- 若收益不明确则回退 docs/evidence-only。本轮验证后收益明确，保留实现。

## 实施摘要

### RuntimeProvider 协同升级

在 `packages/logix-react/src/internal/provider/RuntimeProvider.tsx` 完成以下落地：

- 新增 preload token 级 in-flight 注册（`preloadResolveInFlightRef`）与完成集合（`preloadResolveCompletedRef`）。
- preload lane phase-machine 在 `run` 前追加协同裁决：
  - `defer-preload-reuse-inflight`
  - `defer-preload-token-completed`
- rerender cleanup 不再直接取消同 token in-flight；仅在 token 不一致或卸载时取消。
- preload `warmSync` 与 `preload` 调用统一携带当前 preload lane phase。

### 测试增量

`runtime-bootresolve-phase-trace` 增加 Stage E 用例：

- 构造 `defer + async preload` 且 in-flight 期间触发 rerender。
- 断言 preload lane `defer-preload-dispatch` 仅出现 1 次。
- 断言出现 `defer-preload-reuse-inflight` 协同原因码。

## 变更文件

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
- `docs/perf/2026-03-20-react-controlplane-phase-machine.md`
- `docs/perf/2026-03-19-identify-react-controlplane.md`
- `docs/perf/archive/2026-03/2026-03-20-react-controlplane-phase-machine-stage-e.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-e.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-e.probe-next-blocker.json`

## 最小验证

1. `pnpm --filter @logixjs/react typecheck:test`：passed
2. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks`：passed（`6 passed, 0 failed`）
3. `python3 fabfile.py probe_next_blocker --json`：passed（`status=clear`, `blocker=null`, `executed=3`）

## 证据判定

- 本轮协同收益成立：Stage E 用例把“同 token 重复 dispatch”收敛为单次 dispatch + 复用原因码，行为可解释且可回归。
- `probe_next_blocker` 存在一次阈值噪声阻塞重跑样本，本轮最终工件使用 `clear` 的最新结果落盘。
