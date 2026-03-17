# 2026-03-19 · P2-3b process shared bus

## 范围

- 只推进 `process shared bus` 第二刀。
- 不触碰 selector index 本体，不修改 `SelectorGraph.ts` 与 `ModuleRuntime.dispatch.ts`。
- 代码落点：
  - `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`

## 改动摘要

在 `ProcessRuntime` 的 instance 启动路径里新增 shared bus 汇聚分支，并保留 legacy 对照开关：

1. 新增运行时开关 `LOGIX_PROCESS_SHARED_BUS`（默认开启，`0` 回退 legacy）。
2. non-platform 与 platform trigger source 统一经 shared queue 汇聚，再交给 `runProcessTriggerStream`。
3. shared bus 分支的 bridge fiber 异常会写入 `fatal`，保持 fail-stop 语义一致。
4. 启动就绪门扩展为：
   - 先等待 bridge fiber 进入 pull 状态
   - 再等待 runner fiber 进入 pull 状态
   - 最后 `markStreamReady`
5. legacy 分支继续使用 `Stream.mergeAll([platformEventStream, ...streams])`，用于 before/after 可比取证。

## targeted 证据

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-3b-process-bus.before.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-3b-process-bus.after.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p2-3b-process-bus.diff.json`

场景口径：

- scenario: `process.sharedBus.platformHot.targeted`
- sourceCount: `224`（大量常驻 non-platform source）
- platformEvents: `4000`（platform-hot）
- warmup: `3`
- iterations: `12`

结果（legacy -> shared bus）：

- p50: `17.2220ms -> 15.7457ms`（`-1.4764ms`, ratio `0.9143`）
- p95: `22.0695ms -> 17.2186ms`（`-4.8509ms`, ratio `0.7802`）
- mean: `17.5818ms -> 15.9722ms`（`-1.6096ms`, ratio `0.9085`）
- behavior: deliveredCount `4000 -> 4000`，行为量一致。

结论：在“platform 热路径 + 多 non-platform 常驻 source”这类负载下，shared bus 对 `mergeAll` 汇聚壳存在明确正收益。

## 最小验证

最贴边 process/shared-bus 回归命令：

```bash
pnpm --dir packages/logix-core test -- --run test/Process/Process.Trigger.ModuleAction.SharedStream.test.ts test/Process/Process.Trigger.ModuleStateChange.test.ts test/Process/Process.Diagnostics.Chain.test.ts
```

legacy 回退口径回归命令：

```bash
LOGIX_PROCESS_SHARED_BUS=0 pnpm --dir packages/logix-core test -- --run test/Process/Process.Trigger.ModuleAction.SharedStream.test.ts test/Process/Process.Trigger.ModuleStateChange.test.ts
```

probe 队列命令：

```bash
python3 fabfile.py probe_next_blocker --json
```

执行结果：

- 上述 process 测试通过。
- `probe_next_blocker` 返回 `status: clear`，当前 probe 队列未打红。

