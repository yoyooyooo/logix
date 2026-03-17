# 2026-03-23 · P1-4F single pulse contract（implementation line）

## 目标与边界

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-4f-single-pulse-impl-20260323`
- branch：`agent/v4-perf-p1-4f-single-pulse-impl-20260323`
- 唯一目标：按 `docs/perf/2026-03-22-p1-4f-single-pulse-contract-freeze-v2.md` 落地 selector interest、readQuery activation 生命周期与单订阅路径。
- 写入范围：
  - `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
  - `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
  - `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
  - `packages/logix-core/test/internal/Runtime/**`
  - `packages/logix-react/test/internal/**`
  - `packages/logix-react/test/Hooks/**`
  - `specs/103-effect-v4-forward-cutover/perf/**`
- 禁区：
  - 不改 `packages/logix-react/src/internal/provider/**`
  - 不改 public API

## 本轮实现

1. `RuntimeStore` 新增 selector interest refCount 合同。
- `retainSelectorInterest(moduleInstanceKey, selectorId)`
- `hasSelectorInterest(moduleInstanceKey, selectorId)`

2. `TickScheduler.onSelectorChanged` 改为只读 selector interest。
- 不再用 `getReadQuerySubscriberCount` 判断 selector active

3. `RuntimeExternalStore` 的 readQuery store 首尾监听生命周期接入 selector interest。
- 首个 listener 进入时同时 retain `readQueryActivation + selectorInterest`
- 最后一个 listener 在 grace 后同时 release

4. 补齐 core/react 两侧最小专测。
- `TickScheduler.selectorInterest.contract`
- `RuntimeStore.selectorInterest.refcount`
- `RuntimeExternalStore.readQueryActivation.lifecycle`
- `useSelector.singlePulseSingleSubscription`

## 验证

以下工件已落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.validation.core-typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.validation.react-typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.validation.core-vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.validation.react-vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.probe-next-blocker.json`

验证结果：

1. `pnpm -C packages/logix-core typecheck:test`：通过
2. `pnpm -C packages/logix-core exec vitest run ...`：通过（4 files / 9 tests）
3. `pnpm -C packages/logix-react exec vitest run ...`：通过（6 files / 10 tests）
4. `python3 fabfile.py probe_next_blocker --json`：`status=clear`
5. `pnpm -C packages/logix-react typecheck:test`：失败

## 结果分类

- `accepted_with_evidence`

理由：

- `C1/C2/C3` 的核心行为门与 probe 已通过
- `packages/logix-core typecheck:test` 与 `packages/logix-react typecheck:test` 已全部通过
- freeze v2 指定的新增契约测试文件已补齐并执行
- `probe_next_blocker --json` 继续 `clear`

## 下一步

1. 回收到母线时，把 `docs/perf/README.md` 与 `docs/perf/07-optimization-backlog-and-routing.md` 中 `P1-4F` 的状态更新为 `accepted_with_evidence`。
2. 与 `P1-4F` 同冲突域的下一条核心结构线可继续切到 `N-3`。
