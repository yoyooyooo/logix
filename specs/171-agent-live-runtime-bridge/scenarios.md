# 终局场景目录：Agent Live Runtime Bridge

本页站在 171 已实施完毕后的用户和用户 Agent 角度，描述这套 live runtime bridge 经典玩法。它不是新 authority；命令合同归 [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)，需求与 proof gates 归 [spec.md](./spec.md)、[plan.md](./plan.md)、[tasks.md](./tasks.md)、[quickstart.md](./quickstart.md)。

## 总心智

171 完成后，用户和 Agent 使用同一组公开 CLI。不存在 Agent-only public command。

```text
verification lane:
  logix check
  logix trial --mode startup
  logix compare

live lane:
  logix live <task>
```

`check / trial / compare` 产出 verification verdict 和 repair hints。`live` 只产出 target、operation、capture、profile、canonical evidence handoff 或 evidence gap，不产出 verification verdict。live 结果要进入修复闭环，必须先导出 canonical evidence package 或 artifact refs，再交给 `trial / compare`。

## 场景覆盖矩阵

| id | 经典场景 | v1 状态 | 主命令 | 主要 proof / task |
| --- | --- | --- | --- | --- |
| SCN-171-01 | 改完代码后自检 | covered by 15/16, consumed by 171 | `logix check`, `logix trial --mode startup` | existing verification proof, T072 |
| SCN-171-02 | 连接真实运行时并定位 target | required, real carrier delta | `logix live start/status/targets/inspect` | US1, T027-T032, T096-T123, W171-001, W171-011, W171-012 |
| SCN-171-03 | 捕获失败现场并导出 evidence | required, real carrier delta | `logix live capture`, `logix live export evidence` | US2, US4, T033-T040, T051-T058, T119-T120, W171-013 |
| SCN-171-04 | before/after 修复比较 | required handoff | `logix trial`, `logix compare` plus evidence refs | US4, T056-T058, W171-001 |
| SCN-171-05 | 受控触发 declared action | required | `logix live dispatch` | US3, T041-T050, W171-003 |
| SCN-171-06 | 交互后状态验证 | required | `dispatch`, `wait`, `snapshot`, `export evidence`, `compare` | US3 + US4 |
| SCN-171-07 | DVTools / Playground / Agent 同源投影 | required | same evidence package / Workbench projection | US5, T059-T066, W171-006 |
| SCN-171-08 | CI 轻门禁，本地 deep live debugging | required policy | CI uses `check + trial startup`; local uses `live` | 15 CI policy, quickstart final sweep |
| SCN-171-09 | bounded runtime profile summary | required local-only | `logix live profile start/stop/summary` | US3, Batch 6 safety budget |
| SCN-171-10 | 运行证据进入修复建议 | required handoff | `capture/export evidence`, then `trial/compare` | FR-029, SC-011, W171-009 |
| SCN-171-11 | 云端或远程接入安全边界 | partial / deferred product protocol | no v1 cloud mutation command | Batch 3 + Batch 6 security gates |
| SCN-171-12 | scenario executor 成功路径 | future | `trial --mode scenario` reserved only | 15 reserved grammar |
| SCN-171-13 | deep trace / heap / full profiler | future | no v1 command | 15 negative boundary |
| SCN-171-14 | Agent 自动研究与自动采纳 | future | no v1 command | Batch 7 header only |

## SCN-171-01：改完代码后自检

用户或 Agent 修改逻辑后，先跑 verification lane：

```bash
logix check
logix trial --mode startup
```

预期：

- `check` 发现 declaration、Program 装配、imports、dependency、config 类问题。
- `trial --mode startup` 验证启动期真实运行。
- 输出是 `CommandResult`，指向 `VerificationControlPlaneReport` 和 artifact refs。
- 修复提示必须能回到 stable focus coordinate。

171 的角色：

- 不重开 `CommandResult` 或 report truth。
- 只在 live evidence 已导出时，把 evidence refs 交给 verification lane。

## SCN-171-02：连接真实运行时并定位 target

当用户说“本地跑着但行为不对”，Agent 先连接 live bridge：

```bash
logix live start
logix live status
logix live targets --tree
logix live inspect <target>
```

预期：

- Agent 能看到 active runtime/module/instance/topology。
- target coordinate 由 core attachment substrate 产生或校验。
- CLI 不生成 runtime identity，不持有 session truth。
- 如果两个 browser tabs 同时连入同一应用，targets 需要能按 attachment offer 分开显示；能拿到 host locator 时，CLI 应显示两个 attachment row，而不是把它们当成同一个 tab truth。
- 前端集成必须同时支持 Vite dev plugin 和 `import "@logixjs/react/dev/live"` dev-only import。两者只是安装同一个 browser adapter 的两种入口，不能产生两套 protocol 或两套 evidence shape。
- deeper phase 中，browser adapter 已开始上报 richer target projection，CLI `targets --tree` 不再只依赖弱 attachment 标识。
- 无 runtime 或不可访问 target 时输出 evidence gap。

必要 proof：

- target discovery dogfood。
- no-runtime-attached gap。
- adapter offer 不拥有 runtime identity。
- real carrier proof：local daemon 接受 browser WebSocket host.offer，CLI 通过 IPC 读取 daemon-backed targets。
- multi-tab proof：两个 browser tabs 指向同一 route/runtime 时输出两个 attachment rows。
- dev-only import proof：Playwright 启动轻量页面，页面只通过一行 `import "@logixjs/react/dev/live"` 注入 live adapter，再模拟 CLI 通过 daemon IPC 读取 targets，证明最小 browser -> daemon -> CLI 链路跑通。

## SCN-171-03：捕获失败现场并导出 evidence

当问题只在运行中出现：

```bash
logix live capture --target <target> --window 5s
logix live export evidence --from <daemon-lineage-ref>
logix trial --mode startup --evidence <evidence-ref>
```

预期：

- capture bounded、可降级、可 redaction。
- 输出 `LiveCommandResult`，只指向 capture artifact、budget/drop/degraded markers 或 evidence gap。
- `export evidence` 产出 canonical evidence package ref；推荐输入是 capture/snapshot/operation 返回的 `artifactRef.file` daemon lineage ref。
- verdict 仍由 `trial` 给出。
- deeper phase 中，`snapshot.read` 与 `capture.eventWindow` 已走 browser-backed operation lane；导出的 evidence package 会优先复用真实 live artifact，而不是只写 placeholder gap。
- `wait.condition` 已走 browser-backed operation lane；它返回 live operation facet，而不是 hidden scheduler truth。
- real carrier 路径不得继续返回 in-process proof gap；真实浏览器 dev host 应返回 daemon-backed capture/snapshot/export artifact，或返回说明 host 不支持该 operation 的 structured gap。
- 多 tab 或多 process 下，同一个 target coordinate 不再全局唯一；CLI 必须通过 `logix live targets --tree` 取得 `attachmentId`，再用 `--attachment <attachmentId>` 精确选择 tab。未指定且匹配多个 attachment 时返回 `ambiguous-live-target`。
- 如果多个 attachment 并发返回相同裸 `captureId`，裸 ref 不再作为可靠 export 输入；daemon 返回 `ambiguous-live-artifact-ref`，要求使用 lineage ref。

禁止：

- CLI-owned evidence envelope。
- 裸 live session truth。
- raw trace full compare 作为默认面。

## SCN-171-04：before/after 修复比较

Agent 修复前后都保留标准 report 或 evidence refs：

```bash
logix trial --mode startup
logix live capture --target <target> --window 5s
logix live export evidence --from <daemon-lineage-ref>

# repair

logix trial --mode startup
logix compare --before <before-report> --after <after-report>
```

预期：

- before/after 比较归 `runtime.compare`。
- live refs 只能作为 canonical evidence refs 或 artifact refs 输入。
- environment fingerprint 不可比时 compare 应给 `INCONCLUSIVE` 或对应 gap。

## SCN-171-05：受控触发 declared action

Agent 需要主动触发业务动作时：

```bash
logix live dispatch --target <target> --action <tag> --payload payload.json
```

预期：

- mutation 只能走 `dispatch.declaredAction`。
- 必须先通过 static-live binding、permission、auth、tenant/session boundary、validator availability、budget 和 redaction gate。
- stale manifest、digest mismatch、unavailable action contract、unauthorized target、missing validator for non-void dispatch 都返回 `operation.denied`，且 `noMutation: true`。
- accepted 只表示 admitted and routed；最终效果通过 `operation.completed` 或 `operation.failed` facet 表达。
- 当前 deeper phase 已把 `dispatch.declaredAction` 接进 browser-backed operation lane；它按 target 解析 browser-side runtime binding，再尝试真实 runtime dispatch。若 browser host 无法解析 binding 或 runtime dispatch 失败，则返回 owner-backed gap 或 `operation.failed`，不伪造 mutation 成功。

禁止：

- arbitrary state patch。
- undeclared action dispatch。
- hidden internal mutation。
- dynamic eval。
- transaction-window IO。

## SCN-171-06：交互后状态验证

适合“启动正确，但交互后状态错”的场景：

```bash
logix live snapshot --target <target>
logix live dispatch --target <target> --action <tag> --payload payload.json
logix live wait --target <target> --condition <condition> --timeout 5s
logix live snapshot --target <target>
logix live export evidence --from <operation-ref>
logix compare --before <before-report-or-evidence> --after <after-report-or-evidence>
```

预期：

- snapshot 是 read-only evidence facet。
- wait 是 condition observation，不是 hidden scheduler authority。
- 当前 deeper phase 已把 `wait.condition` 接进 browser-backed operation lane；返回 `operation.completed` 或 owner-backed gap，不产生 verification verdict。
- operation/capture/snapshot evidence 进入 canonical evidence package 后再 compare。

## SCN-171-07：DVTools / Playground / Agent 同源投影

同一份 canonical evidence package 应能被三类宿主消费：

```text
Agent route
DVTools internal Workbench host
Playground dogfood host
```

预期：

- 三者得到等价 session/finding/artifact/gap identity。
- Workbench 只做 projection，不创建 report truth、verdict truth、operation truth 或 standalone denial truth。
- Playground 和 DVTools 不能定义第二 evidence protocol。

必要 proof：

- W171-006。
- US5 parity tests。

## SCN-171-08：CI 轻门禁，本地 deep live debugging

默认 CI 只跑：

```bash
logix check
logix trial --mode startup
```

本地 dogfood 或 live debugging 才跑：

```bash
logix live ...
logix compare ...
```

预期：

- `logix live` 不进入默认 CI gate。
- CI 不因 daemon、browser hook、host runtime 或 raw capture 变慢。
- disabled bridge overhead 接近 structural no-op。

必要 proof：

- W171-002 disabled-path overhead。
- no transaction-window IO。

## SCN-171-09：bounded runtime profile summary

当 Agent 需要定位性能或运行时退化：

```bash
logix live profile start --target <target>
logix live profile stop
logix live profile summary
```

预期：

- v1 只支持 local-only bounded runtime summary。
- 输出 profile artifact ref、summary 或 degraded marker。
- 不提供 deep CPU profile、heap snapshot、long-running raw stream。

## SCN-171-10：运行证据进入修复建议

当 live evidence 已经捕获到 failure、denial、gap 或 degraded marker，Agent 不直接根据 live stdout 下修复结论，而是把证据交回 verification lane：

```bash
logix live capture --target <target> --window 5s
logix live export evidence --from <daemon-lineage-ref>
logix trial --mode startup --evidence <evidence-ref>
# 或
logix compare --before <before-report> --after <after-report>
```

预期：

- `LiveCommandResult` 只提供 repair clues：denial reason、evidence gap、degraded marker、target coordinate、binding header、source/declaration refs、artifact refs。
- `LiveCommandResult` 不包含 `repairHints`、`nextRecommendedStage` 或 verification verdict。
- `VerificationControlPlaneReport.repairHints` 持有最终修复建议。
- 如果失败可局部化，至少一个 repair hint 带 `focusRef`，并通过 `relatedArtifactOutputKeys`、evidence refs 或稳定 coordinate 追溯到 live-derived evidence。
- revoked lease、explicit disconnect、target unavailable 或 cleanup completed 后，后续 live 请求只允许 denied/gap/degraded，不得恢复为 active writable state。

典型可修复范围：

- Program 装配漏 import / provider / config。
- declaration 与 runtime manifest 不一致。
- action tag 未声明。
- payload validator 缺失或 payload schema 不匹配。
- stale manifest / digest mismatch。
- unauthorized target / revoked lease / permission 不足。
- startup lifecycle failure。
- before/after report 可比较时的 runtime transition regression。

低覆盖或 future：

- 任意业务逻辑 bug 的自动补丁。
- UI 视觉差异根因。
- deep CPU profile / heap snapshot。
- raw trace 级因果链。
- `trial --mode scenario` 成功路径。

## SCN-171-11：云端或远程接入安全边界

171 v1 只冻结安全原则，不冻结 cloud product protocol。

必须保留：

- explicit auth。
- tenant/session boundary。
- revocation。
- audit evidence。
- redaction policy。
- cloud 无 `globalThis` authority。
- remote/cloud mutation 默认 unsupported 或 denied，且 no mutation。

后续 cloud spec 才能冻结 exact registration、routing、lease、auth 和 remote transport protocol。

## Future 场景

以下场景不属于 171 v1 成功路径：

- `SCN-171-12`：`trial --mode scenario` 成功执行。当前只保留 public grammar 和结构化失败要求。
- `SCN-171-13`：deep CPU profile、heap snapshot、raw trace stream、replay 默认门禁。
- `SCN-171-14`：AutoResearch loop、metric family authority、decision trace family、adoption algebra、autonomous adopt/discard、merge/publish/release。
- cloud remote mutation。

这些能力如果后续重开，必须重新证明不新增第二 runtime truth、第二 report truth、第二 evidence envelope 或第二 operation authority。

## 用户 Agent 读法

Agent 处理问题时按这个顺序选择：

1. 能静态判断，先 `logix check`。
2. 需要启动期事实，跑 `logix trial --mode startup`。
3. 需要真实运行时上下文，进入 `logix live status/targets/inspect`。
4. 需要运行中证据，跑 `capture/snapshot/profile`。
5. 需要主动触发，只能跑 `dispatch.declaredAction` 对应的 `logix live dispatch`。
6. 需要把 live 事实变成 verdict，先 `export evidence`，再 `trial/compare`。
7. 看到 evidence gap 或 denial，不猜测，回到对应 owner：attachment、admission、reflection binding、budget/redaction 或 verification control plane。

## 当前落地状态说明

- 171 semantic MVP 已完成：core attachment、evidence facets、Workbench projection、CLI live namespace、Playground dogfood、repair handoff 与 disabled overhead proof 均已关闭。
- real carrier 已完成：local daemon、browser WebSocket adapter、CLI IPC client、multi-tab attachment projection、daemon-backed operation lane、daemon lineage export 和 daemon-backed evidence handoff proof 均已关闭。
- concurrent attachment isolation 已完成：同 target 多 attachment ambiguity、显式 attachment 并发 routing、forged response ignore、duplicate bare capture ref gap 均已关闭。
- daemon lifecycle hardening 已完成：current CLI re-exec + hidden `__internal_live_daemon` selector、carrier-local operator snapshot、stale cleanup evidence、无 supervisor、无 public lifecycle grammar、无第二 daemon bin build surface。
- 执行记录为 [implementation-plan-real-carrier.md](./implementation-plan-real-carrier.md)、[implementation-plan-concurrency-isolation.md](./implementation-plan-concurrency-isolation.md)、[tasks.md](./tasks.md) 的 T096-T137 与 [notes/verification.md](./notes/verification.md)。
