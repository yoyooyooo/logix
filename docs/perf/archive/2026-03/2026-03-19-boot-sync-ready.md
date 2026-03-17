# 2026-03-19 · boot config resolve sync-ready 路径按需化

## 结论类型

- `accepted_with_evidence`
- `react-controlplane-boot-sync-ready`

## 输入与边界

- 来源：
  - `docs/perf/archive/2026-03/2026-03-19-identify-boot-preload.md`
  - `docs/perf/archive/2026-03/2026-03-19-p1-6-owner-aware-resolve-v2.md`
  - `docs/perf/archive/2026-03/2026-03-19-p1-7-provider-singleflight.md`
- 只做 Top1：
  - `loadMode=sync` 且 sync snapshot 已可直接放行路径，改为按需触发 async confirm。
- 明确不做：
  - preload unresolved-only continuation（identify note 的 Top2）。

## 实施范围

已修改：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `docs/perf/archive/2026-03/2026-03-19-boot-sync-ready.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-boot-sync-ready.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-boot-sync-ready.probe-next-blocker.json`

未修改（保持原样）：

- `packages/logix-react/src/internal/store/ModuleCache.ts`
- `packages/logix-core/src/internal/runtime/core/**`
- `packages/logix-react/src/internal/hooks/useProcesses.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `.codex/skills/logix-perf-evidence/assets/matrix.json`

## 关键改动

在 `RuntimeProvider` 的 config resolve effect 增加显式触发门：

- 当 `loadMode !== sync` 时，维持 async load。
- 当 `bootConfigOwnerLocked=true` 时，维持 owner-aware config lane async load。
- 当 sync 已 over-budget 时，维持 async 收敛。
- 当 snapshot 来源是 `runtime`（运行时可变覆盖）时，维持 async refresh。

其余 `loadMode=sync` 且 `bootConfigOwnerLocked=false` 的 sync-ready 路径，不再默认再跑一次 async confirm。

## 验证与证据

执行命令：

```bash
pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx -t "emits provider gating and moduleTag resolve durations" --pool forks
pnpm --filter @logixjs/react exec vitest run test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks
python3 fabfile.py probe_next_blocker --json
```

结果摘要：

- `runtime-bootresolve-phase-trace` 目标用例：`1 passed, 1 skipped`。
- `reactConfigRuntimeProvider`：`9 passed, 0 failed`。
- `probe_next_blocker`：`status=clear`，`blocker=null`。

证据落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-boot-sync-ready.react-controlplane-validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-boot-sync-ready.probe-next-blocker.json`

## 收口判断

- Top1 已完成：sync-ready 路径从“默认 async confirm”切到“显式触发 async confirm”。
- 未引入新的 current probe blocker（最终 `clear`）。
- 未扩展到 preload continuation 题目。
