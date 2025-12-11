---
title: Open Questions and Migration (v3)
status: definitive.v3
version: 3.0.0
related:
  - 01-capability-plugin-blueprint.md
---

# Open Questions and Migration (v3)

> **Status: Resolved**
>
> 随着 Capability Plugin System v3 (Bound Helper Pattern) 的确立，之前关于插件架构的大部分开放问题已得到解决。

## 1. Resolved Questions

### Q: 如何解决 `$` 类型膨胀问题？

**Answer**: 彻底不再扩展 `$`。使用 `Helper($, ...)` 模式，类型通过函数泛型按需推导。 `$` 仅作为 Context 载体。

### Q: 插件与 Core 的耦合度？

**Answer**: **Zero Coupling**. Core 仅定义 `BoundApi` 接口与 `CapabilityMeta` 协议 symbol。插件作为独立 npm 包，依赖 Core 的类型定义，反之 Core 不依赖插件。

### Q: 配置如何分形？

**Answer**: 使用 Effect Layer。Runtime fork 时通过 `provide` 机制覆盖 Env 中的 Config Tag。

### Q: Schema 定义中的递归类型？

**Answer**: 采用 **Two-Pass Definition** 作为官方推荐范式。先定义 DTO (Schema)，再定义 State (Capabilities)，切断类型循环。

## 2. Migration Path

### For Existing Drafts

- 所有提及 `$.extension`、`runtime.plugins` 注册表或 `Runtime.make({ plugins })` 的草稿，应视为 **过时 (Obsolete)**。
- 引用插件能力时，统一改为 `yield* Plugin.helper($, ...)` 写法；能力安装统一通过 Layer 合成。

### For Codebase

- `@logix/core` 保持纯净，不包含任何 plugin loader 逻辑。
- 新增/重构 `@logix/query` 等子包，遵循 v3 Helper 协议实现。

## 3. Pending Items (v3.x)

- [ ] **Standardize CapabilityMeta**: 在 `packages/logix-core` 中正式导出 `CapabilityMeta` symbol。
- [ ] **Implement Module.live Compiler**: 在运行时中实现对 `CapabilityMeta` 的扫描与 factory 调用。
- [ ] **Documentation**: 更新 `apps/docs`，编写面向用户的 "Creating a Plugin" 指南。
