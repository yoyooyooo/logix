# 2026-03-30 · latest main quick identify reading

## 目标

在 `main@b4bc9e1d` 上补一份 latest-main 的 cheap-local 起始盘面，回答三件事：

1. `#146/#148` merged 后，current-head 是否需要重开 browser blocker 路线
2. 已 merged 的 same-target fanout 收益是否在 HEAD 上继续保持
3. 下一轮真正值得开的 cheap-local probe 更像哪一层

## current-head carry-forward

- compare window:
  - `65f8a3fa..b4bc9e1d`
- code drift:
  - 这个区间里没有新的 `packages/**` runtime 变更
  - 只新增了 `docs/spec/workflow` 资产

因此：

- `#146` 与 `#148` 的 merged-mainline runtime 结论可以直接 carry-forward 到当前 HEAD
- 这轮 latest-main identify 不需要先补 focused/heavier，先做 cheap-local 即可

## cheap-local package

### 1. browser blocker probe

命令：

```sh
python3 fabfile.py probe_next_blocker --json
```

结果：

- `status = clear`
- `externalStore.ingest.tickNotify` passed
- `runtimeStore.noTearing.tickNotify` passed
- `form.listScopeCheck` passed

结论：

- current-head 没有新的默认 browser blocker
- 这轮不该回到 browser blocker 路线

### 2. merged fanout lines smoke

命令：

```sh
pnpm exec vitest run \
  packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetDispatchBatchFusion.test.ts \
  packages/logix-core/test/internal/Runtime/DeclarativeLinkRuntime.sameTargetFanoutFusion.Probe.test.ts
```

结果：

```json
{
  "moduleAsSource": { "fanout1": 1, "fanout8": 1, "fanout32": 1 },
  "declarativeDispatch": { "fanout1": 1, "fanout8": 1, "fanout32": 1 }
}
```

结论：

- `#146` 与 `#148` 的 same-target fanout 收益在 HEAD 上继续保持
- 这两条已 merged 的 fanout 壳不应重开为默认下一刀

### 3. node dispatch-shell micro baseline

命令：

```sh
pnpm exec vitest run \
  packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

读数：

```txt
dispatch.p50=0.146ms
dispatch.p95=0.563ms
txnPrelude.avg=0.006ms
queueContext.avg=0.006ms
queueResolve.avg=0.005ms
bodyShell.avg=0.037ms
asyncEscape.avg=0.036ms
commit.avg=0.035ms
dispatchRecord.avg=0.005ms
dispatchCommitHub.avg=0.002ms
residual.avg=0.123ms
```

结论：

- 当前 residual 仍明显大于 `txnPrelude / queueContext / queueResolve / bodyShell / asyncEscape / commit` 这些已量化相位
- 当前证据更像：
  - `public dispatch` 外层组合壳
  - `enqueueTransaction(...)` 返回前后的 outer await / interpreter cost
  - queue finalizer / release 之后的公共壳

### 4. outer dispatch-shell split probe

命令：

```sh
pnpm exec vitest run \
  packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchOuterShell.Probe.test.ts
```

读数：

```txt
dispatch.p50=0.081ms
dispatch.p95=0.173ms
queuedSetState.p50=0.054ms
queuedSetState.p95=0.093ms
directTxnSetState.p50=0.051ms
directTxnSetState.p95=0.081ms
dispatchMinusQueued.avg=0.039ms
queuedMinusDirect.avg=0.008ms
```

结论：

- `public dispatch` 相对 `public setState` 仍有清晰固定税
- `public setState` 相对 `direct txn setState` 只有很薄的一层附加成本
- 当前 cheap-local 更像把主税点收窄到了 `dispatch` 专属入口壳，而不是整条 `txnQueue` 公共壳

## route classification

### 已关闭并继续保持关闭

- `compiled_txn_boundary`
  - 继续维持 `no_go`
  - 当前 cheap-local 没有新证据把主税点重新推回 inner txn body
- `commit_packet_notify_fusion`
  - 继续维持 `no_go_under_zero_selector_packet_gate`
  - browser blocker probe 已 `clear`

### 已 merged 并继续保持稳定

- `postmerge-nonreact-fanout-writeback-fusion`
- `postmerge-declarative-dispatch-shell`

两条 merged-mainline cut 在 HEAD 上都继续保持 `1 / 1 / 1` 的 same-target commit 行为。

### 仍可保留，但不是唯一下一刀

- `selector_snapshot_mirror_plane`
  - 继续只保留为 `provisional` 输入
  - 当前没有 fresh current-head 证据要求它直接升级回实现线

### 当前唯一建议下一刀

- `dispatch_outer_shell_probe`
  - 分类：`真实瓶颈`
  - 理由：
    - 它打的是 shared public shell，而不是已收口的 same-target fanout 壳
    - browser blocker 已 `clear`，说明继续重跑 broad browser 路线信息量不高
    - node 微基线显示 residual 主要落在 trace 外层
    - outer-shell split probe 又进一步证明，主税点更偏 `dispatch` 专属入口壳，而不是 `txnQueue` 公共壳

## 对 111 的含义

- `111` 继续保持 `shadow_code_poc_ready / live_candidate=blocked`
- `#146/#148` merged 后没有新增 `controller_related` 信号
- 这轮 latest-main identify 默认不把 `111` 当下一刀

## 下一步

1. 在独立 worktree 上补一条更窄的 outer dispatch shell probe
2. probe 目标至少拆开：
   - `dispatch` 专属入口壳
   - `public setState` 公共 queued 壳
   - `direct txn setState` 近 body 对照
3. 当前 split probe 已完成，下一步允许把实现线进一步收窄到 `dispatch` 专属入口壳
4. 若后续更窄实现线只拿到微基线正向、route-level 不动，立即停线并回到 `dirty-evidence -> converge admission` 这条次选路线
