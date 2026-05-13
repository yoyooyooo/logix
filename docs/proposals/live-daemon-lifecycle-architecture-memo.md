# Live Daemon Lifecycle Architecture Memo

**状态**: adopted and implemented
**日期**: 2026-05-03
**定位**: repo-level architecture memo, anchored from `171`
**评审账本**: [../review-plan/runs/2026-05-03-171-live-daemon-launcher-supervisor.md](../review-plan/runs/2026-05-03-171-live-daemon-launcher-supervisor.md)
**权威边界**:
- 不重开 `171` owner law
- 不新增 public live task grammar
- 不产出新需求
- 不产出新实施方案
- 不冻结 daemon/supervisor 的长期产品面
- 不新增 launcher/supervisor SSoT authority；既有 public command contract 仍由 `15` 持有

## 目标函数

本 memo 固定 repo-level daemon lifecycle 的最小终局边界：

```text
让 live client 失去 daemon 启动策略与进程细节，
只保留一个 repo-internal launch authority，
并把本地 daemon 的运维材料限制为 carrier-local operator snapshot。
```

当前采纳的方向是：

- `launcher clean cut`
- `carrier-local operational gates`

这只解决两个具体问题：

- `live client` 不再同时承担 live task 语义和进程管理细节。
- 后续若重开 supervisor 或 daemon lifecycle product surface，必须先给出可验证的 operational evidence gate。

它不冻结：

- 新 public live task grammar
- daemon 生命周期产品面
- pid/log/state 文件 schema
- supervisor 作为稳定长期层
- launcher/supervisor SSoT authority

## 当前问题

real carrier 已经打通：

```text
browser adapter
  -> WebSocket
    -> local daemon
      -> IPC
        -> logix live
```

但当前仍有一个实现期残留问题：

- `live client` 持有 daemon 启动策略
- dev/test 启动差异曾一度泄漏进 runtime 代码
- launcher boundary 还没有被单独定义成 repo-internal concern

这会直接增加：

- `concept-count`
- `migration-cost`
- future CLI packaging 耦合

## 外部参照吸收规则

`callstackincubator/agent-react-devtools` 提供的有效经验是：

- persistent daemon
- `start / status / stop`
- wait-ready workflow
- token-efficient tree/component/profile output
- Vite plugin 与 one-line dev import

`/Users/yoyo/Documents/code/personal/agent-remnote` 提供的有效经验是：

- pid/state/log/health 文件和状态可读性
- stale state cleanup
- supervisor crash-loop/backoff/failure state
- start/ensure/restart/logs/stack 这类 operational lifecycle surface

本 memo 只吸收这些经验中的更小内核：

- persistent carrier 需要可诊断的 readiness、health、log locator 和 stale cleanup evidence。
- 前端集成入口继续由 `171` 的 dev adapter、Vite dev plugin 和 dev-only import 承接。
- public command grammar 继续由 `15` 持有。
- daemon metadata 只能是 carrier-local operator snapshot，不能成为 runtime、attachment、evidence 或 report truth。
- supervisor 只能作为 future counter proposal 进入评审，不能从外部项目经验直接平移为 adopted concept。

## Adopted Architecture

本轮采纳的架构判断只有四点：

### 1. 单一 launch authority

daemon 启动必须只有一个 repo-internal launch authority。

允许：

- 一个 launcher module 负责“如何启动 daemon”

禁止：

- `live client` 自己决定如何启动 daemon
- runtime 代码硬编码 `tsx` bin 路径
- runtime 代码长期依赖 `src / dist` 分流
- 同时保留多条未冻结 daemon entry basis

### 2. `re-exec current CLI` 只是当前优选实现，不是长期 must

当前最优实现候选可以是：

```text
process.execPath
  + process.execArgv
  + current CLI entry
  + internal daemon selector
```

但这只能写成：

- current preferred implementation direction

不能写成：

- permanent law
- public contract
- future packaging must

原因：

- `15` 仍保留 public CLI 可删除的退出权
- `171` 仍把 carrier 定义为可替换 projection

### 3. daemon state 只允许 carrier-local operator snapshot

launcher clean cut 不得引入第二 truth。

carrier-local operator snapshot 可以包含 readiness、health、locator 和 cleanup 证据，例如：

- pid
- socket path / port
- local log path
- readiness / health wait
- stale pid cleanup metadata

这不是字段全集，也不是 public file contract。

不得承载：

- attachment truth
- runtime truth
- evidence truth
- report truth
- terminal / degraded lifecycle owner

这些仍归：

- core attachment projection
- canonical evidence / verification control plane

### 4. supervisor 只通过 operational evidence gate 重开

当前不冻结 supervisor。

后续只有当具体 failure domain 无法由下面三者共同守住时，才允许重开 supervisor：

- single launch authority
- daemon runtime layer
- carrier-local operator snapshot

合格的重开证据必须至少命中一个 failure domain：

- crash-loop containment 无法解释或收束
- graceful stop / no-restart 语义无法保证
- status/readiness 无法给出 actionable degraded reason
- stale pid/state cleanup 无法保持可诊断
- bounded log observability 缺失导致 Agent 只能读人类日志
- 多进程 ownership conflict 无法由单一 launcher authority 表达

即使命中这些 failure domain，新的候选也必须继续满足：

- 不新增 public live task grammar
- 不产生 second authority
- 不把 daemon metadata 升级为 runtime / attachment / evidence / report truth
- 不把当前 CLI packaging 形状冻结成长期公理

## 收口标准

这份 memo 要求后续实现继续满足下面五件事：

1. `live client` 不再拥有 daemon 启动策略。
2. daemon 启动只剩一个 repo-internal launch authority。
3. daemon metadata 只作为 carrier-local operator snapshot，不升级为 runtime / attachment / evidence truth。
4. 现有 `171` 不变量不退化：
   - terminal / degraded lifecycle
   - `LiveCommandResult` 边界
   - disabled/no-daemon structural no-op
   - transport 可替换性
5. 任何 supervisor 或 lifecycle product surface 讨论都先通过 operational evidence gate。

## 边界建议

当前只建议保留 repo-internal implementation layering：

- `daemon runtime layer`
- `launcher layer`

`supervisor` 是否存在，先不冻结。

在 operational evidence gate 通过前：

- `supervisor` 只是候选，不是 adopted concept

## 非目标

这份提案当前明确不做：

- 新增 `15` 之外的 public live task grammar
- 把 launcher / runtime / supervisor 写进 SSoT
- 冻结 `__internal_live_daemon` 之类内部 selector 名字
- 冻结 exact filenames
- 冻结 pid/log/state 文件 schema
- 冻结 supervisor 为稳定长期层

## 未来若要继续讨论

若未来还要继续讨论 daemon lifecycle 管理，只允许围绕这些问题重新进入评审：

1. 是否需要独立 supervisor
2. 哪个 failure domain 已经无法由 launcher + daemon runtime + carrier-local operator snapshot 表达
3. supervisor 的最小 owner 面是什么
4. 哪些 daemon state 只是 operator-local locator / readiness / health evidence
5. 新增 public live task grammar 是否真的值得，且是否已先重开 `15`

任何 follow-up 都必须再次证明：

- 不长出第二 authority
- 不提前扩 public command surface
- 不把当前 CLI packaging 形状冻结成长期公理

## 一句话结论

当前冻结：`launcher clean cut + carrier-local operational gates`。

## 2026-05-03 实施结果

已落地：

- `packages/logix-cli/src/internal/liveDaemonLauncher.ts` 持有唯一 daemon process launch authority。
- 默认启动路径是 current CLI re-exec 加 hidden `__internal_live_daemon` selector。
- `packages/logix-cli/src/internal/liveDaemonOperatorSnapshot.ts` 持有 metadata validation、stale cleanup evidence 与 stopped/ready/degraded operator snapshot projection。
- `packages/logix-cli/src/internal/liveDaemonServer.ts` 只写 carrier-local operator metadata，不写 runtime、attachment、evidence 或 report truth。
- `packages/logix-cli/src/internal/liveClient.ts` 不再自行拼装 divergent status shape，也不拥有 stale cleanup 策略。
- `packages/logix-cli/tsup.config.ts` 只构建 `src/bin/logix.ts`；第二 daemon bin source/build entry 已删除。

未落地且仍为非目标：

- supervisor runtime。
- `logix live ensure/restart/logs/doctor` public lifecycle grammar。
- public pid/log/state file schema。

证明记录见 [../../specs/171-agent-live-runtime-bridge/notes/verification.md](../../specs/171-agent-live-runtime-bridge/notes/verification.md) 的 `2026-05-03 Live daemon launcher/operator snapshot hardening`。
