# Transport Topology 终局说明

本页吸收 `callstackincubator/agent-react-devtools` 的可取结构，但不照搬它的协议作为 Logix 语义核心。

## 参考实现提炼

参考项目的有效结构是：

```text
browser app
  -> WebSocket
    -> local daemon
      -> local socket / IPC
        -> CLI
```

它的价值：

- daemon 给 CLI 提供持久后台进程，避免每次命令重新建立 browser runtime context。
- browser WebSocket 适合 dev-only runtime attach。
- CLI 通过本地 socket 调 daemon，形成稳定的一次性命令体验。
- 每个 browser connection 可独立追踪，并能在 disconnect 时清理对应 roots。

它不适合作为 Logix 终局语义的部分：

- WebSocket 是 carrier，不是 runtime truth。
- daemon 是 transport projection，不是 session truth。
- React component id / root fiber id 不等于 Logix runtime coordinate。
- browser tab 是 host locator，不是 Agent repair coordinate。

## Logix 终局拓扑

Logix 固定为 attachment-first topology：

```text
host offer
  -> transport projection
    -> core-owned attachment
      -> normalized live topology
        -> canonical evidence facets
          -> Workbench projection
            -> verification closure
```

层级含义：

| layer | owner | allowed data | forbidden authority |
| --- | --- | --- | --- |
| host offer | adapter | host kind、process id、optional tab id、project/env refs、requested capabilities | runtime identity、operation authority、evidence truth |
| transport projection | CLI/daemon/adapter | port、socket path、connection id、carrier health、disconnect hints | session truth、runtime truth、report truth |
| core attachment | runtime core | attachment id、lifecycle、capability lease、target index、cleanup state | public protocol truth |
| live topology | runtime core | runtime/module/instance/txn/op target coordinates | host UI truth |
| canonical evidence | verification/workbench owners | operation/capture/gap/redaction/budget facets | second evidence envelope |
| projection | Workbench | session/finding/artifact/gap views from owner facts | standalone verdict or repair authority |

## 多 Tab 与多进程

规则：

- 每个 browser tab、renderer context、Node process 或 Playground host 提交独立 attachment offer。
- `tabId` 是 optional host locator。缺失时不得生成随机身份；应输出 evidence gap 或 degraded locator。
- 如果两个 tabs 指向同一 `runtimeId/moduleId/instanceId`，CLI 仍显示两个 attachment rows。
- Agent selection 必须保留 attachment ref 或 host locator，不能只保留 runtime coordinate。
- Disconnect、reload、HMR、tab close 必须更新 attachment lifecycle，并 drain evidence 或产生 dropped/degraded/gap marker。

示例：

```text
attachment:a-browser-1 host:{kind:browser, tabId:t1} target:{runtime:r, module:m, instance:i}
attachment:a-browser-2 host:{kind:browser, tabId:t2} target:{runtime:r, module:m, instance:i}
```

这表示两个 live observations，不表示两个 runtime truths。

## Local Carrier

P1 semantic MVP 已经证明 `logix live` 的 owner law。2026-05-03 real carrier closure 已把 `logix live` 从 in-process proof transport 收敛到真实 local daemon / browser WebSocket / CLI IPC carrier，并保留 attachment-first owner law。

Real carrier target：

```text
Vite dev plugin or @logixjs/react/dev/live
  -> browser dev adapter
  -> WebSocket local carrier
    -> local daemon transport projection
      -> local socket / IPC
        -> logix live
```

要求：

- carrier health 可以进入 `logix live status`。
- Vite dev plugin injection 与 `@logixjs/react/dev/live` dev-only import 必须安装同一个 browser adapter。
- dev-only import 轻页面必须能在不依赖 Playground、不依赖 plugin 注入的情况下完成 browser -> daemon -> CLI/IPC E2E proof。
- carrier ids 只能作为 locators/ref。
- daemon rebuild、restart、disconnect 只能改变 transport projection，不得改变 owner runtime identity。
- CLI 不读取 human logs 推断 tab、runtime 或 action identity。
- daemon 必须按 browser connection 维护 attachment lifecycle；WebSocket close、tab close、reload 或 daemon stop 必须转成 disconnected/degraded/terminal attachment state。
- 多个 browser tabs 即使指向同一 runtime/module/instance，也必须在 `logix live targets` 中保留多个 attachment rows。
- `logix live capture/snapshot/export evidence` 的本地浏览器路径必须返回 daemon-backed live artifacts 或 canonical evidence package；不能继续把真实 carrier 场景降级为 in-process proof gap。
- 实施计划见 [../implementation-plan-real-carrier.md](../implementation-plan-real-carrier.md)。

## Rejected Shapes

- WebSocket 作为 public protocol identity。
- daemon session id 作为 runtime truth。
- browser tab id 作为 runtime identity。
- React DevTools protocol 作为 Logix profile/runtime evidence authority。
- CLI 合并多个 attachments 后只输出一个 target。
- Workbench 基于 host locator 直接创建 finding 或 verdict。
- Vite plugin 和 dev-only import 各自定义一套 browser bridge protocol。
