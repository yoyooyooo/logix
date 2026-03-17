# 2026-03-19 · P1-6' owner-aware resolve engine（React controlplane 最小切口）

## 结论类型

- `accepted_with_evidence`
- `react-controlplane-minimal-cut`

## 目标

- 只围绕 owner-aware resolve engine 做最小切口，先收敛 owner/phase 主冲突。
- 优先保证：
  1. config-bearing layer 的首个 ready render 正确性
  2. 同一 owner/phase 的 async config resolve 去重
- 不继续追旧题目 `boot-epoch config singleflight`。

## 实施范围

仅修改：

- `packages/logix-react/src/internal/store/ModuleCache.ts`
- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- `packages/logix-react/src/internal/hooks/useModule.ts`
- `packages/logix-react/src/internal/hooks/useModuleRuntime.ts`

未触碰：

- `packages/logix-core/src/internal/runtime/core/**`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/src/internal/hooks/useProcesses.ts`
- `.codex/skills/logix-perf-evidence/assets/matrix.json`

## 关键改动

### 1) RuntimeProvider 引入 owner-aware config resolve token

- 新增 `owner + phase` 令牌（`runtime.base | runtime.layer-bound` × `boot | ready`）和 provider-local 单飞表。
- `layer` 存在且未 ready 时，不再提前执行 async config resolve，避免 neutral settle 路径造成重复 resolve。
- 有 `layer` 时，sync snapshot 只作为候选快照，`loaded` 会被 owner-aware async resolve 最终确认，避免首个 ready render 读到旧 config。
- async config trace 增补 `owner` 与 `phase` 字段，供后续 probe 复盘。

### 2) ModuleCache 统一 owner/phase 入口

- `ModuleCacheLoadOptions` 增加 `resolvePhase`。
- `read / readSync / warmSync / preload` 统一走 owner 校验与 owner-phase workloadKey 口径。
- entry 增加 `lastResolvePhase`，owner mismatch 报错带 phase 信息，减少定位歧义。

### 3) useModule / useModuleRuntime 透传 resolvePhase

- hooks 首次 resolve 记为 `boot`，首次 commit 后切到 `ready`。
- 将 `resolvePhase` 传入 ModuleCache，保持 controlplane 入口口径一致。

## 验证

### 最小验证命令

```bash
python3 fabfile.py probe_next_blocker --json
```

结果：

- `status: clear`
- `next_blocker: none`
- 证据落盘：`specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-6-owner-aware-resolve.probe-next-blocker.json`

### 贴边 React controlplane 验证

```bash
pnpm --filter @logixjs/react typecheck:test
pnpm --filter @logixjs/react exec vitest run test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks
```

结果：

- `typecheck:test` 通过
- `reactConfigRuntimeProvider.test.tsx`：`8 passed, 0 failed`
- 证据落盘：`specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-6-owner-aware-resolve.react-controlplane-validation.json`

## 收敛判断

- owner/phase 主冲突得到最小稳定收敛：不再依赖旧 singleflight 题目中的 boot 计数口径。
- 首个 ready render 的 config 正确性由 owner-aware async resolve gate 保底。
- probe 未引入新的 current blocker。
