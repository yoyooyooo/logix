---
title: Form Field Kernel Boundary
status: living
version: 17
---

# Form Field Kernel Boundary

## 当前页面角色

- 本页只负责 form 与 field-kernel 的边界
- Form 当前现状、真缺口与 owner split 统一看 [../form/README.md](../form/README.md)
- 若未来 form 子树继续扩展，本页仍只承接 cross-layer boundary，不回到“单页承接全部 form 事实”

## 当前总判断

Form 的 boundary 当前只固定三件事：

- 上层保留 form domain DSL
- 下层共享 compile-time `field-kernel`
- package / public surface 继续收敛到 root namespace 与 core-owned React host law

## package boundary

当前 package-level 作者面分层固定为：

- 顶层 canonical authoring：`Form.make(id, config, ($) => { ... })`
- root exact helper 固定为：`Form.make`、`Form.Rule`、`Form.Error`
- `Form.Path / Form.SchemaPathMapping / Form.SchemaErrorMapping` 已退出 root public surface；若仍存在，只按 direct-owner support 或 residue 理解
- React exact host law 继续停留在 [./10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)

若 `@logixjs/form/react` 仍有 convenience sugar，它只算 residue / alias layer，不构成 canonical host truth。

root 不再承接 `Form.commands` bridge noun；若未来确有 surviving consumer，需要单独以 packaging exception reopen。

收口约束：

- package root 不再导出 legacy raw field helper 家族
- package root 不再导出 `Form.rules / Form.node / Form.list / Form.Field`
- package root 不再接受任何 raw field fragment 或 expert field route
- Form 的公开组合默认只围绕 returned `FormProgram` 与 imports-driven composition 展开；`FormProgram` 继续只作为 core `Program` 的领域 refinement 理解
- `form.logic / withLogic` 不属于 Form core public contract

## public surface budget

公开面预算的唯一规范口径继续看 [../form/05-public-api-families.md](../form/05-public-api-families.md)。

本页只承认：

- root manifestation
- runtime authority 本身
- core-owned React host law

## lowering boundary

field-kernel 继续只承接：

- compile-time graph / plan
- ownership / remap
- task / stale
- reasons / evidence canonicality

implementation-first 收口后，再固定一层：

- source scheduling 继续停在 field-kernel internal substrate 与 Form install bridge
- companion lowering 继续停在 form declaration owner 与 field-kernel converge writer 之间；当前只承认 owner-local internal companion lane，不冻结 exact landing path
- submit blocking / compare feed 的 reason authority 继续停在 `$form.submitAttempt`
- list-root cleanup receipt 继续停在 `ui.$cleanup.<listPath>`
- trial artifact 可以导出 source / companion / cleanup 的 ownership map，但它只作为验证材料，不形成第二 truth

Form 未来内部静态合同继续按下面规则收口：

- `FormDeclarationContract` 是唯一 declaration authority
- `activeShapeSlice / settlementSlice / reasonProjectionSlice` 只作为它的内部 slices 存在
- `RulesManifest` 后续只能二选一：
  - declaration slice 的 canonical payload
  - cutover residue
- core `StaticIr` 继续只做底层 reflection / expert 投影，不占 Form declaration owner
- runtime-owned `ScenarioPlan` 不进入 Form IR family

当前 companion path-scope 约束：

- source 与 companion 必须共享同一套 canonical path normalization 入口
- source row scope 继续使用 row-local deps，因为它为单 row resource key 服务
- companion row scope 允许 whole-root 聚合 deps，因为它为 field-local soft fact bundle 服务
- nested list companion 必须从同一 value pattern 枚举 concrete row path，不能让 Form lowering 与 core converge 各自解释 list scope

当前 companion hot-path 约束：

- companion lower 在 transaction converge 窗口内运行
- lower 必须保持同步轻量
- candidates 大集合、异步过滤、远程搜索不得进入 companion lower
- 若 future proof 需要重候选集，先重开 carrier / scheduling / source owner，不在当前 eager state writeback 上叠加

具体 semantic owner 继续看 [../form/03-kernel-form-host-split.md](../form/03-kernel-form-host-split.md)。

## Form 作者面

当前推荐把 Form 顶层入口收敛为：

- `Form.make(id, config, ($) => { ... })`

方向是：

- schema-scoped 的校验、联动、source wiring、list identity 都直接归入 `Form.make(..., config, ($) => { ... })`
- `rules / field / root / list / dsl / submit` 都只属于同一个 `define(form)` act；`field(path).companion(...)` 继续与 `field(path).source(...)` 停在同一 declaration owner 内
- `Form.make` 若保留，继续只作为 core `Program.make(...)` 装配律的领域 specialization 理解
- 位置参数 declaration slot 只保留 Form 领域 DSL，不再接受 raw field / derived slot
- form declaration surface 不再占用 `logic` noun，也不再保留 config-key declaration carrier
- 不再为过渡保留 `rules / derived / raw field helper` 平行入口
- 若 Form DSL 表达力不够，默认扩 DSL，不回退到公开 raw field route
- `Form.from(...).logic`、`config.logic` 若仍存在，只能视为 internal lowering residue 或迁移材料

## 读法

- 日常作者优先停在 `Form.make(..., config, ($) => { ... })`
- 复用与组合优先停在 returned `FormProgram`
- field-kernel 只作为内部 lowering 层存在，不要求用户直接理解它
- 若未来还出现“要不要开放 raw field route”的讨论，默认回答是继续扩 Form DSL，不新开逃生口

## 来源裁决

- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)
- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../adr/2026-04-12-field-kernel-declaration-cutover.md](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [../form/README.md](../form/README.md)
- [../form/00-north-star.md](../form/00-north-star.md)
- [../form/01-current-capability-map.md](../form/01-current-capability-map.md)
- [../form/02-gap-map-and-target-direction.md](../form/02-gap-map-and-target-direction.md)
- [../form/03-kernel-form-host-split.md](../form/03-kernel-form-host-split.md)
- [../form/04-convergence-direction.md](../form/04-convergence-direction.md)
- [./03-canonical-authoring.md](./03-canonical-authoring.md)
- [./07-standardized-scenario-patterns.md](./07-standardized-scenario-patterns.md)
- [./08-domain-packages.md](./08-domain-packages.md)
- [../../standards/logix-api-next-postponed-naming-items.md](../../standards/logix-api-next-postponed-naming-items.md)

## 当前一句话结论

Form 不再围绕 `derived + rules + raw field helper` 多套顶层入口组织；canonical path 收敛到 `Form.make(..., config, ($) => { ... })` 这条领域 act，`field(path).companion(...)` 继续停在同一 declaration owner 内，内部静态合同继续收口到单一 `FormDeclarationContract`，React host law 继续由 core 持有，field-kernel 只保留为内部 lowering 层。
