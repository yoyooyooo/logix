---
title: Logix API Next Postponed Naming Items
status: living
version: 11
---

# Logix API Next Postponed Naming Items

这些条目表示“名字还没完全终局”，但当前 docs 已有稳定口径。

它们不表示：

- 结构裁决未定
- 历史名字会自动保留
- 为了熟悉度继续继承旧壳层

当前固定规则：

- 语义先按新主链和新边界落地
- 名字若与新主链冲突，直接重命名或删除
- 命名待定不构成兼容承诺
- 结构边界继续回各自 owner 页面，不在这里重开

结构 owner：

- `field-kernel` 看 `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- 领域包主输出形态看 `docs/ssot/runtime/08-domain-packages.md`
- 定义锚点与 strict static profile 看 `docs/ssot/platform/02-anchor-profile-and-instantiation.md`

重开原则：

- 只有持续误读已发生
- 或能明确减少作者决策分叉
- 或进入代码统一改名窗口

若只是结构是否保留的问题，继续回 structure owner，不在这里裁决

## 当前条目

### 1. 定义锚点最终是否继续沿用 `ModuleDef`

- 当前口径：docs 暂不把 `ModuleDef` 放回公开主链名词
- 当前处理：若必须描述这类角色，优先写“定义锚点”或“定义期 identity”
- 理由：公开主链已经收敛为 `Module / Logic / Program`；现在把 `ModuleDef` 提回公开表述，会重新增加一层相位心智
- 重开条件：只有在定义锚点对象确实需要稳定公开暴露时，才重新决定是否恢复 `ModuleDef`

### 2. `roots` 是否改成更明确的 `rootProviders`

- 当前口径：`roots` 已退出 canonical capability surface
- 当前处理：若未来确有相关宿主语义需求，再作为新的 owner 议题重开；本页当前不保留 active naming 工作项
- 理由：`Program.capabilities` 已收口到 `services / imports`，继续保留 `roots` 的 naming 讨论只会制造口径歧义
- 重开条件：只有出现新的、稳定的宿主语义需求，且能明确减少作者决策分叉时，才重新讨论命名

## 相关页面

- [../ssot/runtime/06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)
- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../ssot/platform/02-anchor-profile-and-instantiation.md](../ssot/platform/02-anchor-profile-and-instantiation.md)
- [../next/2026-04-05-runtime-docs-followups.md](../next/2026-04-05-runtime-docs-followups.md)
- [./logix-api-next-guardrails.md](./logix-api-next-guardrails.md)

## 当前一句话结论

这些命名问题都已经降级为“有稳定当前口径，但仍可后置重开”的少量条目；已退出当前舞台的旧对象不再停留在 naming bucket。
