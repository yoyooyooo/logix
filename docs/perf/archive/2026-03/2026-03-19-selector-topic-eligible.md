# 2026-03-19 · selectorTopicEligible 覆盖率提升

## 目标

在不改 public API 的前提下，提高 `selectorTopicEligible` 命中范围，减少 selector 回退到 module topic。

约束核对：

- 未改 `core selector graph` 主体。
- 未改 `process/**`。
- 未改 `provider/**`。
- 未改 matrix 相关文件。

## 实现

### 1) `useSelector` 放宽 topic eligible 判定

文件：`packages/logix-react/src/internal/hooks/useSelector.ts`

- 旧口径：`static lane + readsDigest 存在 + fallbackReason 为空`。
- 新口径：只排除 `unstableSelectorId`，其余 selector 允许走 readQuery topic。
- 对齐锚点：`packages/logix-core/src/ExternalStore.ts` 的稳定 selectorId 约束同样只拒绝 `unstableSelectorId`。

收益面：

- 稳定 `selectorId` 的 dynamic selector 不再默认回退 module topic。
- 提交后的 topic 通知更细粒度，减少 module topic 广播引发的无差别回调税。

### 2) 最小测试跟随

文件：`packages/logix-react/test/Hooks/useSelector.laneSubscription.test.tsx`

- 用例改为校验“static + stable dynamic selectorId”都走 readQuery topic。
- 新增 topic 订阅与 listener 计数断言：
  - `moduleTopicSubscribeCount === 0`
  - `staticTopicSubscribeCount === 1`
  - `dynamicTopicSubscribeCount === 1`
  - `bumpOther` 后 `static/dynamic topic listener` 都不触发
  - `inc` 后 `static/dynamic topic listener` 各触发一次

## 验证

1. `pnpm --dir packages/logix-react test -- --run test/Hooks/useSelector.laneSubscription.test.tsx test/Hooks/useSelector.sharedSubscription.test.tsx test/Hooks/useSelector.test.tsx`
2. `pnpm --dir packages/logix-core test -- --run test/ReadQuery/ReadQuery.buildGate.test.ts`
3. `pnpm --dir packages/logix-react typecheck`
4. `python3 fabfile.py probe_next_blocker --json`

结果：

- React 贴边 tests 通过（3 files / 6 tests）。
- ReadQueryBuildGate tests 通过（1 file / 2 tests）。
- `logix-react` typecheck 通过。
- `probe_next_blocker` 最终 `status=clear`。

证据落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-selector-topic-eligible.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-selector-topic-eligible.probe-next-blocker.json`

## 结论

`accepted_with_evidence`。`selectorTopicEligible` 覆盖率已提升，稳定 `selectorId` 的 dynamic selector 已从 module topic 回退链路收口到 readQuery topic。
