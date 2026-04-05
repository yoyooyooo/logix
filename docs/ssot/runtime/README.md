---
title: Runtime SSoT Root
status: living
version: 2
---

# Runtime SSoT Root

本目录用于重新生长新的运行时事实源。

## 当前状态

- 历史 runtime SSoT 基线在 `docs/legacy/ssot/runtime/`
- 新 runtime SSoT 从当前目录重新建立

## 当前入口

- [01-public-api-spine.md](./01-public-api-spine.md)
- [02-hot-path-direction.md](./02-hot-path-direction.md)
- [03-canonical-authoring.md](./03-canonical-authoring.md)
- [04-capabilities-and-runtime-control-plane.md](./04-capabilities-and-runtime-control-plane.md)
- [05-logic-composition-and-override.md](./05-logic-composition-and-override.md)
- [06-form-field-kernel-boundary.md](./06-form-field-kernel-boundary.md)
- [07-standardized-scenario-patterns.md](./07-standardized-scenario-patterns.md)
- [08-domain-packages.md](./08-domain-packages.md)
- [09-verification-control-plane.md](./09-verification-control-plane.md)

## 当前优先入口

- 公开主链：`01-public-api-spine.md`
- hot path 方向：`02-hot-path-direction.md`
- control plane：`04-capabilities-and-runtime-control-plane.md`
- 验证控制面：`09-verification-control-plane.md`

## 规则

- 新事实先从 proposal/next 收口
- 再写回本目录
- 旧 runtime 文档默认不直接修补
