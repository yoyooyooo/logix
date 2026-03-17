# 2026-03-20 list rowid traversal plan cache 收口结论

## 结论

拒绝落地代码改动，仅保留证据落盘与否决记录。

## 否决原因

最小语义门未全绿。执行下面的最小验证命令时，`StateTrait.RowIdMatrix` 仍有 3 个用例失败，表现为资源快照状态停留在 `loading`，未达到预期的 `success`。

## 已落盘证据

- Vitest 失败日志
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-list-rowid-plan-cache.vitest.after-revert.log.txt`
- probe_next_blocker 输出
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-list-rowid-plan-cache.probe-next-blocker.json`
- 统一验证记录
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-20-list-rowid-plan-cache.validation.json`

## 最小验证命令

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.ListConfigsGuard.Perf.off.test.ts \
  test/internal/StateTrait/StateTrait.RowIdMatrix.test.ts \
  test/internal/StateTrait/StateTrait.NestedList.RowId.Stability.test.ts

python3 fabfile.py probe_next_blocker --json
```

## 下一步

先把 `StateTrait.RowIdMatrix` 的语义门恢复到全绿，再重新评估 `list rowid traversal plan cache` 是否值得进入实现与性能证据闭环。

