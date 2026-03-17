# 2026-03-19 · P1-6' React controlplane owner/phase 边界重建（最小可证伪切口）

## 结论

- `accepted_with_evidence`
- 本次切口满足成功门：首屏 ready 正确性与 async config dedupe 同时成立。
- `probe_next_blocker` 结果为 `clear`，无新增 blocker 与 threshold anomaly。

## 切口定义

- 目标：围绕 `RuntimeProvider` 的 owner/phase 边界重建最小控制面，统一两条路径。
- 路径 A：config-bearing provider layer，要求首个 ready render 读取 layer 配置，owner 应归入 `runtime.layer-bound@boot`。
- 路径 B：env-only provider layer，ready 可由 sync gate 放行，同时保留一次 `runtime.base@ready` 的异步确认并去重。
- 显式不做：`boot-epoch config singleflight` 旧切口复刻、`R3 neutral-config singleflight` 旧形态回归、owner conflict 条件分支堆叠。

## 实现变更

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
  - `shouldRunAsyncConfigConfirm` 新增 `!configState.loaded` 条件。
  - 结果：当 layer 首次就绪后若还处于 sync gate 放行态，仍会触发一次 async snapshot confirm；token 机制继续负责 dedupe。
- `packages/logix-react/test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx`
  - env-only layer 用例新增断言：`runtime.base@ready` 的 async snapshot 数量固定为 `1`，且不出现 `runtime.layer-bound`。
- `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
  - config-bearing layer 用例新增断言：
    - 首次 ready render 直接读取 `gcTime=1800`
    - `runtime.layer-bound@boot` async snapshot 数量固定为 `1`

## 最小验证

1. `pnpm --filter @logixjs/react typecheck:test` ✅
2. `pnpm --filter @logixjs/react exec vitest run test/internal/integration/reactConfigRuntimeProvider.test.tsx --pool forks` ✅
3. `pnpm --filter @logixjs/react exec vitest run test/RuntimeProvider/runtime-bootresolve-phase-trace.test.tsx --pool forks` ✅
4. `python3 fabfile.py probe_next_blocker --json` ✅（`status=clear`）

## 证据落点

- React provider 验证：`specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-6-owner-phase-rebuild.react-controlplane-validation.json`
- blocker 探针结果：`specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-6-owner-phase-rebuild.probe-next-blocker.json`

## 失败门复核

- 本次最小切口在现有 API/状态机下可收口，当前无需扩大到更大规模重排。
