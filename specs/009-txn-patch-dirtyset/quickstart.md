# Quickstart: 009 事务 IR + Patch/Dirty-set（心智与验收）

本 Quickstart 用来快速对齐三件事：

1. dirty-set / patch 分别解决什么问题；
2. 事务增量调度如何“只做必要工作”；
3. 平台/Devtools 如何只依赖 IR（Static IR + Dynamic Trace）完成解释与回放。

## 1) 你将获得什么（可见结果）

- 每次事务提交都会产生 `dirty-set`（最小触发集合），用来驱动增量调度。
- 诊断分档为 `off`/`light`/`full`：`off` 不记录 trace/patch；`light` 仅记录事务摘要（如 `patchCount`）；`full` 记录完整 Dynamic Trace + `patches[]`（按 `opSeq` 有序），用于解释/回放/合并/冲突检测。
- 对于无法精确定位写入的场景，系统会显式降级为 `dirtyAll=true`，并输出可解释原因（不会偷偷退化）。

## 2) dirty-set vs patch（最小记忆法）

- `dirty-set`：运行时的“调度输入”，必须便宜且永远可用（即使诊断关闭）。
- `patch`：诊断/证据/回放的“可选载荷”，full 模式更完整（含 `opSeq` 序列），light 模式可裁剪。

## 3) 一次事务的端到端解释链（你应该能回答）

对任意一次事务，你应该能回答：

- 触发源是什么（origin）？
- 这次写了哪些路径（dirty-set / patch）？
- 为什么只执行这些派生/校验/刷新步骤（依赖收敛）？
- 最终变更了什么（patch / snapshot 摘要）？

## 4) 平台/Devtools 的消费方式（IR-first）

- Static IR：描述依赖/写入/策略/冲突裁决（用于解析、合并与冲突检测）。
- Dynamic Trace：描述事务与步骤时间线（用于解释与回放）。

消费者（Devtools/Sandbox/平台）只应依赖 IR 与 trace，不应直接读取运行时内部实现细节。

## 5) best-effort cleanup：允许不中断，但不要吞错

清理/GC 等 best-effort 路径允许“不阻塞 UI/主流程”，但必须满足：

- interrupt 失败可忽略（预期取消）；
- 非 interrupt 失败在 dev/test 下必须可被诊断（至少能看到可读的失败原因）。

推荐写法（示意）：

```ts
import { Cause, Effect, Exit } from "effect"

const bestEffort = <A, E, R>(fx: Effect.Effect<A, E, R>) =>
  Effect.runPromiseExit(fx).then((exit) => {
    if (Exit.isFailure(exit) && !Cause.isInterrupted(exit.cause)) {
      console.debug(Cause.pretty(exit.cause))
    }
  })
```
