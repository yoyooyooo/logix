# 2026-03-29 · non-React fanout fusion probe

## 目标

在 `selector_nonreact_plane_dedupe` 之后，继续确认剩余成本是否来自 same-target fanout 的写回壳。

本次只看更可融合的场景：

- 同一个 target 模块
- 同一个 source commit
- 多条 Module-as-Source link 同时命中

## 本次裁决

- route classification: `go_for_module_writeback_fusion_probe`
- 子结论：`same_target_module_as_source_commits_scale_linearly`

## probe 口径

文件：

- `packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Probe.test.ts`

场景：

- 一个 Source module，写 `value`
- 一个 Target module，拥有 `fanout = 1 / 8 / 32` 个 `externalStore.fromModule(Source, ReadValue)` trait field
- 单次 `sourceRt.dispatch(set=1)` 后，统计同一个 `targetRt` 的 `changesWithMeta` emission 次数

统计目标不是 `topicVersion`，而是 target 模块真实 commit 次数。

## 实测读数

```json
{
  "fanout1": 1,
  "fanout8": 8,
  "fanout32": 32
}
```

## 含义

这说明当前 Module-as-Source 在 same-target 多边场景里，没有任何 target-side 合并：

- 一条 link = 一次 target commit
- `1 / 8 / 32` 是严格线性关系

这比之前的跨模块 fanout 更有信息量，因为它直接指出了一个更可融合的切口：

- 不是跨模块天然 fanout
- 而是“同 target 模块的多次 writeback 壳”

## 当前判断

这条线值得继续做最小 PoC。

最小实现切口应优先落在：

- `packages/logix-core/src/internal/state-trait/external-store.ts`

原因：

- Module-as-Source 最终通过 `registerModuleAsSourceLink(... applyValue: writeValue ...)`
- `writeValue()` 当前在 `inTxn=false` 时每个 field 都单独 `runWithStateTransaction(...)`

## 暂未覆盖

- declarative-link same-target multi-dispatch

这条面当前先记为 pending。已有审查判断倾向它也值得 probe，但本次先不阻塞 module side 结论。

## 验证

命令：

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/node /Users/yoyo/Documents/code/personal/logix.worktrees/main.commit-packet-notify-probe/packages/logix-core/node_modules/vitest/vitest.mjs run packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Probe.test.ts
```

结果：

- `1 file, 1 test passed`
- `PERF_SAME_TARGET_MODULE_AS_SOURCE_COMMITS {"fanout1":1,"fanout8":8,"fanout32":32}`
