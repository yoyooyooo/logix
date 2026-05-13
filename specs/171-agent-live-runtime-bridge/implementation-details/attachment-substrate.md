# Attachment Substrate 规划说明

本页记录 171 attachment substrate 的实施前细节。它不是 public API。

## 冻结语义

- Core 拥有 attachment authority。
- Adapter 提交 attach offer。
- Core 决定 lifecycle、capability gate、admission、evidence producer feed 和 cleanup。
- Adapter transport 不能拥有 runtime identity 或 session truth。

## 初始内部 service boundary

实施可使用内部 service 形态，但不得冻结 public 名称：

```text
AttachmentService
  registerOffer(offer)
  listTargets()
  requestOperation(request)
  openCaptureWindow(request)
  exportEvidence(request)
  closeAttachment(id)
```

名称仅作 planning sketch。最终实现名必须服从 codebase naming sweep。

## Adapter 一致性

Browser dev adapter：

- opt-in。
- dev-only discovery。
- one offer per browser tab or renderer context。
- `tabId` 只作为 host locator，不能当成 runtime identity。
- exact global hook name deferred。
- 无 cloud authority。

Node local adapter：

- local daemon 或 process registration。
- transport 只做 projection，常见 carrier 可以是 WebSocket、socket 或 stdio。
- 无 session truth。
- 只作为 transport projection。

Playground adapter：

- dogfood host。
- project/source snapshot 只作为 context refs。
- product UI state 保持 host view state 身份。

Cloud adapter：

- explicit auth。
- tenant/session boundary。
- revocation and audit。
- 无 `globalThis` authority。
- 完整 protocol 后置。

## Cleanup invariant

Close 必须产生以下结果之一：

- 已 drain 的 evidence handoff。
- 显式 dropped/degraded marker。
- 带原因的 evidence gap。

不得静默丢失 active mutation evidence。

## Terminal state

attachment 在以下情况必须进入 terminal state：

- lease revoked。
- explicit disconnect。
- target unavailable。
- cleanup completed。

terminal state 后不得恢复为 active writable state；后续请求只能返回 `operation.denied`、`evidence.gap` 或 degraded marker。
