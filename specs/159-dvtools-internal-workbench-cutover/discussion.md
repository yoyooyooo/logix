# Discussion: DVTools Internal Workbench Cutover

本文件不持有 authority。接受后的裁决必须回写到 [spec.md](./spec.md) 或 [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)。

当前已采纳的裁决全部进入 [spec.md](./spec.md)。

## Adopted Freeze Summary

`159` 采纳的终局执行契约是：

```text
scope -> session -> finding -> artifact attachment
```

已冻结：

- session boundary precedence
- report placement law
- artifact attachment law
- evidence gap code set
- component disposition table
- implementation wave plan
- closure proof pack
- export to CLI loop
- runtime cost boundary
- time travel exclusion rule
- internal mount contract

## Residual Risks

| risk | current handling | reopen trigger |
| --- | --- | --- |
| `VerificationControlPlaneReport` 坐标不足 | 先按 report placement law 只生成 finding/drilldown 或 `report-only-evidence` gap | 必须扩展 `focusRef` 或 artifact refs |
| evidence envelope 缺必要 debug source | 先落到 evidence gap，不在 DVTools 发明本地协议 | 现有 envelope 无法表达必要 runtime source |
| `500-event / 200ms` 缺本机基线 | `P-011` 只要求记录可复现 baseline，不作为新增 runtime evidence 的理由 | 性能 fixture 落地后持续不达标且影响默认路径 |
| internal mount 被误写成 public recipe | `TD-003` 禁止 public recipe 与 package export | 真实 user-facing helper 需要 toolkit intake |
| legacy time travel data 仍存在 | 只允许 `legacy-time-travel-data` gap 或 drilldown | 有需求要求重新启用 state mutation controls |
| runtime 侧采集影响页面性能 | `TD-006` 把默认路径限定为按需低成本 evidence | profiling 采集影响可见交互成本 |
| Chrome DevTools 宿主迁移未立项 | 当前只登记为 future host direction | 极限性能 profiling 或浏览器级采集成为主线 |
| CLI import 需要独立协议 | 先要求 canonical evidence package + selection manifest | CLI 无法消费 canonical evidence 或 control-plane report |

## Rejected Alternatives

| alternative | rejected reason |
| --- | --- |
| action event 持有 session 边界 | action event 不稳定，无法覆盖中段 evidence window、imported evidence 与无 action 的 lifecycle/debug event |
| `VerificationControlPlaneReport` 独立 report lane | 会形成第二 summary model，并和 report explainer 边界冲突 |
| artifact 作为 root lane | artifact 是 finding 附属对象，root lane 会削弱 session-first repair path |
|保留右侧 findings/details 作为默认主 lane| 容易形成多中心布局，受限高度下也更难证明主工作台可访问 |
| time travel 以 experimental switch 进入 `159` closure | 会保留 runtime mutation 第二系统，和 evidence workbench 目标冲突 |
| discussion 继续承载 component candidates | discussion 会变成第二 spec，implementation-ready 需要单一 authority |
| DVTools 导出自己的 report/finding/session truth 给 CLI | 会产生第二 report 或第二 evidence truth，CLI 只能消费 canonical evidence 与 selection manifest |
| 当前就新开 Chrome DevTools spec | profiling 还不是近期主线，会过早牵引 runtime cutover 和 UI cutover |

## Background Materials

- [../038-devtools-session-ui/spec.md](../038-devtools-session-ui/spec.md)
- [../015-devtools-converge-performance/spec.md](../015-devtools-converge-performance/spec.md)
- [../../docs/proposals/devtools-appendix-surface-contract.md](../../docs/proposals/devtools-appendix-surface-contract.md)
- [../../docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
