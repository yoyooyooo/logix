---
title: Module handle extensions
description: 只有在保留底层 module owner 时才扩展 handle。
---

module handle 暴露 read、changes、dispatch、action helpers，以及由 module/program 携带的领域扩展。扩展应让常见 command 更清晰，而不是变成第二套 runtime API。

## 可接受扩展

form handle 添加 `field(path).set` 和 `submit()` 这类领域 command，但它仍然通过同一条 React host route 读取，也仍然属于自己的 program instance。

## 边界

- 不要把 module instance 藏在无关 controller object 后面。
- 不要创建第二套 selector family。
- 不要把 service ownership 从 runtime layers 移到 handle。
- extension command 应能还原到 module actions、logic 或领域 primitive。
